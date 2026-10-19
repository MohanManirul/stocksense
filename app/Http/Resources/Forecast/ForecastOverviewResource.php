<?php

namespace App\Http\Resources\Forecast;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ForecastOverviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $accuracy = $this->resource['accuracy'];
        $products = $this->resource['products'];

        return [
            'generated_at' => $this->resource['generated_at'],
            'settings' => $this->resource['settings'],
            'stats' => [
                'critical' => $products->where('status', 'critical')->count(),
                'reorder' => $products->where('status', 'reorder')->count(),
                'ok' => $products->where('status', 'ok')->count(),
                'no_data' => $products->where('status', 'no_data')->count(),
            ],
            'accuracy' => [
                'products_evaluated' => $accuracy['products_evaluated'],
                'actual_units' => $accuracy['actual_units'],
                'wape' => $accuracy['wape'] === null ? null : round($accuracy['wape'], 3),
                'baseline_wape' => $accuracy['baseline_wape'] === null ? null : round($accuracy['baseline_wape'], 3),
                'improvement' => $accuracy['improvement'] === null ? null : round($accuracy['improvement'], 3),
            ],
            'products' => ProductForecastResource::collection($products),
        ];
    }
}
