<?php

namespace App\Http\Controllers\V1\Admin\PurchaseOrder;

use App\Helpers\ApiResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PurchaseOrder\PurchaseOrderResource;
use App\Models\PurchaseOrder;
use App\Services\PurchaseOrder\PurchaseOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class PurchaseOrderStatusController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:edit purchase orders', only: ['place', 'cancel']),
            new Middleware('permission:receive purchase orders', only: ['receive']),
        ];
    }

    public function __construct(
        private readonly PurchaseOrderService $purchaseOrderService,
    ) {}

    public function place(PurchaseOrder $purchaseOrder): JsonResponse
    {
        $order = $this->purchaseOrderService->place($purchaseOrder);

        return ApiResponseHelper::success(new PurchaseOrderResource($order), "Purchase order {$order->number} placed.");
    }

    public function receive(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $order = $this->purchaseOrderService->receive($purchaseOrder, $request->user());

        return ApiResponseHelper::success(new PurchaseOrderResource($order), "Purchase order {$order->number} received. Stock updated.");
    }

    public function cancel(PurchaseOrder $purchaseOrder): JsonResponse
    {
        $order = $this->purchaseOrderService->cancel($purchaseOrder);

        return ApiResponseHelper::success(new PurchaseOrderResource($order), "Purchase order {$order->number} cancelled.");
    }
}
