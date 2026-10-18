<?php

namespace App\Services\Dashboard;

use App\Enums\PurchaseOrderStatus;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Sale;
use Illuminate\Database\Eloquent\Builder;

final class DashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(): array
    {
        return [
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
     * @return Builder<Product>
     */
    private function lowStock(): Builder
    {
        return Product::where('is_active', true)->whereColumn('stock_on_hand', '<=', 'reorder_level');
    }
}
