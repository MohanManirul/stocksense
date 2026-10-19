import { useMemo, useState, type PointerEvent } from 'react';
import { useElementWidth } from '@/config/useElementWidth';
import { dayLabel, weekdayLabel } from '@/lib/format';
import type { BacktestPoint, ForecastPoint, HistoryPoint } from '../types';

/** Series colours; validated together for colour-blind separation and contrast. */
const SOLD = '#2a78d6';
const FORECAST = '#c2410c';
const STOCK_OUT = '#cbd5e1';
const GRID = '#e2e8f0';

const HEIGHT = 260;
const MARGIN = { top: 16, right: 12, bottom: 28, left: 36 };
const HISTORY_SHOWN = 56;

interface Day {
    date: string;
    sold: number | null;
    inStock: boolean;
    predicted: number | null;
    forecast: number | null;
    low: number | null;
    high: number | null;
}

function niceMax(value: number) {
    if (value <= 4) {
        return 4;
    }

    const step = 10 ** Math.floor(Math.log10(value / 4));
    const nice = [1, 2, 2.5, 5, 10].map((multiple) => multiple * step).find((candidate) => candidate * 4 >= value) ?? value;

    return nice * 4;
}

export default function DemandChart({ history, backtest, forecast }: { history: HistoryPoint[]; backtest: BacktestPoint[]; forecast: ForecastPoint[] }) {
    const [ref, width] = useElementWidth<HTMLDivElement>();
    const [hover, setHover] = useState<number | null>(null);

    const days = useMemo<Day[]>(() => {
        const predicted = new Map(backtest.map((point) => [point.date, point.predicted]));
        const past = history.slice(-HISTORY_SHOWN).map((point) => ({
            date: point.date,
            sold: point.units,
            inStock: point.in_stock,
            predicted: predicted.get(point.date) ?? null,
            forecast: null,
            low: null,
            high: null,
        }));
        const future = forecast.map((point) => ({
            date: point.date,
            sold: null,
            inStock: true,
            predicted: null,
            forecast: point.units,
            low: point.low,
            high: point.high,
        }));

        return [...past, ...future];
    }, [history, backtest, forecast]);

    const plotWidth = width - MARGIN.left - MARGIN.right;
    const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
    const slot = plotWidth / Math.max(1, days.length);
    const barWidth = Math.max(1, Math.min(24, slot - 2));
    const yMax = niceMax(Math.max(1, ...days.map((day) => Math.max(day.sold ?? 0, day.high ?? 0, day.predicted ?? 0))));
    const ticks = [0, 1, 2, 3, 4].map((step) => (yMax / 4) * step);
    const firstFuture = days.findIndex((day) => day.forecast !== null);

    const x = (index: number) => MARGIN.left + slot * index + slot / 2;
    const y = (units: number) => MARGIN.top + plotHeight - (units / yMax) * plotHeight;

    const path = (values: Array<number | null>) =>
        values.reduce((d, value, index) => (value === null ? d : `${d}${d === '' || values[index - 1] === null ? 'M' : 'L'}${x(index)},${y(value)}`), '');

    const band = (() => {
        const points = days.map((day, index) => ({ index, low: day.low, high: day.high })).filter((point) => point.low !== null && point.high !== null);

        if (points.length === 0) {
            return '';
        }

        const top = points.map((point) => `${x(point.index)},${y(point.high!)}`).join(' L');
        const bottom = [...points].reverse().map((point) => `${x(point.index)},${y(point.low!)}`).join(' L');

        return `M${top} L${bottom} Z`;
    })();

    const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const index = Math.floor((event.clientX - bounds.left - MARGIN.left) / slot);
        setHover(index >= 0 && index < days.length ? index : null);
    };

    const hovered = hover === null ? null : days[hover];
    const tooltipLeft = hover === null ? 0 : Math.min(Math.max(x(hover) - 80, 0), width - 168);

    return (
        <div>
            <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <LegendItem swatch={<span className="size-2.5 rounded-sm" style={{ background: SOLD }} />}>Units sold</LegendItem>
                <LegendItem swatch={<span className="size-2.5 rounded-sm" style={{ background: STOCK_OUT }} />}>Sold on a stock-out day (demand unknown)</LegendItem>
                <LegendItem swatch={<span className="h-0.5 w-4 rounded" style={{ background: FORECAST }} />}>Forecast</LegendItem>
                <LegendItem swatch={<span className="w-4 border-t-2 border-dashed" style={{ borderColor: FORECAST }} />}>Back-test prediction</LegendItem>
                <LegendItem swatch={<span className="size-2.5 rounded-sm" style={{ background: FORECAST, opacity: 0.15 }} />}>Likely range (80%)</LegendItem>
            </ul>

            <div ref={ref} className="relative">
                <svg
                    width={width}
                    height={HEIGHT}
                    role="img"
                    aria-label="Daily units sold over the last eight weeks and forecast for the next thirty days"
                    onPointerMove={onPointerMove}
                    onPointerLeave={() => setHover(null)}
                    className="block touch-none"
                >
                    {ticks.map((tick) => (
                        <g key={tick}>
                            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth={1} />
                            <text x={MARGIN.left - 6} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-slate-500 text-[11px] tabular-nums">
                                {Number.isInteger(tick) ? tick : tick.toFixed(1)}
                            </text>
                        </g>
                    ))}

                    {days.map((day, index) =>
                        day.sold === null || day.sold === 0 ? null : (
                            <path
                                key={day.date}
                                d={column(x(index) - barWidth / 2, y(day.sold), barWidth, y(0) - y(day.sold))}
                                fill={day.inStock ? SOLD : STOCK_OUT}
                                opacity={hover === null || hover === index ? 1 : 0.55}
                            />
                        ),
                    )}

                    {band && <path d={band} fill={FORECAST} opacity={0.12} />}
                    <path d={path(days.map((day) => day.forecast))} fill="none" stroke={FORECAST} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                    <path
                        d={path(days.map((day) => day.predicted))}
                        fill="none"
                        stroke={FORECAST}
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />

                    {firstFuture > 0 && (
                        <g>
                            <line x1={x(firstFuture) - slot / 2} x2={x(firstFuture) - slot / 2} y1={MARGIN.top} y2={y(0)} stroke="#94a3b8" strokeWidth={1} />
                            <text x={x(firstFuture) - slot / 2 + 4} y={MARGIN.top + 8} className="fill-slate-500 text-[11px]">
                                Today
                            </text>
                        </g>
                    )}

                    {days.map((day, index) =>
                        index % 14 === 0 ? (
                            <text key={day.date} x={x(index)} y={HEIGHT - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">
                                {dayLabel(day.date)}
                            </text>
                        ) : null,
                    )}

                    <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(0)} y2={y(0)} stroke="#94a3b8" strokeWidth={1} />

                    {hovered && hover !== null && (
                        <g pointerEvents="none">
                            <line x1={x(hover)} x2={x(hover)} y1={MARGIN.top} y2={y(0)} stroke="#64748b" strokeWidth={1} />
                            {(hovered.forecast ?? hovered.predicted) !== null && (
                                <circle cx={x(hover)} cy={y((hovered.forecast ?? hovered.predicted)!)} r={4} fill={FORECAST} stroke="#fff" strokeWidth={2} />
                            )}
                        </g>
                    )}
                </svg>

                {hovered && (
                    <div
                        className="pointer-events-none absolute top-2 z-10 w-42 rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200"
                        style={{ left: tooltipLeft }}
                    >
                        <p className="font-medium text-slate-900">
                            {weekdayLabel(hovered.date)} {dayLabel(hovered.date)}
                        </p>
                        {hovered.sold !== null && (
                            <TooltipRow color={hovered.inStock ? SOLD : STOCK_OUT} value={String(hovered.sold)} label={hovered.inStock ? 'sold' : 'sold, ran out'} />
                        )}
                        {hovered.predicted !== null && <TooltipRow color={FORECAST} dashed value={hovered.predicted.toFixed(1)} label="back-test prediction" />}
                        {hovered.forecast !== null && <TooltipRow color={FORECAST} value={hovered.forecast.toFixed(1)} label="forecast" />}
                        {hovered.low !== null && hovered.high !== null && (
                            <p className="mt-0.5 pl-5 text-slate-500">
                                likely {hovered.low.toFixed(0)}–{hovered.high.toFixed(0)}
                            </p>
                        )}
                    </div>
                )}
            </div>

            <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Show as table</summary>
                <div className="mt-2 max-h-72 overflow-auto rounded-lg ring-1 ring-slate-200">
                    <table className="min-w-full text-xs">
                        <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                            <tr>
                                <th className="px-3 py-2 font-semibold">Date</th>
                                <th className="px-3 py-2 text-right font-semibold">Sold</th>
                                <th className="px-3 py-2 text-right font-semibold">Back-test</th>
                                <th className="px-3 py-2 text-right font-semibold">Forecast</th>
                                <th className="px-3 py-2 text-right font-semibold">Likely range</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 tabular-nums">
                            {days.map((day) => (
                                <tr key={day.date}>
                                    <td className="px-3 py-1.5">
                                        {weekdayLabel(day.date)} {dayLabel(day.date)}
                                    </td>
                                    <td className="px-3 py-1.5 text-right">
                                        {day.sold ?? ''}
                                        {!day.inStock && <span className="text-slate-400"> (out of stock)</span>}
                                    </td>
                                    <td className="px-3 py-1.5 text-right">{day.predicted?.toFixed(1) ?? ''}</td>
                                    <td className="px-3 py-1.5 text-right">{day.forecast?.toFixed(1) ?? ''}</td>
                                    <td className="px-3 py-1.5 text-right">{day.low !== null && day.high !== null ? `${day.low.toFixed(0)}–${day.high.toFixed(0)}` : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </div>
    );
}

/** A column with rounded top corners and a square base. */
function column(left: number, top: number, width: number, height: number) {
    const radius = Math.min(4, width / 2, height);

    return `M${left},${top + height} V${top + radius} Q${left},${top} ${left + radius},${top} H${left + width - radius} Q${left + width},${top} ${left + width},${top + radius} V${top + height} Z`;
}

function LegendItem({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
    return (
        <li className="inline-flex items-center gap-1.5">
            {swatch}
            {children}
        </li>
    );
}

function TooltipRow({ color, value, label, dashed = false }: { color: string; value: string; label: string; dashed?: boolean }) {
    return (
        <p className="mt-1 flex items-center gap-2">
            <span className={dashed ? 'w-3 border-t-2 border-dashed' : 'h-0.5 w-3 rounded'} style={dashed ? { borderColor: color } : { background: color }} />
            <span className="font-semibold text-slate-900 tabular-nums">{value}</span>
            <span className="text-slate-500">{label}</span>
        </p>
    );
}
