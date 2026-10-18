<?php

namespace App\Http\Middleware;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Spatie\Permission\Models\Permission;

class HandleInertiaRequests extends Middleware
{
    /**
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'appName' => config('app.name'),
            'auth' => fn () => [
                'user' => $request->user() ? [
                    ...$request->user()->only('id', 'name', 'email'),
                    'roles' => $request->user()->getRoleNames(),
                ] : null,
                'permissions' => $request->user() ? $this->permissions($request->user()) : [],
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }

    /**
     * @return array<int, string>
     */
    private function permissions(User $user): array
    {
        $permissions = $user->isSuperAdmin() ? Permission::pluck('name') : $user->getAllPermissions()->pluck('name');

        return $permissions->values()->all();
    }
}
