<?php

namespace App\Http\Controllers\V1\Admin\Product;

use App\Helpers\ApiResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\IndexRequest;
use App\Http\Requests\Product\AdjustStockRequest;
use App\Http\Resources\Stock\StockMovementResource;
use App\Models\Product;
use App\Services\Stock\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class ProductStockController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view products', only: ['index']),
            new Middleware('permission:adjust stock', only: ['store']),
        ];
    }

    public function __construct(
        private readonly StockService $stockService,
    ) {}

    public function index(IndexRequest $request, Product $product): JsonResponse
    {
        $movements = $this->stockService->history($product, $request->integer('per_page', 10));

        return ApiResponseHelper::paginated(StockMovementResource::collection($movements));
    }

    public function store(AdjustStockRequest $request, Product $product): JsonResponse
    {
        $movement = $this->stockService->adjust($product, $request->user(), $request->integer('quantity'), $request->string('note')->toString());

        return ApiResponseHelper::success(new StockMovementResource($movement->load('user:id,name')), 'Stock adjusted.', 201);
    }
}
