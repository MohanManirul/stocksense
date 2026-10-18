<?php

use App\Http\Controllers\Admin\ProductPageController;
use App\Http\Controllers\Admin\RolePageController;
use App\Http\Controllers\Admin\SupplierPageController;
use App\Http\Controllers\Admin\UserPageController;
use App\Http\Controllers\Auth\AuthController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('guest:web')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('/demo-login/{user}', [AuthController::class, 'demoLogin'])->middleware('throttle:10,1')->name('demo-login');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::redirect('/', '/admin/dashboard')->name('admin.index');

    Route::get('/dashboard', fn () => Inertia::render('admin/dashboard/page'))->name('dashboard');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    Route::controller(ProductPageController::class)
        ->prefix('products')
        ->name('products.')
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::get('/{product}', 'show')->name('show');
            Route::get('/{product}/edit', 'edit')->name('edit');
        });

    Route::get('/categories', fn () => Inertia::render('admin/categories/page'))
        ->middleware('permission:view categories')
        ->name('categories.index');

    Route::controller(SupplierPageController::class)
        ->prefix('suppliers')
        ->name('suppliers.')
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::get('/{supplier}/edit', 'edit')->name('edit');
        });

    Route::controller(UserPageController::class)
        ->prefix('users')
        ->name('users.')
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::get('/{user}/edit', 'edit')->name('edit');
        });

    Route::controller(RolePageController::class)
        ->prefix('roles')
        ->name('roles.')
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::get('/{role}/edit', 'edit')->name('edit');
        });
});
