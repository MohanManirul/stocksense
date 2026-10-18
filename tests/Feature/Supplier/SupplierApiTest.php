<?php

namespace Tests\Feature\Supplier;

use App\Models\Category;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SupplierApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_open_supplier_pages(): void
    {
        $supplier = Supplier::factory()->create();
        $this->actingAs(User::factory()->withRole('admin')->create());

        $this->get('/admin/suppliers')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/suppliers/index/page'));

        $this->get('/admin/suppliers/create')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/suppliers/create/page'));

        $this->get("/admin/suppliers/{$supplier->id}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/suppliers/edit/page')->where('supplierId', $supplier->id));
    }

    public function test_staff_cannot_open_create_or_edit_pages(): void
    {
        $supplier = Supplier::factory()->create();
        $this->actingAs(User::factory()->withRole('staff')->create());

        $this->get('/admin/suppliers')->assertOk();
        $this->get('/admin/suppliers/create')->assertForbidden();
        $this->get("/admin/suppliers/{$supplier->id}/edit")->assertForbidden();
    }

    public function test_guest_cannot_use_the_api(): void
    {
        $this->getJson('/v1/admin/suppliers')->assertUnauthorized();
    }

    public function test_admin_can_manage_suppliers(): void
    {
        $this->actingAs(User::factory()->withRole('admin')->create());

        $id = $this->postJson('/v1/admin/suppliers', [
            'name' => 'FreshFlow Distributors',
            'contact_name' => 'Rahim Uddin',
            'email' => 'orders@freshflow.test',
            'phone' => '01711-000001',
            'lead_time_days' => 3,
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'FreshFlow Distributors')
            ->json('data.id');

        $this->getJson("/v1/admin/suppliers/{$id}")
            ->assertOk()
            ->assertJsonPath('data.lead_time_days', 3);

        $this->putJson("/v1/admin/suppliers/{$id}", ['name' => 'FreshFlow Ltd', 'contact_name' => '', 'email' => '', 'phone' => '', 'lead_time_days' => 4])
            ->assertOk()
            ->assertJsonPath('data.name', 'FreshFlow Ltd')
            ->assertJsonPath('data.contact_name', null);

        $this->deleteJson("/v1/admin/suppliers/{$id}")->assertOk();

        $this->assertDatabaseCount('suppliers', 0);
    }

    public function test_list_is_searchable_and_paginated(): void
    {
        Supplier::factory()->create(['name' => 'Prime Wholesale']);
        Supplier::factory()->count(20)->create();
        $this->actingAs(User::factory()->withRole('staff')->create());

        $this->getJson('/v1/admin/suppliers?search=prime')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Prime Wholesale');

        $this->getJson('/v1/admin/suppliers?per_page=15')
            ->assertOk()
            ->assertJsonCount(15, 'data')
            ->assertJsonPath('meta.total', 21)
            ->assertJsonPath('meta.last_page', 2);
    }

    public function test_staff_cannot_change_suppliers(): void
    {
        $supplier = Supplier::factory()->create();
        $this->actingAs(User::factory()->withRole('staff')->create());

        $this->postJson('/v1/admin/suppliers', ['name' => 'X', 'lead_time_days' => 3])->assertForbidden();
        $this->putJson("/v1/admin/suppliers/{$supplier->id}", ['name' => 'X', 'lead_time_days' => 3])->assertForbidden();
        $this->deleteJson("/v1/admin/suppliers/{$supplier->id}")->assertForbidden();
    }

    public function test_input_is_validated(): void
    {
        Supplier::factory()->create(['name' => 'Prime Wholesale']);
        $this->actingAs(User::factory()->withRole('admin')->create());

        $this->postJson('/v1/admin/suppliers', ['name' => 'Prime Wholesale', 'email' => 'not-an-email', 'lead_time_days' => 0])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'lead_time_days']);
    }

    public function test_supplier_with_products_or_purchase_orders_cannot_be_deleted(): void
    {
        $admin = User::factory()->withRole('admin')->create();
        $withProduct = Supplier::factory()->create();
        $withOrder = Supplier::factory()->create();
        Product::create([
            'category_id' => Category::factory()->create()->id,
            'supplier_id' => $withProduct->id,
            'sku' => 'BEV-001',
            'name' => 'Mineral Water 1.5L',
            'cost_price' => 20,
            'sale_price' => 30,
        ]);
        PurchaseOrder::forceCreate(['supplier_id' => $withOrder->id, 'created_by' => $admin->id, 'total' => 0]);
        $this->actingAs($admin);

        $this->deleteJson("/v1/admin/suppliers/{$withProduct->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('supplier');

        $this->deleteJson("/v1/admin/suppliers/{$withOrder->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('supplier');

        $this->assertDatabaseCount('suppliers', 2);
    }
}
