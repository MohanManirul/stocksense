<?php

use App\Http\Controllers\Admin\SupplierPageController;
use App\Http\Controllers\Auth\AuthController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('guest:web')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::redirect('/', '/admin/dashboard')->name('admin.index');

    Route::get('/dashboard', fn () => Inertia::render('admin/dashboard/page'))->name('dashboard');
    Route::get('/categories', fn () => Inertia::render('admin/categories/page'))->name('categories.index');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    Route::controller(SupplierPageController::class)
        ->prefix('suppliers')
        ->name('suppliers.')
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('/create', 'create')->name('create');
            Route::get('/{supplier}/edit', 'edit')->name('edit');
        });
});
