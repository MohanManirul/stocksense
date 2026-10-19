<?php

namespace Tests\Unit\Forecast;

use App\Services\Forecast\DemandModel;
use PHPUnit\Framework\TestCase;

class DemandModelTest extends TestCase
{
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
}
