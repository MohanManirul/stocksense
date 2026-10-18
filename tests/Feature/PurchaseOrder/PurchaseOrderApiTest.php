<?php

namespace Tests\Feature\PurchaseOrder;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PurchaseOrderApiTest extends TestCase
{
    use RefreshDatabase;

    private Supplier $supplier;

    private Product $water;

    private Product $juice;

    protected function setUp(): void
    {
        parent::setUp();

        $this->supplier = Supplier::factory()->create(['name' => 'FreshFlow', 'lead_time_days' => 3]);
        $this->water = Product::factory()->withStock(10)->create(['supplier_id' => $this->supplier->id, 'cost_price' => '18.00']);
        $this->juice = Product::factory()->withStock(2)->create(['supplier_id' => $this->supplier->id, 'cost_price' => '95.50']);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'supplier_id' => $this->supplier->id,
            'expected_at' => null,
            'notes' => 'Weekly restock',
            'items' => [
                ['product_id' => $this->water->id, 'quantity' => 48, 'unit_cost' => '17.50'],
                ['product_id' => $this->juice->id, 'quantity' => 12, 'unit_cost' => '95.50'],
            ],
            ...$overrides,
        ];
    }

    private function draft(): int
    {
        return $this->postJson('/v1/admin/purchase-orders', $this->payload())->assertCreated()->json('data.id');
    }

    private function admin(): User
    {
        $admin = User::factory()->withRole('admin')->create();
        $this->actingAs($admin);

        return $admin;
    }

    public function test_admin_can_open_purchase_order_pages(): void
    {
        $this->admin();
        $id = $this->draft();

        $this->get('/admin/purchase-orders')->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/purchase-orders/index/page'));
        $this->get('/admin/purchase-orders/create')->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/purchase-orders/create/page'));
        $this->get("/admin/purchase-orders/{$id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/purchase-orders/show/page')->where('purchaseOrderId', $id));
        $this->get("/admin/purchase-orders/{$id}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/purchase-orders/edit/page')->where('purchaseOrderId', $id));
    }

    public function test_edit_page_of_a_placed_order_redirects_to_its_details(): void
    {
        $this->admin();
        $id = $this->draft();
        $this->postJson("/v1/admin/purchase-orders/{$id}/place")->assertOk();

        $this->get("/admin/purchase-orders/{$id}/edit")->assertRedirect("/admin/purchase-orders/{$id}");
    }

    public function test_new_order_is_saved_as_a_draft_without_touching_stock(): void
    {
        $admin = $this->admin();

        $this->postJson('/v1/admin/purchase-orders', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.total', '1986.00')
            ->assertJsonPath('data.creator.id', $admin->id)
            ->assertJsonPath('data.items.0.line_total', '840.00')
            ->assertJsonCount(2, 'data.items');

        $this->assertSame(10, $this->water->fresh()->stock_on_hand);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_input_is_validated(): void
    {
        $this->admin();
        $otherSuppliers = Product::factory()->create();
        $inactive = Product::factory()->create(['supplier_id' => $this->supplier->id, 'is_active' => false]);

        $this->postJson('/v1/admin/purchase-orders', $this->payload(['items' => []]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items' => 'Add at least one product to the order.']);

        $this->postJson('/v1/admin/purchase-orders', $this->payload([
            'expected_at' => 'next week',
            'items' => [
                ['product_id' => $this->water->id, 'quantity' => 1, 'unit_cost' => '1.234'],
                ['product_id' => $this->water->id, 'quantity' => 0, 'unit_cost' => '-1'],
                ['product_id' => $otherSuppliers->id, 'quantity' => 1, 'unit_cost' => '10'],
                ['product_id' => $inactive->id, 'quantity' => 1, 'unit_cost' => '10'],
            ],
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'expected_at',
                'items.0.unit_cost',
                'items.1.product_id',
                'items.1.quantity',
                'items.1.unit_cost',
                'items.2.product_id',
                'items.3.product_id',
            ]);

        $this->assertDatabaseCount('purchase_orders', 0);
    }

    public function test_draft_can_be_edited_and_its_items_replaced(): void
    {
        $this->admin();
        $id = $this->draft();

        $this->putJson("/v1/admin/purchase-orders/{$id}", $this->payload([
            'expected_at' => '2026-11-01',
            'items' => [['product_id' => $this->juice->id, 'quantity' => 5, 'unit_cost' => '90']],
        ]))
            ->assertOk()
            ->assertJsonPath('data.expected_at', '2026-11-01')
            ->assertJsonPath('data.total', '450.00')
            ->assertJsonCount(1, 'data.items');

        $this->assertDatabaseCount('purchase_order_items', 1);
    }

    public function test_placing_an_order_counts_it_as_on_order(): void
    {
        $this->admin();
        $id = $this->draft();

        $this->postJson("/v1/admin/purchase-orders/{$id}/place")
            ->assertOk()
            ->assertJsonPath('data.status', 'ordered')
            ->assertJsonPath('data.expected_at', now()->addDays(3)->toDateString());

        $this->assertNotNull(PurchaseOrder::find($id)->ordered_at);
        $this->getJson("/v1/admin/products/{$this->water->id}")->assertJsonPath('data.on_order', 48);

        $this->putJson("/v1/admin/purchase-orders/{$id}", $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'Only draft orders can be edited.']);
        $this->postJson("/v1/admin/purchase-orders/{$id}/place")->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->deleteJson("/v1/admin/purchase-orders/{$id}")->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_receiving_an_order_adds_it_to_stock_once(): void
    {
        $admin = $this->admin();
        $id = $this->draft();

        $this->postJson("/v1/admin/purchase-orders/{$id}/receive")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status' => 'Only placed orders can be received.']);

        $this->postJson("/v1/admin/purchase-orders/{$id}/place")->assertOk();
        $this->postJson("/v1/admin/purchase-orders/{$id}/receive")
            ->assertOk()
            ->assertJsonPath('data.status', 'received')
            ->assertJsonPath('data.receiver.id', $admin->id);

        $this->assertSame(58, $this->water->fresh()->stock_on_hand);
        $this->assertSame(14, $this->juice->fresh()->stock_on_hand);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $this->water->id,
            'user_id' => $admin->id,
            'type' => 'purchase',
            'quantity' => 48,
            'balance_after' => 58,
            'reference_type' => (new PurchaseOrder)->getMorphClass(),
            'reference_id' => $id,
        ]);
        $this->getJson("/v1/admin/products/{$this->water->id}")->assertJsonPath('data.on_order', 0);

        $this->postJson("/v1/admin/purchase-orders/{$id}/receive")->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->postJson("/v1/admin/purchase-orders/{$id}/cancel")->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->assertSame(58, $this->water->fresh()->stock_on_hand);
        $this->assertDatabaseCount('stock_movements', 2);
    }

    public function test_placed_order_can_be_cancelled_without_changing_stock(): void
    {
        $this->admin();
        $id = $this->draft();

        $this->postJson("/v1/admin/purchase-orders/{$id}/cancel")->assertUnprocessable()->assertJsonValidationErrors('status');

        $this->postJson("/v1/admin/purchase-orders/{$id}/place")->assertOk();
        $this->postJson("/v1/admin/purchase-orders/{$id}/cancel")->assertOk()->assertJsonPath('data.status', 'cancelled');

        $this->assertNotNull(PurchaseOrder::find($id)->cancelled_at);
        $this->assertSame(10, $this->water->fresh()->stock_on_hand);
        $this->postJson("/v1/admin/purchase-orders/{$id}/receive")->assertUnprocessable();
    }

    public function test_draft_can_be_deleted_with_its_items(): void
    {
        $this->admin();
        $id = $this->draft();

        $this->deleteJson("/v1/admin/purchase-orders/{$id}")->assertOk();

        $this->assertDatabaseMissing('purchase_orders', ['id' => $id]);
        $this->assertDatabaseCount('purchase_order_items', 0);
    }

    public function test_list_can_be_searched_and_filtered(): void
    {
        $this->admin();
        $first = $this->draft();
        $second = $this->draft();
        $this->postJson("/v1/admin/purchase-orders/{$second}/place")->assertOk();
        $other = Product::factory()->create();
        $this->postJson('/v1/admin/purchase-orders', [
            'supplier_id' => $other->supplier_id,
            'items' => [['product_id' => $other->id, 'quantity' => 1, 'unit_cost' => '10']],
        ])->assertCreated();

        $this->getJson('/v1/admin/purchase-orders')->assertOk()->assertJsonPath('meta.total', 3)->assertJsonPath('data.2.id', $first);
        $this->getJson('/v1/admin/purchase-orders?status=ordered')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $second);
        $this->getJson("/v1/admin/purchase-orders?supplier={$this->supplier->id}")->assertJsonCount(2, 'data');
        $this->getJson('/v1/admin/purchase-orders?search=freshflow')->assertJsonCount(2, 'data');
        $this->getJson('/v1/admin/purchase-orders?search=PO-'.str_pad((string) $first, 5, '0', STR_PAD_LEFT))
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.items_count', 2);
        $this->getJson('/v1/admin/purchase-orders?status=lost')->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_options_group_active_products_by_supplier(): void
    {
        $this->admin();
        Product::factory()->create(['supplier_id' => null]);

        $this->getJson('/v1/admin/purchase-orders/options')
            ->assertOk()
            ->assertJsonPath('data.suppliers.0.lead_time_days', 3)
            ->assertJsonCount(2, 'data.products');
    }

    public function test_permissions_are_enforced_per_action(): void
    {
        $this->admin();
        $id = $this->draft();
        $this->postJson("/v1/admin/purchase-orders/{$id}/place")->assertOk();

        Role::findOrCreate('buyer', 'web')->syncPermissions(['view purchase orders', 'create purchase orders']);
        $this->actingAs(User::factory()->withRole('buyer')->create());

        $this->getJson("/v1/admin/purchase-orders/{$id}")->assertOk();
        $this->postJson('/v1/admin/purchase-orders', $this->payload())->assertCreated();
        $this->postJson("/v1/admin/purchase-orders/{$id}/receive")->assertForbidden();
        $this->postJson("/v1/admin/purchase-orders/{$id}/cancel")->assertForbidden();

        $this->actingAs(User::factory()->withRole('staff')->create());

        $this->get('/admin/purchase-orders')->assertForbidden();
        $this->getJson('/v1/admin/purchase-orders')->assertForbidden();
        $this->assertSame(10, $this->water->fresh()->stock_on_hand);
    }
}
