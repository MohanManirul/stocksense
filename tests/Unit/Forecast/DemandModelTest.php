<?php

namespace Tests\Unit\Forecast;

use App\Services\Forecast\DemandModel;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class DemandModelTest extends TestCase
{
    public function test_steady_demand_is_forecast_at_the_same_rate(): void
    {
        $model = DemandModel::fit(array_fill(0, 56, 10), 1);

        foreach ($model->forecast(14, 1) as $units) {
            $this->assertEqualsWithDelta(10, $units, 0.01);
        }
        $this->assertEqualsWithDelta(0, $model->residualStdDev, 0.01);
    }

    public function test_it_learns_the_weekly_pattern(): void
    {
        // Eight weeks starting on a Monday: Fridays sell 20, other days 10.
        $series = [];
        for ($day = 0; $day < 56; $day++) {
            $series[] = $day % 7 === 4 ? 20 : 10;
        }

        $model = DemandModel::fit($series, 1);
        $nextWeek = $model->forecast(7, 1);

        $this->assertGreaterThan(1.5, $model->weekdayFactors[5]);
        $this->assertGreaterThan($nextWeek[0] * 1.6, $nextWeek[4]);
        $this->assertEqualsWithDelta(array_sum($series) / 8, array_sum($nextWeek), 5);
    }

    public function test_weekday_alignment_follows_the_first_forecast_day(): void
    {
        $series = [];
        for ($day = 0; $day < 56; $day++) {
            $series[] = $day % 7 === 4 ? 20 : 10;
        }

        // Starting the forecast on a Wednesday puts Friday at offset 2.
        $forecast = DemandModel::fit($series, 1)->forecast(7, 3);

        $this->assertSame(2, array_search(max($forecast), $forecast, true));
    }

    public function test_unknown_days_do_not_drag_the_forecast_down(): void
    {
        // Stocked out for the last week: sales were zero because the shelf was empty.
        $series = array_merge(array_fill(0, 49, 10), array_fill(0, 7, null));
        $asZero = array_merge(array_fill(0, 49, 10), array_fill(0, 7, 0));

        $censored = DemandModel::fit($series, 1)->forecast(1, 1)[0];

        $this->assertEqualsWithDelta(10, $censored, 0.5);
        $this->assertLessThan($censored - 0.5, DemandModel::fit($asZero, 1)->forecast(1, 1)[0]);
    }

    public function test_growing_demand_is_forecast_above_the_historical_average(): void
    {
        $series = array_map(fn (int $day) => 5 + $day * 0.2, range(0, 59));

        $forecast = DemandModel::fit($series, 1)->forecast(7, 1);

        $this->assertGreaterThan(array_sum($series) / count($series), $forecast[0]);
        $this->assertGreaterThan(0, DemandModel::fit($series, 1)->trend);
    }

    public function test_forecasts_are_never_negative(): void
    {
        $series = array_map(fn (int $day) => max(0, 30 - $day), range(0, 59));

        foreach (DemandModel::fit($series, 1)->forecast(30, 1) as $units) {
            $this->assertGreaterThanOrEqual(0, $units);
        }
    }

    public function test_it_needs_some_known_demand(): void
    {
        $this->expectException(InvalidArgumentException::class);

        DemandModel::fit([null, null], 1);
    }
}
