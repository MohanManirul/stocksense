<?php

namespace App\Http\Controllers\V1\Admin\Supplier;

use App\Helpers\ApiResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Supplier\IndexSupplierRequest;
use App\Http\Requests\Supplier\StoreSupplierRequest;
use App\Http\Requests\Supplier\UpdateSupplierRequest;
use App\Http\Resources\Supplier\SupplierResource;
use App\Models\Supplier;
use App\Services\Supplier\SupplierService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class SupplierController extends Controller
{
    public function __construct(
        private readonly SupplierService $supplierService,
    ) {}

    public function index(IndexSupplierRequest $request): JsonResponse
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
        Gate::authorize('delete', $supplier);

        $this->supplierService->delete($supplier);

        return ApiResponseHelper::success(message: 'Supplier deleted.');
    }
}
