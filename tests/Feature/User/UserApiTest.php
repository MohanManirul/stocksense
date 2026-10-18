<?php

namespace Tests\Feature\User;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UserApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_open_user_pages(): void
    {
        $user = User::factory()->withRole('staff')->create();
        $this->actingAs(User::factory()->withRole('admin')->create());

        $this->get('/admin/users')->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/users/index/page'));
        $this->get('/admin/users/create')->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/users/create/page'));
        $this->get("/admin/users/{$user->id}/edit")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/users/edit/page')->where('userId', $user->id));
    }

    public function test_staff_cannot_manage_users(): void
    {
        $this->actingAs(User::factory()->withRole('staff')->create());

        $this->get('/admin/users')->assertForbidden();
        $this->getJson('/v1/admin/users')->assertForbidden();
        $this->postJson('/v1/admin/users', [])->assertForbidden();
    }

    public function test_admin_can_create_update_and_delete_a_user(): void
    {
        $this->actingAs(User::factory()->withRole('admin')->create());

        $id = $this->postJson('/v1/admin/users', [
            'name' => 'Rina Akter',
            'email' => 'rina@stocksense.test',
            'password' => 'secret-pass',
            'password_confirmation' => 'secret-pass',
            'role' => 'staff',
        ])
            ->assertCreated()
            ->assertJsonPath('data.role', 'staff')
            ->json('data.id');

        $this->assertTrue(User::find($id)->hasRole('staff'));

        $this->putJson("/v1/admin/users/{$id}", [
            'name' => 'Rina Akter',
            'email' => 'rina@stocksense.test',
            'password' => '',
            'password_confirmation' => '',
            'role' => 'admin',
        ])
            ->assertOk()
            ->assertJsonPath('data.role', 'admin');

        $this->assertTrue(User::find($id)->hasRole('admin'));
        $this->assertFalse(User::find($id)->hasRole('staff'));

        $this->deleteJson("/v1/admin/users/{$id}")->assertOk();
        $this->assertDatabaseMissing('users', ['id' => $id]);
    }

    public function test_user_created_by_super_admin_can_log_in_with_those_credentials(): void
    {
        $this->actingAs(User::factory()->withRole(UserRole::SuperAdmin)->create());

        $this->postJson('/v1/admin/users', [
            'name' => 'Rina Akter',
            'email' => 'rina@stocksense.test',
            'password' => 'secret-pass',
            'password_confirmation' => 'secret-pass',
            'role' => 'staff',
        ])->assertCreated();

        $this->post('/admin/logout');

        $this->post('/admin/login', ['email' => 'rina@stocksense.test', 'password' => 'secret-pass'])
            ->assertRedirect('/admin/dashboard');

        $this->assertAuthenticatedAs(User::firstWhere('email', 'rina@stocksense.test'), 'web');

        $this->app['auth']->forgetGuards();

        $this->get('/admin/categories')->assertOk();
        $this->get('/admin/users')->assertForbidden();
    }

    public function test_role_options_exclude_super_admin(): void
    {
        $this->actingAs(User::factory()->withRole('admin')->create());

        $this->getJson('/v1/admin/users/roles')
            ->assertOk()
            ->assertExactJson(['message' => 'Success', 'data' => ['admin', 'staff']]);
    }

    public function test_super_admin_role_cannot_be_assigned(): void
    {
        $this->actingAs(User::factory()->withRole('admin')->create());

        $this->postJson('/v1/admin/users', [
            'name' => 'Sneaky',
            'email' => 'sneaky@stocksense.test',
            'password' => 'secret-pass',
            'password_confirmation' => 'secret-pass',
            'role' => 'super-admin',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');
    }

    public function test_super_admin_account_is_protected(): void
    {
        $superAdmin = User::factory()->withRole(UserRole::SuperAdmin)->create();
        $this->actingAs(User::factory()->withRole('admin')->create());

        $this->deleteJson("/v1/admin/users/{$superAdmin->id}")->assertForbidden();
        $this->assertModelExists($superAdmin);
    }

    public function test_user_cannot_delete_themselves(): void
    {
        $admin = User::factory()->withRole('admin')->create();
        $this->actingAs($admin);

        $this->deleteJson("/v1/admin/users/{$admin->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('user');
    }
}
