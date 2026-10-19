<?php

namespace App\Http\Controllers\V1\Admin\Forecast;

use App\Helpers\ApiResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\Forecast\ForecastOverviewResource;
use App\Http\Resources\Forecast\ProductForecastDetailResource;
use App\Models\Product;
use App\Services\Forecast\DemandForecastService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class DemandForecastController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view forecasts'),
        ];
    }

    public function __construct(
        private readonly DemandForecastService $forecastService,
    ) {}

    public function index(): JsonResponse
    {
        return ApiResponseHelper::success(new ForecastOverviewResource($this->forecastService->overview()));
    }

    public function show(Product $product): JsonResponse
    {
        return ApiResponseHelper::success(new ProductForecastDetailResource($this->forecastService->forecast($product)));
    }
}
