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
     * @return list<array{id: int, name: string, role: string|null, email: string}>|null
     */
    public function demoAccounts(): ?array
    {
        if (! config('app.demo')) {
            return null;
        }

        return User::with('roles:id,name')
            ->orderBy('id')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->roles->first()?->name,
                'email' => $user->email,
            ])
            ->all();
    }

    public function demoLogin(User $user): void
    {
        abort_unless(config('app.demo'), 404);

        Auth::guard('web')->login($user);
    }
}
