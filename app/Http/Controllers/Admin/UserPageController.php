<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class UserPageController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view users', only: ['index']),
            new Middleware('permission:create users', only: ['create']),
            new Middleware('permission:edit users', only: ['edit']),
        ];
    }

    public function index(): Response
    {
        return Inertia::render('admin/users/index/page');
    }

    public function create(): Response
    {
        return Inertia::render('admin/users/create/page');
    }

    public function edit(User $user): Response
    {
        abort_if($user->isSuperAdmin(), 403, 'The super admin account cannot be changed.');

        return Inertia::render('admin/users/edit/page', [
            'userId' => $user->id,
        ]);
    }
}
