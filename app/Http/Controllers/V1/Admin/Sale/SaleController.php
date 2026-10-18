<?php

namespace App\Http\Controllers\V1\Admin\Sale;

use App\Helpers\ApiResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sale\IndexSaleRequest;
use App\Http\Requests\Sale\StoreSaleRequest;
use App\Http\Resources\Sale\SaleResource;
use App\Models\Sale;
use App\Services\Sale\SaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class SaleController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view sales', only: ['index', 'show']),
            new Middleware('permission:create sales', only: ['options', 'store']),
        ];
    }

    public function __construct(
        private readonly SaleService $saleService,
    ) {}

    public function index(IndexSaleRequest $request): JsonResponse
    {
        return ApiResponseHelper::paginated(SaleResource::collection($this->saleService->list($request->validated())));
    }

    public function options(): JsonResponse
    {
        return ApiResponseHelper::success(['products' => $this->saleService->products()]);
    }

    public function store(StoreSaleRequest $request): JsonResponse
    {
        $sale = $this->saleService->create($request->validated(), $request->user());

        return ApiResponseHelper::success(new SaleResource($sale), "Sale {$sale->number} recorded.", 201);
    }

    public function show(Sale $sale): JsonResponse
    {
        return ApiResponseHelper::success(new SaleResource($this->saleService->find($sale)));
    }
}
