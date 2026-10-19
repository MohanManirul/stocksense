<?php

use App\Http\Controllers\V1\Admin\Category\CategoryController;
use App\Http\Controllers\V1\Admin\Dashboard\DashboardController;
use App\Http\Controllers\V1\Admin\Forecast\DemandForecastController;
use App\Http\Controllers\V1\Admin\Product\ProductController;
use App\Http\Controllers\V1\Admin\Product\ProductStockController;
use App\Http\Controllers\V1\Admin\PurchaseOrder\PurchaseOrderController;
use App\Http\Controllers\V1\Admin\PurchaseOrder\PurchaseOrderStatusController;
use App\Http\Controllers\V1\Admin\Role\RoleController;
use App\Http\Controllers\V1\Admin\Sale\SaleController;
use App\Http\Controllers\V1\Admin\Supplier\SupplierController;
use App\Http\Controllers\V1\Admin\User\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

        Route::get('products/options', [ProductController::class, 'options'])->name('products.options');
        Route::get('products/{product}/movements', [ProductStockController::class, 'index'])->name('products.movements');
        Route::post('products/{product}/adjustments', [ProductStockController::class, 'store'])->name('products.adjustments');
        Route::apiResource('products', ProductController::class);

        Route::get('sales/options', [SaleController::class, 'options'])->name('sales.options');
        Route::apiResource('sales', SaleController::class)->only(['index', 'store', 'show']);

        Route::get('purchase-orders/options', [PurchaseOrderController::class, 'options'])->name('purchase-orders.options');
        Route::controller(PurchaseOrderStatusController::class)
            ->prefix('purchase-orders/{purchase_order}')
            ->name('purchase-orders.')
            ->group(function () {
                Route::post('place', 'place')->name('place');
                Route::post('receive', 'receive')->name('receive');
                Route::post('cancel', 'cancel')->name('cancel');
            });
        Route::apiResource('purchase-orders', PurchaseOrderController::class);

        Route::get('forecasts', [DemandForecastController::class, 'index'])->name('forecasts.index');
        Route::get('forecasts/{product}', [DemandForecastController::class, 'show'])->name('forecasts.show');

        Route::apiResource('categories', CategoryController::class)->except('show');
        Route::apiResource('suppliers', SupplierController::class);

        Route::get('users/roles', [UserController::class, 'roleOptions'])->name('users.roles');
        Route::apiResource('users', UserController::class);

        Route::get('roles/permission-groups', [RoleController::class, 'permissionGroups'])->name('roles.permission-groups');
        Route::apiResource('roles', RoleController::class);
    });
