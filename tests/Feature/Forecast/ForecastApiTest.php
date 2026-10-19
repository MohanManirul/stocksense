<?php

namespace Tests\Feature\Forecast;

use App\Enums\PurchaseOrderStatus;
use App\Enums\StockMovementType;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ForecastApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        // Noon in Dhaka (UTC+6).
        $this->travelTo(CarbonImmutable::parse('2026-10-20 06:00:00', 'UTC'));
        $this->admin = User::factory()->withRole('admin')->create();
    }

    /**
     * Records $units sold on each of the last $days shop days (yesterday back).
     *
     * @param  callable(CarbonImmutable): int|int  $units
     */
    private function sellDaily(Product $product, int $days, callable|int $units): void
    {
        $today = CarbonImmutable::now('Asia/Dhaka')->startOfDay();

        for ($ago = $days; $ago >= 1; $ago--) {
            $day = $today->subDays($ago);
            $quantity = is_int($units) ? $units : $units($day);

            if ($quantity === 0) {
                continue;
            }

            $sale = Sale::create(['user_id' => $this->admin->id, 'total' => 0, 'sold_at' => $day->addHours(15)->utc()]);
            $sale->items()->create(['product_id' => $product->id, 'quantity' => $quantity, 'unit_price' => 1, 'line_total' => $quantity]);
        }
    }

    private function product(int $stock, int $leadTime = 5): Product
    {
        return Product::factory()
            ->withStock($stock)
            ->for(Supplier::factory()->state(['lead_time_days' => $leadTime]))
            ->create();
    }

    public function test_forecasts_need_the_view_forecasts_permission(): void
    {
        $product = $this->product(10);

        $this->getJson('/v1/admin/forecasts')->assertUnauthorized();

        $this->actingAs(User::factory()->withRole('staff')->create());
        $this->getJson('/v1/admin/forecasts')->assertForbidden();
        $this->getJson("/v1/admin/forecasts/{$product->id}")->assertForbidden();
        $this->get('/admin/forecasts')->assertForbidden();
    }

    public function test_admin_can_open_forecast_pages(): void
    {
        $product = $this->product(10);
        $this->actingAs($this->admin);

        $this->get('/admin/forecasts')->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/forecasts/index/page'));
        $this->get("/admin/forecasts/{$product->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('admin/forecasts/show/page')->where('productId', $product->id));
    }

    public function test_overview_suggests_reorders_most_urgent_first(): void
    {
        $running = $this->product(stock: 50, leadTime: 5);
        $empty = $this->product(stock: 3, leadTime: 5);
        $plenty = $this->product(stock: 500, leadTime: 5);
        $unsold = $this->product(stock: 20);

        $this->sellDaily($running, 60, 10);
        $this->sellDaily($empty, 60, 10);
        $this->sellDaily($plenty, 60, 10);
        $this->actingAs($this->admin);

        $response = $this->getJson('/v1/admin/forecasts')
            ->assertOk()
            ->assertJsonPath('data.stats', ['critical' => 1, 'reorder' => 1, 'ok' => 1, 'no_data' => 1])
            ->assertJsonPath('data.accuracy.products_evaluated', 3);

        $products = collect($response->json('data.products'))->keyBy('product.id');

        $this->assertSame([$empty->id, $running->id, $plenty->id, $unsold->id], collect($response->json('data.products'))->pluck('product.id')->all());

        // Steady sales of 10 a day with no noise, so no safety stock: the reorder
        // point is 5 days' lead time (50 units), the target 5 + 7 review days (120).
        $this->assertSame('reorder', $products[$running->id]['status']);
        $this->assertEqualsWithDelta(10, $products[$running->id]['forecast_daily'], 0.5);
        $this->assertSame(50, $products[$running->id]['reorder_point']);
        $this->assertSame(120, $products[$running->id]['target_stock']);
        $this->assertSame(70, $products[$running->id]['suggested_order_quantity']);
        $this->assertSame(5, $products[$running->id]['days_of_cover']);
        $this->assertSame('2026-10-25', $products[$running->id]['stockout_date']);
        $this->assertSame('high', $products[$running->id]['confidence']);

        $this->assertSame('critical', $products[$empty->id]['status']);
        $this->assertSame(117, $products[$empty->id]['suggested_order_quantity']);

        $this->assertSame('ok', $products[$plenty->id]['status']);
        $this->assertSame(0, $products[$plenty->id]['suggested_order_quantity']);

        $this->assertSame('no_data', $products[$unsold->id]['status']);
        $this->assertNull($products[$unsold->id]['forecast_daily']);
    }

    public function test_dashboard_shows_reorder_counts_to_users_who_can_view_forecasts(): void
    {
        $this->sellDaily($this->product(stock: 50, leadTime: 5), 60, 10);
        $this->sellDaily($this->product(stock: 3, leadTime: 5), 60, 10);
        $this->sellDaily($this->product(stock: 500, leadTime: 5), 60, 10);

        $this->actingAs($this->admin)
            ->getJson('/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.reorder', ['needs_reorder' => 2, 'critical' => 1]);

        $this->actingAs(User::factory()->withRole('staff')->create())
            ->getJson('/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.reorder', null);
    }

    public function test_open_purchase_orders_count_toward_available_stock(): void
    {
        $product = $this->product(stock: 30, leadTime: 5);
        $this->sellDaily($product, 60, 10);

        $order = PurchaseOrder::create(['supplier_id' => $product->supplier_id, 'created_by' => $this->admin->id, 'total' => 0]);
        $order->items()->create(['product_id' => $product->id, 'quantity' => 100, 'unit_cost' => 1, 'line_total' => 100]);
        $order->forceFill(['status' => PurchaseOrderStatus::Ordered])->save();
        $this->actingAs($this->admin);

        $this->getJson('/v1/admin/forecasts')
            ->assertJsonPath('data.products.0.on_order', 100)
            ->assertJsonPath('data.products.0.status', 'ok')
            ->assertJsonPath('data.products.0.suggested_order_quantity', 0);
    }

    public function test_detail_learns_the_weekly_pattern_and_backtests_it(): void
    {
        $product = $this->product(stock: 200);
        // Fridays sell three times as much as other days.
        $this->sellDaily($product, 70, fn (CarbonImmutable $day) => $day->isFriday() ? 15 : 5);
        $this->actingAs($this->admin);

        $response = $this->getJson("/v1/admin/forecasts/{$product->id}")
            ->assertOk()
            ->assertJsonCount(70, 'data.history')
            ->assertJsonCount(14, 'data.backtest')
            ->assertJsonCount(30, 'data.forecast')
            ->assertJsonPath('data.forecast.0.date', '2026-10-20')
            ->assertJsonPath('data.settings.holdout_days', 14);

        $this->assertGreaterThan(2, $response->json('data.model.weekday_factors.fri'));

        // 23 October 2026 is a Friday, three days after today.
        $forecast = collect($response->json('data.forecast'));
        $this->assertGreaterThan($forecast[2]['units'] * 2, $forecast[3]['units']);

        // A pattern this regular is predicted almost exactly, and far better than a flat average.
        $this->assertLessThan(0.1, $response->json('data.accuracy.wape'));
        $this->assertGreaterThan(0.3, $response->json('data.accuracy.baseline_wape'));
    }

    public function test_stock_out_days_are_treated_as_unknown_demand(): void
    {
        $product = $this->product(stock: 100);
        $today = CarbonImmutable::now('Asia/Dhaka')->startOfDay();
        // Sells 10 a day, but ran dry for the last 5 days and sold nothing.
        $this->sellDaily($product, 40, fn (CarbonImmutable $day) => $day->gte($today->subDays(5)) ? 0 : 10);
        $product->stockMovements()->create([
            'type' => StockMovementType::Sale,
            'quantity' => -10,
            'balance_after' => 0,
            'occurred_at' => $today->subDays(5)->addHours(15)->utc(),
        ]);
        $product->stockMovements()->create([
            'type' => StockMovementType::Purchase,
            'quantity' => 100,
            'balance_after' => 100,
            'occurred_at' => $today->addHours(9)->utc(),
        ]);
        $this->actingAs($this->admin);

        $response = $this->getJson("/v1/admin/forecasts/{$product->id}")
            ->assertOk()
            ->assertJsonPath('data.stock_out_days', 5)
            ->assertJsonPath('data.history.35.in_stock', false)
            ->assertJsonPath('data.history.34.in_stock', true);

        $this->assertEqualsWithDelta(10, $response->json('data.forecast_daily'), 0.5);
    }
}
