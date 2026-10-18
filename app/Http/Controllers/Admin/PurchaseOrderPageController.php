<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseOrderPageController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view purchase orders', only: ['index', 'show']),
            new Middleware('permission:create purchase orders', only: ['create']),
            new Middleware('permission:edit purchase orders', only: ['edit']),
        ];
    }

    public function index(): Response
    {
        return Inertia::render('admin/purchase-orders/index/page');
    }

    public function create(): Response
    {
        return Inertia::render('admin/purchase-orders/create/page');
    }

    public function show(PurchaseOrder $purchaseOrder): Response
    {
        return Inertia::render('admin/purchase-orders/show/page', [
            'purchaseOrderId' => $purchaseOrder->id,
        ]);
    }

    public function edit(PurchaseOrder $purchaseOrder): Response|RedirectResponse
    {
        // Placed, received and cancelled orders are read-only.
        if (! $purchaseOrder->isDraft()) {
            return to_route('purchase-orders.show', $purchaseOrder);
        }

        return Inertia::render('admin/purchase-orders/edit/page', [
            'purchaseOrderId' => $purchaseOrder->id,
        ]);
    }
}
