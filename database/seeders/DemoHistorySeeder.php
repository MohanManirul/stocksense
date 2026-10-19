<?php

namespace Database\Seeders;

use App\Enums\PurchaseOrderStatus;
use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Simulates 90 days of trading for the demo products so the demand forecast
 * has realistic history to learn from: weekday patterns, gentle trends and
 * random noise, with purchase orders restocking products from their
 * supplier after its lead time. Stock and the ledger stay consistent.
 *
 * Runs only on a database with no sales yet, and is seeded so every run
 * produces the same history.
 */
class DemoHistorySeeder extends Seeder
{
    use WithoutModelEvents;

    private const DAYS = 90;

    private const SHOP_TIME_ZONE = 'Asia/Dhaka';

    /** Final days in which no new purchase orders are placed. */
    private const UNORDERED_DAYS = 7;

    /**
     * Average units per day, change in demand over the 90 days, and demand
     * multipliers for Monday..Sunday. Friday is the weekend; schools run
     * Sunday to Thursday.
     *
     * @var array<string, array{rate: float, growth: float, weekdays: list<float>}>
     */
    private const DEMAND = [
        'BEV-001' => ['rate' => 12.0, 'growth' => 0.35, 'weekdays' => [0.9, 0.9, 0.9, 1.1, 1.4, 1.2, 0.8]],
        'BEV-002' => ['rate' => 2.5, 'growth' => 0.2, 'weekdays' => [0.8, 0.8, 0.8, 1.0, 1.7, 1.2, 0.8]],
        'SNK-001' => ['rate' => 7.0, 'growth' => 0.0, 'weekdays' => [0.9, 0.9, 0.9, 1.3, 1.5, 1.0, 0.7]],
        'SNK-002' => ['rate' => 4.0, 'growth' => -0.15, 'weekdays' => [1.0, 1.0, 1.0, 1.0, 1.2, 1.0, 0.9]],
        'DRY-001' => ['rate' => 9.0, 'growth' => 0.05, 'weekdays' => [1.0, 1.0, 1.0, 1.0, 1.1, 1.0, 1.0]],
        'HOU-001' => ['rate' => 1.4, 'growth' => 0.0, 'weekdays' => [0.8, 0.8, 0.8, 1.0, 1.6, 1.3, 0.8]],
        'PER-001' => ['rate' => 0.8, 'growth' => 0.1, 'weekdays' => [0.9, 0.9, 0.9, 1.0, 1.4, 1.1, 0.9]],
        'STA-001' => ['rate' => 6.0, 'growth' => 0.25, 'weekdays' => [1.25, 1.25, 1.25, 1.2, 0.15, 0.5, 1.35]],
    ];

    public function run(): void
    {
        if (Sale::exists()) {
            $this->command?->warn('Sales already exist; skipping demo history.');

            return;
        }

        $owner = User::where('email', 'admin@stocksense.test')->first() ?? User::first();
        $products = Product::with('supplier')->whereIn('sku', array_keys(self::DEMAND))->get()->keyBy('id');

        if ($owner === null || $products->isEmpty()) {
            return;
        }

        mt_srand(2026);

        DB::transaction(fn () => $this->simulate($owner, $products));
    }

