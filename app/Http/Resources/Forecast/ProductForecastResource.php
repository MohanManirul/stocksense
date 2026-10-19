<?php

namespace App\Http\Resources\Forecast;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One product's forecast summary, built from DemandForecastService output.
 */
class ProductForecastResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $product = $this->resource['product'];
        $accuracy = $this->resource['accuracy'];

        return [
            'product' => [
                'id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'stock_on_hand' => $product->stock_on_hand,
                'reorder_level' => $product->reorder_level,
                'supplier' => $product->supplier?->only(['id', 'name']),
            ],
            'status' => $this->resource['status'],
            'confidence' => $this->resource['confidence'],
            'lead_time_days' => $this->resource['lead_time_days'],
            'history_days' => $this->resource['history_days'],
            'stock_out_days' => $this->resource['stock_out_days'],
            'units_sold' => $this->resource['units_sold'],
            'sold_today' => $this->resource['sold_today'],
            'recent_daily_average' => $this->round($this->resource['recent_daily_average']),
            'forecast_daily' => $this->round($this->resource['forecast_daily']),
            'forecast_7_days' => $this->round($this->resource['forecast_7_days'], 0),
            'forecast_30_days' => $this->round($this->resource['forecast_30_days'], 0),
            'on_order' => $this->resource['on_order'],
            'days_of_cover' => $this->resource['days_of_cover'],
            'stockout_date' => $this->resource['stockout_date'],
            'safety_stock' => $this->resource['safety_stock'],
            'reorder_point' => $this->resource['reorder_point'],
            'target_stock' => $this->resource['target_stock'],
            'suggested_order_quantity' => $this->resource['suggested_order_quantity'],
            'accuracy' => $accuracy === null ? null : [
                'actual_units' => $accuracy['actual_units'],
                'wape' => $this->round($accuracy['wape'], 3),
                'baseline_wape' => $this->round($accuracy['baseline_wape'], 3),
                'bias' => $this->round($accuracy['bias'], 3),
            ],
        ];
    }

    protected function round(?float $value, int $precision = 1): ?float
    {
        return $value === null ? null : round($value, $precision);
    }
}
