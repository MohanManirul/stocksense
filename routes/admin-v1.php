<?php

use App\Http\Controllers\V1\Admin\Category\CategoryController;
use App\Http\Controllers\V1\Admin\Dashboard\DashboardController;
use App\Http\Controllers\V1\Admin\Role\RoleController;
use App\Http\Controllers\V1\Admin\Supplier\SupplierController;
use App\Http\Controllers\V1\Admin\User\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

        Route::apiResource('categories', CategoryController::class)->except('show');
        Route::apiResource('suppliers', SupplierController::class);

        Route::get('users/roles', [UserController::class, 'roleOptions'])->name('users.roles');
        Route::apiResource('users', UserController::class);

        Route::get('roles/permission-groups', [RoleController::class, 'permissionGroups'])->name('roles.permission-groups');
        Route::apiResource('roles', RoleController::class);
    });
