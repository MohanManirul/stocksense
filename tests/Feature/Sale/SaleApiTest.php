<?php

namespace Tests\Feature\Sale;

use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SaleApiTest extends TestCase
{
    use RefreshDatabase;

    private function cashier(): User
    {
        Role::findOrCreate('cashier', 'web')->syncPermissions(['view sales', 'create sales']);

        return User::factory()->withRole('cashier')->create();
    }

    public function test_admin_can_open_sale_pages(): void
    {
        $admin = User::factory()->withRole('admin')->create();
        $sale = Sale::create(['user_id' => $admin->id, 'total' => 0, 'sold_at' => now()]);
        $this->actingAs($admin);

        $this->get('/admin/sales')->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/sales/index/page'));
        $this->get('/admin/sales/create')->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/sales/create/page'));
        $this->get("/admin/sales/{$sale->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/sales/show/page')->where('saleId', $sale->id));
    }

    public function test_recording_a_sale_takes_items_out_of_stock(): void
    {
        $water = Product::factory()->withStock(20)->create(['sale_price' => '25.00']);
        $chips = Product::factory()->withStock(5)->create(['sale_price' => '49.99']);
        $cashier = $this->cashier();
        $this->actingAs($cashier);

        $response = $this->postJson('/v1/admin/sales', [
            'customer_name' => 'Rahim',
            'items' => [
                ['product_id' => $water->id, 'quantity' => 3],
                ['product_id' => $chips->id, 'quantity' => 2],
            ],
        ])
            ->assertCreated()
            ->assertJsonPath('data.total', '174.98')
            ->assertJsonPath('data.customer_name', 'Rahim')
            ->assertJsonPath('data.user.id', $cashier->id)
            ->assertJsonCount(2, 'data.items')
            ->assertJsonPath('data.items.1.line_total', '99.98');

        $saleId = $response->json('data.id');

        $this->assertSame(17, $water->fresh()->stock_on_hand);
        $this->assertSame(3, $chips->fresh()->stock_on_hand);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $water->id,
            'user_id' => $cashier->id,
            'type' => 'sale',
            'quantity' => -3,
            'balance_after' => 17,
            'reference_type' => (new Sale)->getMorphClass(),
            'reference_id' => $saleId,
        ]);
    }

    public function test_price_comes_from_the_product_not_the_request(): void
    {
        $product = Product::factory()->withStock(10)->create(['sale_price' => '80.00']);
        $this->actingAs($this->cashier());

        $this->postJson('/v1/admin/sales', [
            'total' => 1,
            'items' => [['product_id' => $product->id, 'quantity' => 2, 'unit_price' => '0.50']],
        ])
            ->assertCreated()
            ->assertJsonPath('data.items.0.unit_price', '80.00')
            ->assertJsonPath('data.total', '160.00');
    }

    public function test_sale_is_rolled_back_when_any_line_has_too_little_stock(): void
    {
        $plenty = Product::factory()->withStock(50)->create();
        $scarce = Product::factory()->withStock(1)->create(['name' => 'Mango Juice']);
        $this->actingAs($this->cashier());

        $this->postJson('/v1/admin/sales', [
            'items' => [
                ['product_id' => $plenty->id, 'quantity' => 10],
                ['product_id' => $scarce->id, 'quantity' => 2],
            ],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items.1.quantity' => 'Not enough stock for Mango Juice: 1 available.']);

        $this->assertSame(50, $plenty->fresh()->stock_on_hand);
        $this->assertSame(1, $scarce->fresh()->stock_on_hand);
        $this->assertDatabaseCount('sales', 0);
        $this->assertDatabaseCount('sale_items', 0);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_input_is_validated(): void
    {
        $product = Product::factory()->withStock(10)->create();
        $inactive = Product::factory()->withStock(10)->create(['is_active' => false]);
        $this->actingAs($this->cashier());

        $this->postJson('/v1/admin/sales', ['items' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items' => 'Add at least one product to the sale.']);

        $this->postJson('/v1/admin/sales', [
            'customer_name' => str_repeat('a', 151),
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
                ['product_id' => $product->id, 'quantity' => 0],
                ['product_id' => $inactive->id, 'quantity' => 1],
                ['product_id' => 999, 'quantity' => 'two'],
            ],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['customer_name', 'items.1.product_id', 'items.1.quantity', 'items.2.product_id', 'items.3.product_id', 'items.3.quantity']);

        $this->assertSame(10, $product->fresh()->stock_on_hand);
    }

    public function test_list_can_be_searched_and_filtered_by_shop_date(): void
    {
        $user = $this->cashier();
        $rahim = Sale::create(['user_id' => $user->id, 'customer_name' => 'Rahim Uddin', 'total' => 100, 'sold_at' => '2026-10-10 10:00:00']);
        // 02:00 on 10 Oct in Dhaka (UTC+6), so it belongs to 10 Oct.
        Sale::create(['user_id' => $user->id, 'total' => 50, 'sold_at' => '2026-10-09 20:00:00']);
        // 23:00 on 9 Oct in Dhaka.
        Sale::create(['user_id' => $user->id, 'customer_name' => 'Karim', 'total' => 75, 'sold_at' => '2026-10-09 17:00:00']);
        $this->actingAs($user);

        $this->getJson('/v1/admin/sales')->assertOk()->assertJsonPath('meta.total', 3)->assertJsonPath('data.0.id', $rahim->id);
        $this->getJson('/v1/admin/sales?search=rahim')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $rahim->id);
        $this->getJson("/v1/admin/sales?search={$rahim->number}")->assertJsonCount(1, 'data')->assertJsonPath('data.0.customer_name', 'Rahim Uddin');
        $this->getJson('/v1/admin/sales?from=2026-10-10&to=2026-10-10')->assertJsonCount(2, 'data');
        $this->getJson('/v1/admin/sales?to=2026-10-09')->assertJsonCount(1, 'data')->assertJsonPath('data.0.customer_name', 'Karim');
        $this->getJson('/v1/admin/sales?from=2026-10-10&to=2026-10-01')->assertUnprocessable()->assertJsonValidationErrors('to');
    }

    public function test_sale_details_include_items_and_seller(): void
    {
        $product = Product::factory()->withStock(10)->create(['sale_price' => '30.00']);
        $cashier = $this->cashier();
        $this->actingAs($cashier);
        $id = $this->postJson('/v1/admin/sales', ['items' => [['product_id' => $product->id, 'quantity' => 4]]])->json('data.id');

        $this->getJson("/v1/admin/sales/{$id}")
            ->assertOk()
            ->assertJsonPath('data.number', 'S-'.str_pad((string) $id, 5, '0', STR_PAD_LEFT))
            ->assertJsonPath('data.user.name', $cashier->name)
            ->assertJsonPath('data.items.0.product.sku', $product->sku)
            ->assertJsonPath('data.items.0.quantity', 4);
    }

    public function test_options_list_only_active_products(): void
    {
        Product::factory()->withStock(3)->create(['name' => 'Active Soap']);
        Product::factory()->create(['name' => 'Old Pen', 'is_active' => false]);
        $this->actingAs($this->cashier());

        $this->getJson('/v1/admin/sales/options')
            ->assertOk()
            ->assertJsonCount(1, 'data.products')
            ->assertJsonPath('data.products.0.name', 'Active Soap')
            ->assertJsonPath('data.products.0.stock_on_hand', 3);
    }

    public function test_users_without_sales_permissions_are_forbidden(): void
    {
        $product = Product::factory()->withStock(10)->create();
        $this->actingAs(User::factory()->withRole('staff')->create());

        $this->get('/admin/sales')->assertForbidden();
        $this->getJson('/v1/admin/sales')->assertForbidden();
        $this->getJson('/v1/admin/sales/options')->assertForbidden();
        $this->postJson('/v1/admin/sales', ['items' => [['product_id' => $product->id, 'quantity' => 1]]])->assertForbidden();

        $this->assertSame(10, $product->fresh()->stock_on_hand);
    }

    public function test_guests_cannot_record_sales(): void
    {
        $this->postJson('/v1/admin/sales', ['items' => []])->assertUnauthorized();
    }
}
