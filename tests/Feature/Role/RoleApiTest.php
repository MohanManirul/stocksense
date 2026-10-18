<?php

namespace Tests\Feature\Role;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_do_everything(): void
    {
        $this->actingAs(User::factory()->withRole(UserRole::SuperAdmin)->create());

        $this->get('/admin/roles')->assertOk();
        $this->getJson('/v1/admin/users')->assertOk();
        $this->postJson('/v1/admin/categories', ['name' => 'Snacks'])->assertCreated();
    }

    public function test_permission_groups_follow_the_config(): void
    {
        $this->actingAs(User::factory()->withRole(UserRole::Admin)->create());

        $this->getJson('/v1/admin/roles/permission-groups')
            ->assertOk()
            ->assertJsonPath('data.0.module', 'categories')
            ->assertJsonPath('data.0.permissions', ['view categories', 'create categories', 'edit categories', 'delete categories']);
    }

    public function test_admin_can_create_update_and_delete_a_role(): void
    {
        $this->actingAs(User::factory()->withRole(UserRole::Admin)->create());

        $id = $this->postJson('/v1/admin/roles', [
            'name' => 'store-manager',
            'permissions' => ['view categories', 'create categories'],
        ])
            ->assertCreated()
            ->assertJsonPath('data.permissions', ['view categories', 'create categories'])
            ->json('data.id');

        $this->putJson("/v1/admin/roles/{$id}", ['name' => 'store-lead', 'permissions' => ['view suppliers']])
            ->assertOk()
            ->assertJsonPath('data.name', 'store-lead')
            ->assertJsonPath('data.permissions', ['view suppliers']);

        $this->deleteJson("/v1/admin/roles/{$id}")->assertOk();
        $this->assertDatabaseMissing('roles', ['id' => $id]);
    }

    public function test_new_permissions_take_effect_for_the_user(): void
    {
        $role = Role::create(['name' => 'catalog-clerk', 'guard_name' => 'web']);
        $role->givePermissionTo('view categories', 'create categories');
        $clerk = User::factory()->create();
        $clerk->assignRole($role);
        $this->actingAs($clerk);

        $this->postJson('/v1/admin/categories', ['name' => 'Snacks'])->assertCreated();
        $this->getJson('/v1/admin/suppliers')->assertForbidden();
    }

    public function test_role_input_is_validated(): void
    {
        $this->actingAs(User::factory()->withRole(UserRole::Admin)->create());

        $this->postJson('/v1/admin/roles', ['name' => 'Store Manager', 'permissions' => ['fly to the moon']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'permissions.0']);

        $this->postJson('/v1/admin/roles', ['name' => 'staff'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_super_admin_role_is_protected(): void
    {
        $superAdmin = Role::findByName(UserRole::SuperAdmin->value, 'web');
        $this->actingAs(User::factory()->withRole(UserRole::Admin)->create());

        $this->get("/admin/roles/{$superAdmin->id}/edit")->assertForbidden();
        $this->putJson("/v1/admin/roles/{$superAdmin->id}", ['name' => 'super-admin', 'permissions' => []])->assertForbidden();
        $this->deleteJson("/v1/admin/roles/{$superAdmin->id}")->assertForbidden();
    }

    public function test_role_with_users_cannot_be_deleted(): void
    {
        User::factory()->withRole(UserRole::Staff)->create();
        $staff = Role::findByName(UserRole::Staff->value, 'web');
        $this->actingAs(User::factory()->withRole(UserRole::Admin)->create());

        $this->deleteJson("/v1/admin/roles/{$staff->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');
    }

    public function test_staff_cannot_manage_roles(): void
    {
        $this->actingAs(User::factory()->withRole(UserRole::Staff)->create());

        $this->get('/admin/roles')->assertForbidden();
        $this->getJson('/v1/admin/roles')->assertForbidden();
    }
}
