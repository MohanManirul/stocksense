<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_admin_login(): void
    {
        $this->get('/admin/dashboard')->assertRedirect('/admin/login');
    }

    public function test_login_page_renders(): void
    {
        $this->get('/admin/login')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/login/page'));
    }

    public function test_user_can_log_in_with_valid_credentials(): void
    {
        $user = User::factory()->withRole(UserRole::Admin)->create();

        $this->post('/admin/login', ['email' => $user->email, 'password' => 'password'])
            ->assertRedirect('/admin/dashboard');

        $this->assertAuthenticatedAs($user);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $user = User::factory()->create();

        $this->from('/admin/login')
            ->post('/admin/login', ['email' => $user->email, 'password' => 'wrong-password'])
            ->assertRedirect('/admin/login')
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_user_can_log_out(): void
    {
        $this->actingAs(User::factory()->create())
            ->post('/admin/logout')
            ->assertRedirect('/admin/login');

        $this->assertGuest('web');
    }

    public function test_dashboard_api_requires_authentication(): void
    {
        $this->getJson('/v1/admin/dashboard')->assertUnauthorized();
    }

    public function test_dashboard_api_returns_summary(): void
    {
        $this->actingAs(User::factory()->create())
            ->getJson('/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.stats.active_products', 0)
            ->assertJsonStructure(['message', 'data' => ['stats', 'low_stock_products']]);
    }
}
