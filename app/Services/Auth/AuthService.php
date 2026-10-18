<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

final class AuthService
{
    /**
     * @param  array{email: string, password: string}  $credentials
     */
    public function attemptSession(array $credentials, bool $remember = false): User
    {
        if (Auth::guard('web')->attempt($credentials, $remember)) {
            return Auth::guard('web')->user();
        }

        throw ValidationException::withMessages([
            'email' => 'The provided credentials are incorrect.',
        ]);
    }

    public function logoutSession(): void
    {
        Auth::guard('web')->logout();
    }

    /**
     * @return list<array{role: string, email: string, password: string}>|null
     */
    public function demoAccounts(): ?array
    {
        if (! config('app.demo')) {
            return null;
        }

        return [
            ['role' => 'Super Admin', 'email' => 'admin@stocksense.test', 'password' => 'password'],
            ['role' => 'Admin', 'email' => 'manager@stocksense.test', 'password' => 'password'],
            ['role' => 'Staff', 'email' => 'staff@stocksense.test', 'password' => 'password'],
        ];
    }
}
