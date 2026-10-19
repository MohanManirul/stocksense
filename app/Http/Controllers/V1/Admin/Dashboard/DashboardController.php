<?php

namespace App\Http\Controllers\V1\Admin\Dashboard;

use App\Helpers\ApiResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\Dashboard\DashboardResource;
use App\Services\Dashboard\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return ApiResponseHelper::success(new DashboardResource($this->dashboardService->summary($request->user())));
    }
}
