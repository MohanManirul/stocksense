<?php

namespace App\Services\Forecast;

use App\Enums\PurchaseOrderStatus;
use App\Models\Product;
use App\Models\PurchaseOrderItem;
use App\Models\SaleItem;
use App\Models\StockMovement;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Forecasts each product's daily demand from its sales history and turns the
 * forecast into a reorder suggestion.
 *
 * Reordering follows a classic (s, S) policy: when stock plus open orders
 * falls to the reorder point s (demand over the supplier's lead time plus
 * safety stock), order up to S (demand over lead time plus one review period
 * plus safety stock).
 *
 * Each product is also back-tested: the model is trained without the last
 * HOLDOUT_DAYS days, asked to predict them, and scored against a plain
 * moving average so its usefulness can be measured, not assumed.
 */
final class DemandForecastService
{
    /** Days of sales history the model learns from. */
    public const HISTORY_DAYS = 90;

    /** Most recent days hidden from the model during the back-test. */
    public const HOLDOUT_DAYS = 14;

    /** Days of daily forecast returned for charts. */
    public const FORECAST_DAYS = 30;

    /** How often the shop is assumed to review stock and place orders. */
    public const REVIEW_PERIOD_DAYS = 7;

    /** Lead time used when a product has no supplier. */
    public const DEFAULT_LEAD_TIME_DAYS = 7;

    /** Fewer days of history than this is too little to forecast from. */
    public const MIN_HISTORY_DAYS = 14;

    /** Window of the moving-average baseline the model is compared with. */
    public const BASELINE_DAYS = 28;

    /** z-score for the safety stock: covers demand on about 95% of cycles. */
    public const SERVICE_LEVEL_Z = 1.65;

    /** z-score for the "likely range" band on charts (about 80%). */
    private const RANGE_Z = 1.28;

    /** Days ahead searched for the stock-out date. */
    private const COVER_HORIZON_DAYS = 90;

    private const SHOP_TIME_ZONE = 'Asia/Dhaka';

    /**
     * Forecasts for every active product, most urgent first, with the
     * back-test accuracy pooled across all of them.
     *
     * @return array{generated_at: Carbon, settings: array<string, int|float>, accuracy: array<string, mixed>, products: Collection<int, array<string, mixed>>}
     */
    public function overview(): array
    {
        $products = Product::active()->with('supplier:id,name,lead_time_days')->orderBy('name')->get();
        $forecasts = $this->analyse($products);

        $urgency = ['critical' => 0, 'reorder' => 1, 'ok' => 2, 'no_data' => 3];

        return [
            'generated_at' => now(),
            'settings' => $this->settings(),
            'accuracy' => $this->pooledAccuracy($forecasts),
            'products' => $forecasts
                ->sortBy([
                    fn (array $a, array $b) => $urgency[$a['status']] <=> $urgency[$b['status']],
                    fn (array $a, array $b) => ($a['days_of_cover'] ?? PHP_INT_MAX) <=> ($b['days_of_cover'] ?? PHP_INT_MAX),
                ])
                ->values(),
        ];
    }

    /**
     * One product's forecast with the daily series behind it.
     *
     * @return array<string, mixed>
     */
    public function forecast(Product $product): array
    {
        $product->loadMissing('supplier:id,name,lead_time_days');

        return $this->analyse(new Collection([$product]))->first() + ['settings' => $this->settings()];
    }

    /**
     * @param  Collection<int, Product>  $products
     * @return Collection<int, array<string, mixed>>
     */
    private function analyse(Collection $products): Collection
    {
        $today = CarbonImmutable::now(self::SHOP_TIME_ZONE)->startOfDay();
        $windowStart = $today->subDays(self::HISTORY_DAYS);
        $ids = $products->pluck('id')->all();

        $sales = $this->dailySales($ids, $windowStart);
        $stockOuts = $this->stockOutDays($ids, $windowStart, $today);
        $onOrder = $this->quantitiesOnOrder($ids);

        return $products->map(fn (Product $product) => $this->analyseProduct(
            $product,
            $sales[$product->id] ?? [],
            $stockOuts[$product->id] ?? [],
            $onOrder[$product->id] ?? 0,
            $windowStart,
            $today,
        ));
    }

