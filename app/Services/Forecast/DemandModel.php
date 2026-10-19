<?php

namespace App\Services\Forecast;

use InvalidArgumentException;

/**
 * A small self-trained demand model: damped-trend exponential smoothing on
 * sales with the weekday pattern removed, then multiplied back by a learned
 * weekday factor.
 *
 * Training picks the smoothing constants (alpha for the level, beta for the
 * trend) from a grid by minimising the one-day-ahead squared error on the
 * history, so each product gets its own fit.
 */
final class DemandModel
{
    /** Candidate smoothing constants for the level. */
    private const ALPHAS = [0.01, 0.02, 0.03, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5];

    /** Candidate smoothing constants for the trend; 0 means "no trend". */
    private const BETAS = [0.0, 0.01, 0.02, 0.05, 0.1];

    /** Days ahead whose total the smoothing constants are tuned to predict. */
    private const HORIZON = 7;

    /** Trend damping, so a short burst of growth is not projected forever. */
    private const PHI = 0.98;

    /**
     * Pulls each weekday factor toward 1.0 as if it had this many extra
     * "average" observations, which keeps short histories from overreacting.
     */
    private const WEEKDAY_SHRINKAGE = 2;

    /**
     * @param  array<int, float>  $weekdayFactors  ISO weekday (1 = Monday) => multiplier, averaging 1.0
     */
    private function __construct(
        public readonly float $level,
        public readonly float $trend,
        public readonly array $weekdayFactors,
        public readonly float $alpha,
        public readonly float $beta,
        public readonly float $residualStdDev,
    ) {}

    /**
     * @param  list<float|int|null>  $series  Units sold per day, oldest first, with zero-sale days included.
     *                                        Null marks a day whose demand is unknown, such as a day the
     *                                        product was out of stock and sales were capped.
     * @param  int  $firstWeekday  ISO weekday of $series[0]
     */
    public static function fit(array $series, int $firstWeekday): self
    {
        $series = array_map(fn ($units) => $units === null ? null : (float) $units, array_values($series));

        if (array_filter($series, fn (?float $units) => $units !== null) === []) {
            throw new InvalidArgumentException('A demand model needs at least one day of known demand.');
        }

        $factors = self::weekdayFactors($series, $firstWeekday);
        $adjusted = [];

        foreach ($series as $day => $units) {
            $adjusted[] = $units === null ? null : $units / $factors[self::weekday($firstWeekday, $day)];
        }

        $best = null;

        foreach (self::ALPHAS as $alpha) {
            foreach (self::BETAS as $beta) {
                $run = self::smooth($adjusted, $alpha, $beta);

                if ($best === null || $run['sse'] < $best['sse']) {
                    $best = $run + ['alpha' => $alpha, 'beta' => $beta];
                }
            }
        }

        // Residuals are measured on the real (re-seasonalised) scale so they
        // can size the safety stock directly in units.
        $residuals = [];

        foreach ($best['predictions'] as $day => $prediction) {
            if ($series[$day] !== null) {
                $residuals[] = $series[$day] - $prediction * $factors[self::weekday($firstWeekday, $day)];
            }
        }

        return new self(
            level: $best['level'],
            trend: $best['trend'],
            weekdayFactors: $factors,
            alpha: $best['alpha'],
            beta: $best['beta'],
            residualStdDev: self::standardDeviation($residuals),
        );
    }

    /**
     * Expected units per day for the next $days days.
     *
     * @param  int  $firstWeekday  ISO weekday of the first forecast day
     * @return list<float>
     */
    public function forecast(int $days, int $firstWeekday): array
    {
        $forecast = [];
        $damping = 0.0;

        for ($day = 0; $day < $days; $day++) {
            $damping += self::PHI ** ($day + 1);
            $base = max(0.0, $this->level + $damping * $this->trend);
            $forecast[] = $base * $this->weekdayFactors[self::weekday($firstWeekday, $day)];
        }

        return $forecast;
    }

    /**
     * Average units sold on each weekday relative to the overall average,
     * shrunk toward 1.0 and rescaled so the seven factors average exactly 1.0.
     *
     * @param  list<float|null>  $series
     * @return array<int, float>
     */
    private static function weekdayFactors(array $series, int $firstWeekday): array
    {
        $known = array_filter($series, fn (?float $units) => $units !== null);
        $mean = array_sum($known) / count($known);

        if ($mean <= 0.0) {
            return array_fill_keys(range(1, 7), 1.0);
        }

        $totals = array_fill_keys(range(1, 7), 0.0);
        $counts = array_fill_keys(range(1, 7), 0);

        foreach ($known as $day => $units) {
            $weekday = self::weekday($firstWeekday, $day);
            $totals[$weekday] += $units;
            $counts[$weekday]++;
        }

        $factors = [];

        foreach ($totals as $weekday => $total) {
            $factors[$weekday] = ($total + self::WEEKDAY_SHRINKAGE * $mean) / (($counts[$weekday] + self::WEEKDAY_SHRINKAGE) * $mean);
        }

        $average = array_sum($factors) / 7;

        return array_map(fn (float $factor) => $factor / $average, $factors);
    }

    /**
     * Runs damped Holt smoothing over the series and records the forecast
     * each day would have received from the days before it. Unknown days
     * are filled with that forecast, so they neither move the level nor
     * count as errors.
     *
     * @param  list<float|null>  $series
     * @return array{level: float, trend: float, sse: float, predictions: list<float>}
     */
    private static function smooth(array $series, float $alpha, float $beta): array
    {
        $start = array_values(array_filter($series, fn (?float $units) => $units !== null));
        $level = array_sum(array_slice($start, 0, 7)) / min(7, count($start));
        $trend = 0.0;
        $sse = 0.0;
        $predictions = [];

        $count = count($series);

        foreach ($series as $day => $units) {
            $prediction = max(0.0, $level + self::PHI * $trend);
            $predictions[] = $prediction;

            // Score the next HORIZON days as one total, the quantity a reorder depends on.
            if ($day + self::HORIZON <= $count) {
                $actual = 0.0;
                $expected = 0.0;
                $damping = 0.0;
                $known = 0;

                for ($ahead = 0; $ahead < self::HORIZON; $ahead++) {
                    $damping += self::PHI ** ($ahead + 1);

                    if ($series[$day + $ahead] !== null) {
                        $actual += $series[$day + $ahead];
                        $expected += max(0.0, $level + $damping * $trend);
                        $known++;
                    }
                }

                if ($known > 0) {
                    $sse += ($actual - $expected) ** 2;
                }
            }

            if ($units === null) {
                $units = $prediction;
            }

            $previousLevel = $level;
            $level = $alpha * $units + (1 - $alpha) * ($level + self::PHI * $trend);
            $trend = $beta * ($level - $previousLevel) + (1 - $beta) * self::PHI * $trend;
        }

        return ['level' => $level, 'trend' => $trend, 'sse' => $sse, 'predictions' => $predictions];
    }

    /**
     * @param  list<float>  $values
     */
    private static function standardDeviation(array $values): float
    {
        $count = count($values);

        if ($count < 2) {
            return 0.0;
        }

        $mean = array_sum($values) / $count;
        $variance = array_sum(array_map(fn (float $value) => ($value - $mean) ** 2, $values)) / ($count - 1);

        return sqrt($variance);
    }

    private static function weekday(int $firstWeekday, int $offset): int
    {
        return (($firstWeekday - 1 + $offset) % 7) + 1;
    }
}
