<?php

namespace App\Http\Resources\Dashboard;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DashboardResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'stats' => [
                'active_products' => $this->resource['active_products'],
                'low_stock_count' => $this->resource['low_stock_count'],
                'sales_today' => $this->resource['sales_today'],
                'sales_last_30_days' => $this->resource['sales_last_30_days'],
                'open_purchase_orders' => $this->resource['open_purchase_orders'],
            ],
            'reorder' => $this->resource['reorder'],
            'low_stock_products' => $this->resource['low_stock_products']->map(fn (Product $product) => [
                'id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'stock_on_hand' => $product->stock_on_hand,
                'reorder_level' => $product->reorder_level,
            ]),
        ];
    }
}