    /**
     * @param  array<string, int>  $unitsByDay  Shop-local Y-m-d => units sold
     * @param  array<string, true>  $stockOuts  Shop-local days the product ran out of stock
     * @return array<string, mixed>
     */
    private function analyseProduct(Product $product, array $unitsByDay, array $stockOuts, int $onOrder, CarbonImmutable $windowStart, CarbonImmutable $today): array
    {
        $leadTime = max(1, $product->supplier?->lead_time_days ?? self::DEFAULT_LEAD_TIME_DAYS);
        $soldToday = $unitsByDay[$today->toDateString()] ?? 0;
        unset($unitsByDay[$today->toDateString()]);

        // History starts when the product started selling (or was added),
        // so days before it existed don't count as days with no demand.
        $firstSale = $unitsByDay === [] ? null : CarbonImmutable::parse(min(array_keys($unitsByDay)), self::SHOP_TIME_ZONE);
        $created = ($product->created_at ?? now())->toImmutable()->setTimezone(self::SHOP_TIME_ZONE)->startOfDay();
        $start = max($windowStart, $firstSale ? min($firstSale, $created) : $created);

        // On a day the shelf was empty, sales show how much stock there was,
        // not how much customers wanted, so the model treats it as unknown.
        $sold = [];
        $series = [];
        $history = [];

        for ($day = $start; $day->lt($today); $day = $day->addDay()) {
            $date = $day->toDateString();
            $units = $unitsByDay[$date] ?? 0;
            $inStock = ! isset($stockOuts[$date]);
            $sold[] = $units;
            $series[] = $inStock ? $units : null;
            $history[] = ['date' => $date, 'units' => $units, 'in_stock' => $inStock];
        }

        $known = array_values(array_filter($series, fn (?int $units) => $units !== null));

        $result = [
            'product' => $product,
            'status' => 'no_data',
            'confidence' => null,
            'lead_time_days' => $leadTime,
            'history_days' => count($series),
            'stock_out_days' => count($series) - count($known),
            'units_sold' => array_sum($sold),
            'sold_today' => $soldToday,
            'recent_daily_average' => $this->mean(array_slice($sold, -self::BASELINE_DAYS)),
            'forecast_daily' => null,
            'forecast_7_days' => null,
            'forecast_30_days' => null,
            'on_order' => $onOrder,
            'days_of_cover' => null,
            'stockout_date' => null,
            'safety_stock' => null,
            'reorder_point' => null,
            'target_stock' => null,
            'suggested_order_quantity' => 0,
            'accuracy' => null,
            'model' => null,
            'history' => $history,
            'backtest' => [],
            'forecast' => [],
        ];

        if (count($known) < self::MIN_HISTORY_DAYS || array_sum($known) === 0) {
            return $result;
        }

        $model = DemandModel::fit($series, $start->isoWeekday());
        $daily = $model->forecast(self::COVER_HORIZON_DAYS, $today->isoWeekday());
        // Part of today's demand has already been sold and taken out of stock.
        $daily[0] = max(0.0, $daily[0] - $soldToday);

        $protection = $leadTime + self::REVIEW_PERIOD_DAYS;
        $leadDemand = array_sum(array_slice($daily, 0, $leadTime));
        $safetyStock = (int) ceil(self::SERVICE_LEVEL_Z * $model->residualStdDev * sqrt($protection));
        $reorderPoint = (int) ceil($leadDemand) + $safetyStock;
        $targetStock = (int) ceil(array_sum(array_slice($daily, 0, $protection))) + $safetyStock;
        $available = $product->stock_on_hand + $onOrder;

        $status = match (true) {
            $available < $leadDemand => 'critical',
            $available <= $reorderPoint => 'reorder',
            default => 'ok',
        };

        $cover = $this->daysOfCover($product->stock_on_hand, $daily);
        $accuracy = $this->backtest($series, $start);

        $forecast = [];

        foreach (array_slice($daily, 0, self::FORECAST_DAYS) as $offset => $units) {
            $forecast[] = [
                'date' => $today->addDays($offset)->toDateString(),
                'units' => $units,
                'low' => max(0.0, $units - self::RANGE_Z * $model->residualStdDev),
                'high' => $units + self::RANGE_Z * $model->residualStdDev,
            ];
        }

        return array_merge($result, [
            'status' => $status,
            'confidence' => $this->confidence($accuracy, count($known)),
            'forecast_daily' => array_sum(array_slice($daily, 1, 7)) / 7,
            'forecast_7_days' => array_sum(array_slice($daily, 0, 7)),
            'forecast_30_days' => array_sum(array_slice($daily, 0, 30)),
            'days_of_cover' => $cover,
            'stockout_date' => $cover === null ? null : $today->addDays($cover)->toDateString(),
            'safety_stock' => $safetyStock,
            'reorder_point' => $reorderPoint,
            'target_stock' => $targetStock,
            'suggested_order_quantity' => $status === 'ok' ? 0 : max(0, $targetStock - $available),
            'accuracy' => $accuracy === null ? null : array_diff_key($accuracy, ['points' => true]),
            'model' => $model,
            'backtest' => $accuracy['points'] ?? [],
            'forecast' => $forecast,
        ]);
    }

