<?php

namespace App\Http\Controllers\V1\Admin\Supplier;

use App\Helpers\ApiResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\IndexRequest;
use App\Http\Requests\Supplier\StoreSupplierRequest;
use App\Http\Requests\Supplier\UpdateSupplierRequest;
use App\Http\Resources\Supplier\SupplierResource;
use App\Models\Supplier;
use App\Services\Supplier\SupplierService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class SupplierController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view suppliers', only: ['index', 'show']),
            new Middleware('permission:create suppliers', only: ['store']),
            new Middleware('permission:edit suppliers', only: ['update']),
            new Middleware('permission:delete suppliers', only: ['destroy']),
        ];
    }

    public function __construct(
        private readonly SupplierService $supplierService,
    ) {}

    public function index(IndexRequest $request): JsonResponse
    {
        return ApiResponseHelper::paginated(SupplierResource::collection($this->supplierService->list($request->validated())));
    }

    public function store(StoreSupplierRequest $request): JsonResponse
    {
        $supplier = $this->supplierService->create($request->validated());

        return ApiResponseHelper::success(new SupplierResource($supplier), 'Supplier created.', 201);
    }

    public function show(Supplier $supplier): JsonResponse
    {
        return ApiResponseHelper::success(new SupplierResource($supplier->loadCount('products')));
    }

    public function update(UpdateSupplierRequest $request, Supplier $supplier): JsonResponse
    {
        $supplier = $this->supplierService->update($supplier, $request->validated());

        return ApiResponseHelper::success(new SupplierResource($supplier), 'Supplier updated.');
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        $this->supplierService->delete($supplier);

        return ApiResponseHelper::success(message: 'Supplier deleted.');
    }
}