    /**
     * @param  Collection<int, Product>  $products
     */
    private function simulate(User $owner, Collection $products): void
    {
        $now = CarbonImmutable::now(self::SHOP_TIME_ZONE);
        $firstDay = $now->startOfDay()->subDays(self::DAYS);
        $stock = $products->map(fn (Product $product) => $product->stock_on_hand)->all();

        /** @var array<int, array{order: PurchaseOrder, arrives: CarbonImmutable}> $pending */
        $pending = [];
        /** @var array<int, true> $awaiting product ids with an open order */
        $awaiting = [];

        // The opening stock was counted at the start of the history.
        foreach ($products as $product) {
            $product->forceFill(['created_at' => $firstDay->utc()])->save();
        }
        StockMovement::whereIn('product_id', $products->keys())
            ->where('type', StockMovementType::Opening)
            ->update(['occurred_at' => $firstDay->addHours(8)->utc(), 'created_at' => $firstDay->addHours(8)->utc()]);

        for ($dayIndex = 0; $dayIndex <= self::DAYS; $dayIndex++) {
            $day = $firstDay->addDays($dayIndex);

            foreach ($pending as $orderId => $delivery) {
                if ($delivery['arrives']->lte($day)) {
                    $this->receive($delivery['order'], $day->addHours(9), $owner, $products, $stock);
                    foreach ($delivery['order']->items as $item) {
                        unset($awaiting[$item->product_id]);
                    }
                    unset($pending[$orderId]);
                }
            }

            $this->trade($day, $dayIndex, $now, $owner, $products, $stock);

            if ($day->isSameDay($now)) {
                break;
            }

            // The last week's ordering is left for the forecast to suggest.
            if ($dayIndex >= self::DAYS - self::UNORDERED_DAYS) {
                continue;
            }

            foreach ($this->restock($day, $products, $stock, $awaiting, $owner) as $order) {
                $pending[$order->id] = ['order' => $order, 'arrives' => $day->addDays($order->supplier->lead_time_days)];
            }
        }

        foreach ($products as $id => $product) {
            $product->forceFill(['stock_on_hand' => $stock[$id]])->save();
        }
    }

    /**
     * Rings up one day's sales as a number of separate bills.
     *
     * @param  Collection<int, Product>  $products
     * @param  array<int, int>  $stock
     */
    private function trade(CarbonImmutable $day, int $dayIndex, CarbonImmutable $now, User $owner, Collection $products, array &$stock): void
    {
        $billCount = max(1, $this->poisson(16));
        $bills = [];

        foreach ($products as $id => $product) {
            $demand = self::DEMAND[$product->sku];
            $rate = $demand['rate'] * (1 + $demand['growth'] * $dayIndex / self::DAYS) * $demand['weekdays'][$day->isoWeekday() - 1];
            $units = min($this->poisson($rate), $stock[$id]);

            for ($unit = 0; $unit < $units; $unit++) {
                $bill = mt_rand(0, $billCount - 1);
                $bills[$bill][$id] = ($bills[$bill][$id] ?? 0) + 1;
            }
        }

        $times = [];
        foreach (array_keys($bills) as $bill) {
            $times[$bill] = $day->addMinutes(mt_rand(8 * 60, 22 * 60));
        }
        asort($times);

        foreach ($times as $bill => $soldAt) {
            if ($soldAt->gt($now)) {
                continue;
            }

            $this->recordSale($bills[$bill], $soldAt, $owner, $products, $stock);
        }
    }

    /**
     * @param  array<int, int>  $lines  product id => quantity
     * @param  Collection<int, Product>  $products
     * @param  array<int, int>  $stock
     */
    private function recordSale(array $lines, CarbonImmutable $soldAt, User $owner, Collection $products, array &$stock): void
    {
        $at = $soldAt->utc();
        $sale = new Sale;
        $sale->forceFill(['user_id' => $owner->id, 'total' => 0, 'sold_at' => $at, 'created_at' => $at, 'updated_at' => $at])->save();

        $totalPaisa = 0;
        $items = [];
        $movements = [];

        foreach ($lines as $productId => $quantity) {
            $unitPaisa = (int) round((float) $products[$productId]->sale_price * 100);
            $totalPaisa += $unitPaisa * $quantity;
            $stock[$productId] -= $quantity;

            $items[] = [
                'sale_id' => $sale->id,
                'product_id' => $productId,
                'quantity' => $quantity,
                'unit_price' => $unitPaisa / 100,
                'line_total' => $unitPaisa * $quantity / 100,
                'created_at' => $at,
                'updated_at' => $at,
            ];
            $movements[] = $this->movement($productId, $owner, StockMovementType::Sale, -$quantity, $stock[$productId], $sale, $at);
        }

        SaleItem::insert($items);
        StockMovement::insert($movements);
        $sale->forceFill(['total' => $totalPaisa / 100])->save();
    }

