<?php

namespace App\Http\Controllers\V1\Admin\PurchaseOrder;

use App\Helpers\ApiResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\PurchaseOrder\IndexPurchaseOrderRequest;
use App\Http\Requests\PurchaseOrder\PurchaseOrderRequest;
use App\Http\Resources\PurchaseOrder\PurchaseOrderResource;
use App\Models\PurchaseOrder;
use App\Services\PurchaseOrder\PurchaseOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class PurchaseOrderController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view purchase orders', only: ['index', 'show', 'options']),
            new Middleware('permission:create purchase orders', only: ['store']),
            new Middleware('permission:edit purchase orders', only: ['update']),
            new Middleware('permission:delete purchase orders', only: ['destroy']),
        ];
    }

    public function __construct(
        private readonly PurchaseOrderService $purchaseOrderService,
    ) {}

    public function index(IndexPurchaseOrderRequest $request): JsonResponse
    {
        return ApiResponseHelper::paginated(PurchaseOrderResource::collection($this->purchaseOrderService->list($request->validated())));
    }

    public function options(): JsonResponse
    {
        return ApiResponseHelper::success($this->purchaseOrderService->options());
    }

    public function store(PurchaseOrderRequest $request): JsonResponse
    {
        $order = $this->purchaseOrderService->create($request->validated(), $request->user());

        return ApiResponseHelper::success(new PurchaseOrderResource($order), "Purchase order {$order->number} saved as draft.", 201);
    }

    public function show(PurchaseOrder $purchaseOrder): JsonResponse
    {
        return ApiResponseHelper::success(new PurchaseOrderResource($this->purchaseOrderService->find($purchaseOrder)));
    }

    public function update(PurchaseOrderRequest $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $order = $this->purchaseOrderService->update($purchaseOrder, $request->validated());

        return ApiResponseHelper::success(new PurchaseOrderResource($order), 'Purchase order updated.');
    }

    public function destroy(PurchaseOrder $purchaseOrder): JsonResponse
    {
        $this->purchaseOrderService->delete($purchaseOrder);

        return ApiResponseHelper::success(message: 'Purchase order deleted.');
    }
}
