<?php

namespace App\Services\PurchaseOrder;

use App\Enums\PurchaseOrderStatus;
use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\User;
use App\Services\Stock\StockService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * A purchase order moves draft → ordered → received, and a placed order can
 * be cancelled instead of received. Only drafts can be edited or deleted, and
 * stock only changes when an order is received.
 */
final class PurchaseOrderService
{
    private const RELATIONS = ['supplier:id,name,lead_time_days', 'creator:id,name', 'receiver:id,name', 'items.product:id,sku,name,stock_on_hand'];

    public function __construct(
        private readonly StockService $stockService,
    ) {}

    /**
     * @param  array{search?: string|null, status?: string|null, supplier?: int|null, per_page?: int|null}  $filters
     * @return LengthAwarePaginator<int, PurchaseOrder>
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return PurchaseOrder::with('supplier:id,name')
            ->withCount('items')
            ->when($filters['search'] ?? null, fn (Builder $query, string $term) => $query->where(function (Builder $query) use ($term) {
                $query->whereHas('supplier', fn (Builder $query) => $query->whereLike('name', "%{$term}%", caseSensitive: false));

                if (preg_match('/^(?:PO-?)?0*(\d{1,18})$/i', trim($term), $match)) {
                    $query->orWhere('id', (int) $match[1]);
                }
            }))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['supplier'] ?? null, fn (Builder $query, int $supplier) => $query->where('supplier_id', $supplier))
            ->latest('id')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();
    }

    /**
     * Suppliers with the active products each one supplies.
     *
     * @return array{suppliers: mixed, products: mixed}
     */
    public function options(): array
    {
        return [
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name', 'lead_time_days']),
            'products' => Product::active()
                ->whereNotNull('supplier_id')
                ->orderBy('name')
                ->get(['id', 'supplier_id', 'sku', 'name', 'cost_price', 'stock_on_hand', 'reorder_level']),
        ];
    }

    public function find(PurchaseOrder $order): PurchaseOrder
    {
        return $order->load(self::RELATIONS);
    }

    /**
     * @param  array{supplier_id: int, expected_at?: string|null, notes?: string|null, items: array<int, array{product_id: int, quantity: int, unit_cost: string|float}>}  $data
     */
    public function create(array $data, User $user): PurchaseOrder
    {
        return DB::transaction(function () use ($data, $user) {
            $order = PurchaseOrder::create([
                'supplier_id' => $data['supplier_id'],
                'created_by' => $user->id,
                'expected_at' => $data['expected_at'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $this->saveItems($order, $data['items']);

            return $this->find($order);
        });
    }

    /**
     * @param  array{supplier_id: int, expected_at?: string|null, notes?: string|null, items: array<int, array{product_id: int, quantity: int, unit_cost: string|float}>}  $data
     */
    public function update(PurchaseOrder $order, array $data): PurchaseOrder
    {
        return DB::transaction(function () use ($order, $data) {
            $order = $this->lock($order, [PurchaseOrderStatus::Draft], 'Only draft orders can be edited.');

            $order->update([
                'supplier_id' => $data['supplier_id'],
                'expected_at' => $data['expected_at'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $order->items()->delete();
            $this->saveItems($order, $data['items']);

            return $this->find($order);
        });
    }

    public function delete(PurchaseOrder $order): void
    {
        DB::transaction(function () use ($order) {
            $order = $this->lock($order, [PurchaseOrderStatus::Draft], 'Only draft orders can be deleted. Cancel a placed order instead.');

            $order->items()->delete();
            $order->delete();
        });
    }

    public function place(PurchaseOrder $order): PurchaseOrder
    {
        return DB::transaction(function () use ($order) {
            $order = $this->lock($order, [PurchaseOrderStatus::Draft], 'Only draft orders can be placed.');

            $order->update([
                'status' => PurchaseOrderStatus::Ordered,
                'ordered_at' => now(),
                // Without a date from the user, expect it after the supplier's usual lead time.
                'expected_at' => $order->expected_at ?? now()->addDays($order->supplier->lead_time_days)->toDateString(),
            ]);

            return $this->find($order);
        });
    }

    /**
     * Adds every ordered unit to stock and records it in the ledger.
     */
    public function receive(PurchaseOrder $order, User $user): PurchaseOrder
    {
        return DB::transaction(function () use ($order, $user) {
            // Locking the order first means a double click can't receive it twice.
            $order = $this->lock($order, [PurchaseOrderStatus::Ordered], 'Only placed orders can be received.');
            $items = $order->items()->get();

            $products = Product::whereIn('id', $items->pluck('product_id'))
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($items as $item) {
                $this->stockService->record($products[$item->product_id], $item->quantity, StockMovementType::Purchase, $user, $order);
            }

            $order->update([
                'status' => PurchaseOrderStatus::Received,
                'received_at' => now(),
                'received_by' => $user->id,
            ]);

            return $this->find($order);
        });
    }

    public function cancel(PurchaseOrder $order): PurchaseOrder
    {
        return DB::transaction(function () use ($order) {
            $order = $this->lock($order, [PurchaseOrderStatus::Ordered], 'Only placed orders can be cancelled. Delete a draft instead.');

            $order->update([
                'status' => PurchaseOrderStatus::Cancelled,
                'cancelled_at' => now(),
            ]);

            return $this->find($order);
        });
    }

    /**
     * Re-reads the order with a row lock and checks it is in an allowed status.
     *
     * @param  array<int, PurchaseOrderStatus>  $allowed
     */
    private function lock(PurchaseOrder $order, array $allowed, string $message): PurchaseOrder
    {
        $locked = PurchaseOrder::lockForUpdate()->findOrFail($order->id);

        if (! in_array($locked->status, $allowed, true)) {
            throw ValidationException::withMessages(['status' => $message]);
        }

        return $locked;
    }

    /**
     * @param  array<int, array{product_id: int, quantity: int, unit_cost: string|float}>  $items
     */
    private function saveItems(PurchaseOrder $order, array $items): void
    {
        // Money is summed in paisa (integers) to avoid float rounding errors.
        $totalPaisa = 0;

        foreach ($items as $item) {
            $quantity = (int) $item['quantity'];
            $unitPaisa = (int) round((float) $item['unit_cost'] * 100);
            $linePaisa = $unitPaisa * $quantity;
            $totalPaisa += $linePaisa;

            $order->items()->create([
                'product_id' => $item['product_id'],
                'quantity' => $quantity,
                'unit_cost' => $unitPaisa / 100,
                'line_total' => $linePaisa / 100,
            ]);
        }

        $order->update(['total' => $totalPaisa / 100]);
    }
}
