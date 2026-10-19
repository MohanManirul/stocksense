<?php

namespace Tests\Unit\Forecast;

use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\Forecast\DemandForecastService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemandForecastServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_sales_are_bucketed_by_the_shop_local_day(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-10-20 12:00', 'Asia/Dhaka'));
        $product = $this->productCreated('2026-09-20');

        // 19:30 UTC is 01:30 the next morning in Dhaka.
        $this->sell($product, '2026-10-14 19:30', 3);
        $this->sell($product, '2026-10-15 05:00', 2);

        $history = $this->historyByDate($product);

        $this->assertSame(0, $history['2026-10-14']['units']);
        $this->assertSame(5, $history['2026-10-15']['units']);
    }

    public function test_stock_outs_start_from_the_latest_balance_before_the_window(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-10-20 12:00', 'Asia/Dhaka'));
        $product = $this->productCreated('2026-09-20');

        // Before the 90-day window: empty, then restocked to 10.
        $this->move($product, '2026-07-01 06:00', 0);
        $this->move($product, '2026-07-10 06:00', 10);
        // Inside the window: emptied on Oct 1, restocked on Oct 3.
        $this->move($product, '2026-10-01 06:00', 0);
        $this->move($product, '2026-10-03 06:00', 5);

        $history = $this->historyByDate($product);

        $this->assertTrue($history['2026-09-20']['in_stock']);
        $this->assertFalse($history['2026-10-01']['in_stock']);
        $this->assertFalse($history['2026-10-03']['in_stock']);
        $this->assertTrue($history['2026-10-04']['in_stock']);
    }

    private function productCreated(string $date): Product
    {
        $product = Product::factory()->withStock(5)->create();
        $product->forceFill(['created_at' => CarbonImmutable::parse($date, 'Asia/Dhaka')])->save();

        return $product;
    }

    private function sell(Product $product, string $soldAtUtc, int $quantity): void
    {
        $sale = Sale::create([
            'user_id' => User::factory()->create()->id,
            'total' => $quantity * 10,
            'sold_at' => CarbonImmutable::parse($soldAtUtc, 'UTC'),
        ]);

        SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => $product->id,
            'quantity' => $quantity,
            'unit_price' => 10,
            'line_total' => $quantity * 10,
        ]);
    }

    private function move(Product $product, string $occurredAtUtc, int $balanceAfter): void
    {
        StockMovement::create([
            'product_id' => $product->id,
            'type' => StockMovementType::Adjustment->value,
            'quantity' => 0,
            'balance_after' => $balanceAfter,
            'occurred_at' => CarbonImmutable::parse($occurredAtUtc, 'UTC'),
        ]);
    }

    /**
     * @return array<string, array{date: string, units: int, in_stock: bool}>
     */
    private function historyByDate(Product $product): array
    {
        $forecast = app(DemandForecastService::class)->forecast($product->fresh());

        return collect($forecast['history'])->keyBy('date')->all();
    }
}
