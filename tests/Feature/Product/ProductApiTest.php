<?php

namespace Tests\Feature\Product;

use App\Models\Category;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProductApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'sku' => 'bev-001',
            'name' => 'Mineral Water 1.5L',
            'description' => '',
            'category_id' => Category::factory()->create()->id,
            'supplier_id' => Supplier::factory()->create()->id,
            'cost_price' => '18.00',
            'sale_price' => '25.00',
            'reorder_level' => 24,
            'is_active' => true,
            'opening_stock' => 120,
            ...$overrides,
        ];
    }

    public function test_admin_can_open_product_pages(): void
    {
        $product = Product::factory()->create();
        $this->actingAs(User::factory()->withRole('admin')->create());

        $this->get('/admin/products')->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/products/index/page'));
        $this->get('/admin/products/create')->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/products/create/page'));
        $this->get("/admin/products/{$product->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/products/show/page')->where('productId', $product->id));
        $this->get("/admin/products/{$product->id}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/products/edit/page')->where('productId', $product->id));
    }

    public function test_creating_a_product_records_its_opening_stock(): void
    {
        $admin = User::factory()->withRole('admin')->create();
        $this->actingAs($admin);

        $id = $this->postJson('/v1/admin/products', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.sku', 'BEV-001')
            ->assertJsonPath('data.stock_on_hand', 120)
            ->json('data.id');

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $id,
            'user_id' => $admin->id,
            'type' => 'opening',
            'quantity' => 120,
            'balance_after' => 120,
        ]);
    }

    public function test_product_without_opening_stock_has_no_ledger_entry(): void
    {
        $this->actingAs(User::factory()->withRole('admin')->create());

        $id = $this->postJson('/v1/admin/products', $this->payload(['opening_stock' => 0, 'supplier_id' => null]))
            ->assertCreated()
            ->assertJsonPath('data.supplier', null)
            ->json('data.id');

        $this->assertDatabaseMissing('stock_movements', ['product_id' => $id]);
    }

    public function test_input_is_validated(): void
    {
        Product::factory()->create(['sku' => 'BEV-001']);
        $this->actingAs(User::factory()->withRole('admin')->create());

        $this->postJson('/v1/admin/products', $this->payload([
            'sku' => 'bev-001',
            'name' => '',
            'category_id' => 999,
            'cost_price' => '-1',
            'sale_price' => '1.234',
            'opening_stock' => -5,
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sku', 'name', 'category_id', 'cost_price', 'sale_price', 'opening_stock']);
    }

    public function test_update_does_not_touch_stock(): void
    {
        $product = Product::factory()->withStock(40)->create();
        $this->actingAs(User::factory()->withRole('admin')->create());

        $this->putJson("/v1/admin/products/{$product->id}", [
            ...$this->payload(['sku' => $product->sku, 'name' => 'Renamed', 'is_active' => false]),
            'stock_on_hand' => 9999,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Renamed')
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.stock_on_hand', 40);
    }

    public function test_list_can_be_searched_and_filtered(): void
    {
        $drinks = Category::factory()->create();
        Product::factory()->create(['name' => 'Mango Juice', 'sku' => 'BEV-002', 'category_id' => $drinks->id]);
        Product::factory()->withStock(2)->create(['name' => 'Dish Soap', 'reorder_level' => 10]);
        Product::factory()->withStock(50)->create(['name' => 'Old Pen', 'is_active' => false, 'reorder_level' => 5]);
        $this->actingAs(User::factory()->withRole('staff')->create());

        $this->getJson('/v1/admin/products?search=bev-002')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Mango Juice');
        $this->getJson("/v1/admin/products?category={$drinks->id}")->assertJsonCount(1, 'data');
        $this->getJson('/v1/admin/products?status=inactive')->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Old Pen');
        $this->getJson('/v1/admin/products?stock=low')->assertJsonCount(2, 'data');
        $this->getJson('/v1/admin/products?stock=out')->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Mango Juice');
        $this->getJson('/v1/admin/products')->assertJsonPath('meta.total', 3);
    }

    public function test_options_list_categories_and_suppliers(): void
    {
        Category::factory()->create(['name' => 'Snacks']);
        Supplier::factory()->create(['name' => 'Prime Wholesale', 'lead_time_days' => 5]);
        $this->actingAs(User::factory()->withRole('staff')->create());

        $this->getJson('/v1/admin/products/options')
            ->assertOk()
            ->assertJsonPath('data.categories.0.name', 'Snacks')
            ->assertJsonPath('data.suppliers.0.lead_time_days', 5);
    }

    public function test_staff_can_view_but_not_change_products(): void
    {
        $product = Product::factory()->create();
        $this->actingAs(User::factory()->withRole('staff')->create());

        $this->getJson("/v1/admin/products/{$product->id}")->assertOk()->assertJsonPath('data.on_order', 0);
        $this->get('/admin/products/create')->assertForbidden();
        $this->postJson('/v1/admin/products', $this->payload())->assertForbidden();
        $this->putJson("/v1/admin/products/{$product->id}", $this->payload())->assertForbidden();
        $this->deleteJson("/v1/admin/products/{$product->id}")->assertForbidden();
        $this->postJson("/v1/admin/products/{$product->id}/adjustments", ['quantity' => 1, 'note' => 'Found'])->assertForbidden();
    }

    public function test_stock_can_be_adjusted_up_and_down(): void
    {
        $product = Product::factory()->withStock(10)->create();
        $admin = User::factory()->withRole('admin')->create();
        $this->actingAs($admin);

        $this->postJson("/v1/admin/products/{$product->id}/adjustments", ['quantity' => -3, 'note' => 'Broken in storage'])
            ->assertCreated()
            ->assertJsonPath('data.type', 'adjustment')
            ->assertJsonPath('data.balance_after', 7)
            ->assertJsonPath('data.user.name', $admin->name);

        $this->postJson("/v1/admin/products/{$product->id}/adjustments", ['quantity' => 5, 'note' => 'Customer return'])
            ->assertJsonPath('data.balance_after', 12);

        $this->assertSame(12, $product->fresh()->stock_on_hand);

        $this->getJson("/v1/admin/products/{$product->id}/movements")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.quantity', 5)
            ->assertJsonPath('data.1.note', 'Broken in storage');
    }

    public function test_stock_cannot_go_below_zero(): void
    {
        $product = Product::factory()->withStock(2)->create();
        $this->actingAs(User::factory()->withRole('admin')->create());

        $this->postJson("/v1/admin/products/{$product->id}/adjustments", ['quantity' => -5, 'note' => 'Count correction'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('quantity');

        $this->postJson("/v1/admin/products/{$product->id}/adjustments", ['quantity' => 0, 'note' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity', 'note']);

        $this->assertSame(2, $product->fresh()->stock_on_hand);
        $this->assertDatabaseMissing('stock_movements', ['product_id' => $product->id]);
    }

    public function test_product_without_history_can_be_deleted_with_its_ledger(): void
    {
        $this->actingAs(User::factory()->withRole('admin')->create());
        $id = $this->postJson('/v1/admin/products', $this->payload())->json('data.id');

        $this->deleteJson("/v1/admin/products/{$id}")->assertOk();

        $this->assertDatabaseMissing('products', ['id' => $id]);
        $this->assertDatabaseMissing('stock_movements', ['product_id' => $id]);
    }

    public function test_product_with_sales_or_orders_cannot_be_deleted(): void
    {
        $admin = User::factory()->withRole('admin')->create();
        $sold = Product::factory()->withStock(5)->create();
        $ordered = Product::factory()->create();
        Sale::create(['user_id' => $admin->id, 'total' => 25, 'sold_at' => now()])
            ->items()->create(['product_id' => $sold->id, 'quantity' => 1, 'unit_price' => 25, 'line_total' => 25]);
        PurchaseOrder::create(['supplier_id' => $ordered->supplier_id, 'created_by' => $admin->id, 'total' => 0])
            ->items()->create(['product_id' => $ordered->id, 'quantity' => 10, 'unit_cost' => 18, 'line_total' => 180]);
        $this->actingAs($admin);

        $this->deleteJson("/v1/admin/products/{$sold->id}")->assertUnprocessable()->assertJsonValidationErrors('product');
        $this->deleteJson("/v1/admin/products/{$ordered->id}")->assertUnprocessable()->assertJsonValidationErrors('product');
    }

    public function test_on_order_counts_only_placed_purchase_orders(): void
    {
        $admin = User::factory()->withRole('admin')->create();
        $product = Product::factory()->create();
        PurchaseOrder::create(['supplier_id' => $product->supplier_id, 'created_by' => $admin->id, 'total' => 0, 'status' => 'ordered'])
            ->items()->create(['product_id' => $product->id, 'quantity' => 30, 'unit_cost' => 18, 'line_total' => 540]);
        PurchaseOrder::create(['supplier_id' => $product->supplier_id, 'created_by' => $admin->id, 'total' => 0])
            ->items()->create(['product_id' => $product->id, 'quantity' => 99, 'unit_cost' => 18, 'line_total' => 1782]);
        $this->actingAs($admin);

        $this->getJson("/v1/admin/products/{$product->id}")->assertJsonPath('data.on_order', 30);
    }
}
