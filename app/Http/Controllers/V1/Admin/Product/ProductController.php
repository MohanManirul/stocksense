<?php

namespace App\Http\Controllers\V1\Admin\Product;

use App\Helpers\ApiResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Product\IndexProductRequest;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Http\Resources\Product\ProductResource;
use App\Models\Product;
use App\Services\Product\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class ProductController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:view products', only: ['index', 'show', 'options']),
            new Middleware('permission:create products', only: ['store']),
            new Middleware('permission:edit products', only: ['update']),
            new Middleware('permission:delete products', only: ['destroy']),
        ];
    }

    public function __construct(
        private readonly ProductService $productService,
    ) {}

    public function index(IndexProductRequest $request): JsonResponse
    {
        return ApiResponseHelper::paginated(ProductResource::collection($this->productService->list($request->validated())));
    }

    public function options(): JsonResponse
    {
        return ApiResponseHelper::success($this->productService->options());
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->productService->create($request->validated(), $request->user());

        return ApiResponseHelper::success(new ProductResource($product), 'Product created.', 201);
    }

    public function show(Product $product): JsonResponse
    {
        return ApiResponseHelper::success(new ProductResource($this->productService->find($product)));
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $product = $this->productService->update($product, $request->validated());

        return ApiResponseHelper::success(new ProductResource($product), 'Product updated.');
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->productService->delete($product);

        return ApiResponseHelper::success(message: 'Product deleted.');
    }
}
