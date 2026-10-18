<?php

namespace Tests\Feature\Category;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CategoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_categories_page_renders(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/admin/categories')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/categories/page'));
    }

    public function test_guest_cannot_use_the_api(): void
    {
        $this->getJson('/v1/admin/categories')->assertUnauthorized();
    }

    public function test_owner_can_manage_categories(): void
    {
        $this->actingAs(User::factory()->owner()->create());

        $id = $this->postJson('/v1/admin/categories', ['name' => 'Snacks'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Snacks')
            ->json('data.id');

        $this->putJson("/v1/admin/categories/{$id}", ['name' => 'Crisps'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Crisps');

        $this->getJson('/v1/admin/categories')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Crisps')
            ->assertJsonPath('data.0.products_count', 0);

        $this->deleteJson("/v1/admin/categories/{$id}")->assertOk();

        $this->assertDatabaseCount('categories', 0);
    }

    public function test_staff_can_list_but_not_change_categories(): void
    {
        $category = Category::factory()->create();
        $this->actingAs(User::factory()->create());

        $this->getJson('/v1/admin/categories')->assertOk();
        $this->postJson('/v1/admin/categories', ['name' => 'Snacks'])->assertForbidden();
        $this->putJson("/v1/admin/categories/{$category->id}", ['name' => 'Crisps'])->assertForbidden();
        $this->deleteJson("/v1/admin/categories/{$category->id}")->assertForbidden();
    }

    public function test_name_is_required_and_unique(): void
    {
        Category::factory()->create(['name' => 'Snacks']);
        $this->actingAs(User::factory()->owner()->create());

        $this->postJson('/v1/admin/categories', ['name' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');

        $this->postJson('/v1/admin/categories', ['name' => 'Snacks'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_category_with_products_cannot_be_deleted(): void
    {
        $category = Category::factory()->create();
        Product::create([
            'category_id' => $category->id,
            'sku' => 'BEV-001',
            'name' => 'Mineral Water 1.5L',
            'cost_price' => 20,
            'sale_price' => 30,
        ]);
        $this->actingAs(User::factory()->owner()->create());

        $this->deleteJson("/v1/admin/categories/{$category->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('category');

        $this->assertModelExists($category);
    }
}
