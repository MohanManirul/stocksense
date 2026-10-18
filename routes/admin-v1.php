<?php

use App\Http\Controllers\V1\Admin\Category\CategoryController;
use App\Http\Controllers\V1\Admin\Dashboard\DashboardController;
use App\Http\Controllers\V1\Admin\Supplier\SupplierController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

        Route::apiResource('categories', CategoryController::class)->except('show');
        Route::apiResource('suppliers', SupplierController::class);
    });
