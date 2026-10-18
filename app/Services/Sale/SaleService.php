<?php

namespace App\Services\Sale;

use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use App\Services\Stock\StockService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class SaleService
{
    /**
     * Date filters are entered in the shop's local time; sold_at is stored in UTC.
     */
    private const SHOP_TIME_ZONE = 'Asia/Dhaka';

    public function __construct(
        private readonly StockService $stockService,
    ) {}

    /**
     * @param  array{search?: string|null, from?: string|null, to?: string|null, per_page?: int|null}  $filters
     * @return LengthAwarePaginator<int, Sale>
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return Sale::with('user:id,name')
            ->withCount('items')
            ->when($filters['search'] ?? null, fn (Builder $query, string $term) => $query->where(function (Builder $query) use ($term) {
                $query->whereLike('customer_name', "%{$term}%", caseSensitive: false);

                if (preg_match('/^(?:S-?)?0*(\d{1,18})$/i', trim($term), $match)) {
                    $query->orWhere('id', (int) $match[1]);
                }
            }))
            ->when($filters['from'] ?? null, fn (Builder $query, string $from) => $query->where('sold_at', '>=', $this->shopDay($from)->startOfDay()->utc()))
            ->when($filters['to'] ?? null, fn (Builder $query, string $to) => $query->where('sold_at', '<=', $this->shopDay($to)->endOfDay()->utc()))
            ->latest('sold_at')
            ->latest('id')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();
    }

    /**
     * Products that can be added to a new sale.
     *
     * @return Collection<int, Product>
     */
    public function products(): Collection
    {
        return Product::active()->orderBy('name')->get(['id', 'sku', 'name', 'sale_price', 'stock_on_hand']);
    }

    public function find(Sale $sale): Sale
    {
        return $sale->load(['user:id,name', 'items.product:id,sku,name']);
    }

    /**
     * Records a sale and takes its items out of stock. Prices come from the
     * product, never from the request. If any line has too little stock the
     * whole sale is rolled back.
     *
     * @param  array{customer_name?: string|null, notes?: string|null, items: array<int, array{product_id: int, quantity: int}>}  $data
     */
    public function create(array $data, User $user): Sale
    {
        return DB::transaction(function () use ($data, $user) {
            // Lock in id order so two checkouts sharing products can't deadlock.
            $products = Product::whereIn('id', array_column($data['items'], 'product_id'))
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $sale = Sale::create([
                'user_id' => $user->id,
                'customer_name' => $data['customer_name'] ?? null,
                'notes' => $data['notes'] ?? null,
                'total' => 0,
                'sold_at' => now(),
            ]);

            // Money is summed in paisa (integers) to avoid float rounding errors.
            $totalPaisa = 0;

            foreach ($data['items'] as $index => $item) {
                $product = $products[$item['product_id']];
                $quantity = (int) $item['quantity'];
                $unitPaisa = (int) round((float) $product->sale_price * 100);
                $linePaisa = $unitPaisa * $quantity;
                $totalPaisa += $linePaisa;

                $sale->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit_price' => $unitPaisa / 100,
                    'line_total' => $linePaisa / 100,
                ]);

                $this->stockService->record($product, -$quantity, StockMovementType::Sale, $user, $sale, errorKey: "items.{$index}.quantity");
            }

            $sale->update(['total' => $totalPaisa / 100]);

            return $this->find($sale);
        });
    }

    private function shopDay(string $date): Carbon
    {
        return Carbon::createFromFormat('Y-m-d', $date, self::SHOP_TIME_ZONE);
    }
}