    /**
     * Places an order with each supplier whose products have fallen to their
     * fixed reorder level, sized to roughly three weeks of sales. Like many
     * small shops, it ignores lead time, so fast sellers sometimes run out.
     *
     * @param  Collection<int, Product>  $products
     * @param  array<int, int>  $stock
     * @param  array<int, true>  $awaiting
     * @return list<PurchaseOrder>
     */
    private function restock(CarbonImmutable $day, Collection $products, array $stock, array &$awaiting, User $owner): array
    {
        $needed = [];

        foreach ($products as $id => $product) {
            $rate = self::DEMAND[$product->sku]['rate'];

            if (! isset($awaiting[$id]) && $stock[$id] <= $product->reorder_level) {
                $needed[$product->supplier_id][$id] = (int) (ceil($rate * 21 / 6) * 6);
            }
        }

        $orders = [];
        $orderedAt = $day->addHours(20)->utc();

        foreach ($needed as $supplierId => $lines) {
            $order = new PurchaseOrder;
            $order->forceFill([
                'supplier_id' => $supplierId,
                'created_by' => $owner->id,
                'status' => PurchaseOrderStatus::Ordered,
                'total' => 0,
                'ordered_at' => $orderedAt,
                'expected_at' => $day->addDays($products->firstWhere('supplier_id', $supplierId)->supplier->lead_time_days)->toDateString(),
                'created_at' => $orderedAt,
                'updated_at' => $orderedAt,
            ])->save();

            $totalPaisa = 0;

            foreach ($lines as $productId => $quantity) {
                $unitPaisa = (int) round((float) $products[$productId]->cost_price * 100);
                $totalPaisa += $unitPaisa * $quantity;
                $order->items()->create([
                    'product_id' => $productId,
                    'quantity' => $quantity,
                    'unit_cost' => $unitPaisa / 100,
                    'line_total' => $unitPaisa * $quantity / 100,
                ]);
                $awaiting[$productId] = true;
            }

            $order->forceFill(['total' => $totalPaisa / 100])->save();
            $orders[] = $order->load('supplier', 'items');
        }

        return $orders;
    }

    /**
     * @param  Collection<int, Product>  $products
     * @param  array<int, int>  $stock
     */
    private function receive(PurchaseOrder $order, CarbonImmutable $receivedAt, User $owner, Collection $products, array &$stock): void
    {
        $at = $receivedAt->utc();
        $movements = [];

        /** @var PurchaseOrderItem $item */
        foreach ($order->items as $item) {
            $stock[$item->product_id] += $item->quantity;
            $movements[] = $this->movement($item->product_id, $owner, StockMovementType::Purchase, $item->quantity, $stock[$item->product_id], $order, $at);
        }

        StockMovement::insert($movements);
        $order->forceFill(['status' => PurchaseOrderStatus::Received, 'received_at' => $at, 'received_by' => $owner->id, 'updated_at' => $at])->save();
    }

    /**
     * @return array<string, mixed>
     */
    private function movement(int $productId, User $owner, StockMovementType $type, int $quantity, int $balance, Sale|PurchaseOrder $reference, CarbonImmutable $at): array
    {
        return [
            'product_id' => $productId,
            'user_id' => $owner->id,
            'type' => $type->value,
            'quantity' => $quantity,
            'balance_after' => $balance,
            'reference_type' => $reference->getMorphClass(),
            'reference_id' => $reference->id,
            'note' => null,
            'occurred_at' => $at,
            'created_at' => $at,
            'updated_at' => $at,
        ];
    }

    /**
     * Knuth's method; fine for the small rates used here.
     */
    private function poisson(float $mean): int
    {
        $limit = exp(-$mean);
        $count = 0;
        $product = mt_rand() / mt_getrandmax();

        while ($product > $limit) {
            $count++;
            $product *= mt_rand() / mt_getrandmax();
        }

        return $count;
    }
}