    /**
     * Trains on everything except the last HOLDOUT_DAYS, predicts those days
     * and compares the error with a flat BASELINE_DAYS moving average.
     *
     * WAPE (total absolute error / total units sold) is used rather than
     * percentage error because many days sell zero units. Stock-out days
     * are left out of the score, since their true demand is unknown.
     *
     * @param  list<int|null>  $series
     * @return array{actual_units: int, model_error: float, baseline_error: float, wape: float|null, baseline_wape: float|null, bias: float|null, points: list<array{date: string, actual: int, predicted: float, baseline: float}>}|null
     */
    private function backtest(array $series, CarbonImmutable $start): ?array
    {
        $trainingDays = count($series) - self::HOLDOUT_DAYS;

        if ($trainingDays < self::MIN_HISTORY_DAYS) {
            return null;
        }

        $training = array_slice($series, 0, $trainingDays);
        $actual = array_slice($series, $trainingDays);
        $holdoutStart = $start->addDays($trainingDays);
        $knownTraining = array_values(array_filter($training, fn (?int $units) => $units !== null));

        if (count($knownTraining) < self::MIN_HISTORY_DAYS || array_sum($knownTraining) === 0) {
            return null;
        }

        $predicted = DemandModel::fit($training, $start->isoWeekday())->forecast(self::HOLDOUT_DAYS, $holdoutStart->isoWeekday());
        $baseline = $this->mean(array_slice(array_filter($training, fn (?int $units) => $units !== null), -self::BASELINE_DAYS));

        $modelError = 0.0;
        $baselineError = 0.0;
        $signedError = 0.0;
        $points = [];

        foreach ($actual as $offset => $units) {
            if ($units === null) {
                continue;
            }

            $modelError += abs($units - $predicted[$offset]);
            $baselineError += abs($units - $baseline);
            $signedError += $predicted[$offset] - $units;
            $points[] = [
                'date' => $holdoutStart->addDays($offset)->toDateString(),
                'actual' => $units,
                'predicted' => $predicted[$offset],
                'baseline' => $baseline,
            ];
        }

        $actualUnits = array_sum($actual);

        return [
            'actual_units' => $actualUnits,
            'model_error' => $modelError,
            'baseline_error' => $baselineError,
            'wape' => $actualUnits > 0 ? $modelError / $actualUnits : null,
            'baseline_wape' => $actualUnits > 0 ? $baselineError / $actualUnits : null,
            'bias' => $actualUnits > 0 ? $signedError / $actualUnits : null,
            'points' => $points,
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $forecasts
     * @return array{products_evaluated: int, actual_units: int, wape: float|null, baseline_wape: float|null, improvement: float|null}
     */
    private function pooledAccuracy(Collection $forecasts): array
    {
        $evaluated = $forecasts->pluck('accuracy')->filter();
        $actualUnits = (int) $evaluated->sum('actual_units');
        $modelError = (float) $evaluated->sum('model_error');
        $baselineError = (float) $evaluated->sum('baseline_error');

        return [
            'products_evaluated' => $evaluated->count(),
            'actual_units' => $actualUnits,
            'wape' => $actualUnits > 0 ? $modelError / $actualUnits : null,
            'baseline_wape' => $actualUnits > 0 ? $baselineError / $actualUnits : null,
            'improvement' => $baselineError > 0 ? 1 - $modelError / $baselineError : null,
        ];
    }

    /**
     * @param  array<string, mixed>|null  $accuracy
     */
    private function confidence(?array $accuracy, int $historyDays): string
    {
        $wape = $accuracy['wape'] ?? null;

        return match (true) {
            $wape === null => 'low',
            $wape <= 0.35 && $historyDays >= 56 => 'high',
            $wape <= 0.6 => 'medium',
            default => 'low',
        };
    }

    /**
     * Whole days the current stock lasts at the forecast rate, or null if it
     * outlasts the search horizon.
     *
     * @param  list<float>  $daily
     */
    private function daysOfCover(int $stock, array $daily): ?int
    {
        $remaining = (float) $stock;

        foreach ($daily as $offset => $units) {
            $remaining -= $units;

            if ($remaining < 0) {
                return $offset;
            }
        }

        return null;
    }

    /**
     * Units sold per product per shop-local day since $from.
     *
     * @param  list<int>  $productIds
     * @return array<int, array<string, int>>
     */
    private function dailySales(array $productIds, CarbonImmutable $from): array
    {
        if ($productIds === []) {
            return [];
        }

        $rows = SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->whereIn('sale_items.product_id', $productIds)
            ->where('sales.sold_at', '>=', $from->utc())
            // sold_at is stored in UTC; bucket by the shop's calendar day.
            ->selectRaw("sale_items.product_id, to_char((sales.sold_at AT TIME ZONE 'UTC') AT TIME ZONE ?, 'YYYY-MM-DD') as day, sum(sale_items.quantity) as units", [self::SHOP_TIME_ZONE])
            ->groupBy('sale_items.product_id', 'day')
            ->toBase()
            ->get();

        $sales = [];

        foreach ($rows as $row) {
            $sales[$row->product_id][$row->day] = (int) $row->units;
        }

        return $sales;
    }

    /**
     * Shop-local days on which each product had no stock at some point:
     * it started the day empty or a movement took it to zero.
     *
     * @param  list<int>  $productIds
     * @return array<int, array<string, true>>
     */
    private function stockOutDays(array $productIds, CarbonImmutable $from, CarbonImmutable $today): array
    {
        if ($productIds === []) {
            return [];
        }

        $opening = StockMovement::query()
            ->whereIn('product_id', $productIds)
            ->where('occurred_at', '<', $from->utc())
            ->select('product_id', 'balance_after')
            ->distinct('product_id')
            ->orderBy('product_id')
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->toBase()
            ->pluck('balance_after', 'product_id');

        $movements = StockMovement::query()
            ->whereIn('product_id', $productIds)
            ->where('occurred_at', '>=', $from->utc())
            ->orderBy('occurred_at')
            ->orderBy('id')
            ->toBase()
            ->get(['product_id', 'balance_after', 'occurred_at'])
            ->groupBy('product_id');

        $stockOuts = [];

        foreach ($productIds as $productId) {
            // Until its first movement a product's stock is unknown, not empty.
            $balance = isset($opening[$productId]) ? (int) $opening[$productId] : null;
            $byDay = ($movements[$productId] ?? collect())
                ->groupBy(fn (object $movement) => CarbonImmutable::parse($movement->occurred_at, 'UTC')->setTimezone(self::SHOP_TIME_ZONE)->toDateString());

            for ($day = $from; $day->lt($today); $day = $day->addDay()) {
                $date = $day->toDateString();
                $emptied = $balance !== null && $balance <= 0;

                foreach ($byDay[$date] ?? [] as $movement) {
                    $balance = (int) $movement->balance_after;
                    $emptied = $emptied || $balance <= 0;
                }

                if ($emptied) {
                    $stockOuts[$productId][$date] = true;
                }
            }
        }

        return $stockOuts;
    }

    /**
     * @param  list<int>  $productIds
     * @return array<int, int>
     */
    private function quantitiesOnOrder(array $productIds): array
    {
        return PurchaseOrderItem::query()
            ->whereIn('product_id', $productIds)
            ->whereHas('purchaseOrder', fn (Builder $query) => $query->where('status', PurchaseOrderStatus::Ordered))
            ->groupBy('product_id')
            ->selectRaw('product_id, sum(quantity) as quantity')
            ->pluck('quantity', 'product_id')
            ->map(fn ($quantity) => (int) $quantity)
            ->all();
    }

    /**
     * @return array<string, int|float>
     */
    private function settings(): array
    {
        return [
            'history_days' => self::HISTORY_DAYS,
            'holdout_days' => self::HOLDOUT_DAYS,
            'baseline_days' => self::BASELINE_DAYS,
            'review_period_days' => self::REVIEW_PERIOD_DAYS,
            'min_history_days' => self::MIN_HISTORY_DAYS,
            'service_level' => 0.95,
        ];
    }

    /**
     * @param  list<int|float>  $values
     */
    private function mean(array $values): float
    {
        return $values === [] ? 0.0 : array_sum($values) / count($values);
    }
}
