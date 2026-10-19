<?php

namespace App\Services\Dashboard;

use App\Enums\PurchaseOrderStatus;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Sale;
use App\Models\User;
use App\Services\Forecast\DemandForecastService;
use Illuminate\Database\Eloquent\Builder;

final class DashboardService
{
    public function __construct(
        private readonly DemandForecastService $forecastService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function summary(User $user): array
    {
        return [
            'reorder' => $user->can('view forecasts') ? $this->reorder() : null,
            'active_products' => Product::where('is_active', true)->count(),
            'low_stock_count' => $this->lowStock()->count(),
            'sales_today' => (float) Sale::where('sold_at', '>=', now()->startOfDay())->sum('total'),
            'sales_last_30_days' => (float) Sale::where('sold_at', '>=', now()->subDays(29)->startOfDay())->sum('total'),
            'open_purchase_orders' => PurchaseOrder::where('status', PurchaseOrderStatus::Ordered)->count(),
            'low_stock_products' => $this->lowStock()
                ->orderBy('stock_on_hand')
                ->limit(5)
                ->get(['id', 'sku', 'name', 'stock_on_hand', 'reorder_level']),
        ];
    }

    /**
     * How many products the demand forecast says to reorder now.
     *
     * @return array{needs_reorder: int, critical: int}
     */
    private function reorder(): array
    {
        $products = $this->forecastService->overview()['products'];

        return [
            'needs_reorder' => $products->where('suggested_order_quantity', '>', 0)->count(),
            'critical' => $products->where('status', 'critical')->count(),
        ];
    }

    /**
     * @return Builder<Product>
     */
    private function lowStock(): Builder
    {
        return Product::where('is_active', true)->whereColumn('stock_on_hand', '<=', 'reorder_level');
    }
}
