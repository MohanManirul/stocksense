<?php

namespace Tests\Feature\Auth;

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

    public function test_login_page_lists_every_user_without_their_password(): void
    {
        config(['app.demo' => true]);
        User::factory()->withRole('super-admin')->create(['email' => 'admin@stocksense.test']);
        $rina = User::factory()->withRole('staff')->create(['name' => 'Rina Akter', 'email' => 'rina@stocksense.test']);

        $this->get('/admin/login')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('demo', 2)
                ->where('demo.0.email', 'admin@stocksense.test')
                ->has('demo.1', fn (Assert $account) => $account
                    ->where('id', $rina->id)
                    ->where('name', 'Rina Akter')
                    ->where('role', 'staff')
                    ->where('email', 'rina@stocksense.test')));
    }

    public function test_demo_login_signs_in_as_the_chosen_user(): void
    {
        config(['app.demo' => true]);
        $rina = User::factory()->withRole('staff')->create();

        $this->post("/admin/demo-login/{$rina->id}")->assertRedirect('/admin/dashboard');

        $this->assertAuthenticatedAs($rina, 'web');
    }

    public function test_demo_login_is_closed_outside_demo_mode(): void
    {
        config(['app.demo' => false]);
        $rina = User::factory()->withRole('staff')->create();

        $this->post("/admin/demo-login/{$rina->id}")->assertNotFound();

        $this->assertGuest('web');
    }

    public function test_login_page_hides_accounts_outside_demo_mode(): void
    {
        config(['app.demo' => false]);
        User::factory()->create();

        $this->get('/admin/login')->assertInertia(fn (Assert $page) => $page->where('demo', null));
    }

    public function test_user_can_log_in_with_valid_credentials(): void
    {
        $user = User::factory()->withRole('admin')->create();

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
