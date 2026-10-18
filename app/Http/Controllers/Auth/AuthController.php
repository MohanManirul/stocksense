<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Services\Auth\AuthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $authService,
    ) {}

    public function showLogin(): Response
    {
        return Inertia::render('admin/login/page', [
            'demo' => $this->authService->demoAccounts(),
        ]);
    }

    public function login(LoginRequest $request): RedirectResponse
    {
        $this->authService->attemptSession(
            $request->safe()->only('email', 'password'),
            $request->boolean('remember'),
        );

        $request->session()->regenerate();

        return redirect()->intended('/admin/dashboard');
    }

    public function demoLogin(Request $request, User $user): RedirectResponse
    {
        $this->authService->demoLogin($user);

        $request->session()->regenerate();

        return redirect()->intended('/admin/dashboard');
    }

    public function logout(Request $request): RedirectResponse
    {
        $this->authService->logoutSession();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/admin/login');
    }
}
