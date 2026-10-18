<?php

namespace App\Services\Product;

use App\Enums\StockMovementType;
use App\Models\Category;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use App\Services\Stock\StockService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class ProductService
{
    private const RELATIONS = ['category:id,name', 'supplier:id,name,lead_time_days'];

    public function __construct(
        private readonly StockService $stockService,
    ) {}

    /**
     * @param  array{search?: string|null, category?: int|null, supplier?: int|null, status?: string|null, stock?: string|null, per_page?: int|null}  $filters
     * @return LengthAwarePaginator<int, Product>
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return Product::with(self::RELATIONS)
            ->search($filters['search'] ?? null)
            ->when($filters['category'] ?? null, fn (Builder $query, int $category) => $query->where('category_id', $category))
            ->when($filters['supplier'] ?? null, fn (Builder $query, int $supplier) => $query->where('supplier_id', $supplier))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('is_active', $status === 'active'))
            ->when($filters['stock'] ?? null, fn (Builder $query, string $stock) => match ($stock) {
                'low' => $query->lowStock(),
                'out' => $query->where('stock_on_hand', '<=', 0),
                default => $query,
            })
            ->orderBy('name')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();
    }

    /**
     * @return array{categories: mixed, suppliers: mixed}
     */
    public function options(): array
    {
        return [
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name', 'lead_time_days']),
        ];
    }

    public function find(Product $product): Product
    {
        return $product->load(self::RELATIONS)->setAttribute('on_order', $product->quantityOnOrder());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $user): Product
    {
        return DB::transaction(function () use ($data, $user) {
            $product = Product::create(Arr::except($data, 'opening_stock'));

            if ($data['opening_stock'] > 0) {
                $this->stockService->record($product, (int) $data['opening_stock'], StockMovementType::Opening, $user);
            }

            return $product->load(self::RELATIONS);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Product $product, array $data): Product
    {
        $product->update($data);

        return $product->load(self::RELATIONS);
    }

    public function delete(Product $product): void
    {
        if ($product->saleItems()->exists() || $product->purchaseOrderItems()->exists()) {
            throw ValidationException::withMessages([
                'product' => 'This product has sales or purchase history. Mark it inactive instead of deleting it.',
            ]);
        }

        DB::transaction(function () use ($product) {
            $product->stockMovements()->delete();
            $product->delete();
        });
    }
}
