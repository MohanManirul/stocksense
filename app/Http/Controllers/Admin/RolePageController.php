<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class RolePageController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view roles', only: ['index']),
            new Middleware('permission:create roles', only: ['create']),
            new Middleware('permission:edit roles', only: ['edit']),
        ];
    }

    public function index(): Response
    {
        return Inertia::render('admin/roles/index/page');
    }

    public function create(): Response
    {
        return Inertia::render('admin/roles/create/page');
    }

    public function edit(Role $role): Response
    {
        abort_if($role->name === UserRole::SuperAdmin->value, 403, 'The super admin role cannot be changed.');

        return Inertia::render('admin/roles/edit/page', [
            'roleId' => $role->id,
        ]);
    }
}
