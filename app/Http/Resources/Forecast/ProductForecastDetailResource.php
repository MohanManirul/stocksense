<?php

namespace App\Http\Resources\Forecast;

use App\Services\Forecast\DemandModel;
use Illuminate\Http\Request;

/**
 * A product forecast with the daily history, back-test and forecast series
 * behind it, plus the parameters the model learned.
 */
class ProductForecastDetailResource extends ProductForecastResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var DemandModel|null $model */
        $model = $this->resource['model'];

        return parent::toArray($request) + [
            'model' => $model === null ? null : [
                'alpha' => $model->alpha,
                'beta' => $model->beta,
                'level' => round($model->level, 2),
                'trend' => round($model->trend, 3),
                'residual_std_dev' => round($model->residualStdDev, 2),
                // Named keys: JsonResource re-indexes arrays whose keys are all numeric.
                'weekday_factors' => array_combine(
                    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
                    array_map(fn (float $factor) => round($factor, 2), array_values($model->weekdayFactors)),
                ),
            ],
            'history' => $this->resource['history'],
            'backtest' => array_map(fn (array $point) => [
                'date' => $point['date'],
                'actual' => $point['actual'],
                'predicted' => round($point['predicted'], 2),
                'baseline' => round($point['baseline'], 2),
            ], $this->resource['backtest']),
            'forecast' => array_map(fn (array $point) => [
                'date' => $point['date'],
                'units' => round($point['units'], 2),
                'low' => round($point['low'], 2),
                'high' => round($point['high'], 2),
            ], $this->resource['forecast']),
            'settings' => $this->resource['settings'],
        ];
    }
}
