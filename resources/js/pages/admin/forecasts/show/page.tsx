import { Package } from 'lucide-react';
import { useCallback } from 'react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { ButtonLink, Card, CardBody, CardHeader, EmptyState, LoadError, PageSkeleton, ReorderStatusBadge } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { usePermissions } from '@/config/usePermissions';
import { date, percent, qty } from '@/lib/format';
import { getProductForecast } from '../api';
import ConfidenceBadge from '../components/ConfidenceBadge';
import DemandChart from '../components/DemandChart';
import type { ProductForecastDetail, Weekday } from '../types';

const WEEKDAYS: Array<[Weekday, string]> = [
    ['mon', 'Mon'],
    ['tue', 'Tue'],
    ['wed', 'Wed'],
    ['thu', 'Thu'],
    ['fri', 'Fri'],
    ['sat', 'Sat'],
    ['sun', 'Sun'],
];

export default function ShowForecast({ productId }: { productId: number }) {
    const load = useCallback((signal: AbortSignal) => getProductForecast(productId, signal), [productId]);
    const { state, reload } = useApi(load);

    if (state.status === 'loading') {
        return <PageSkeleton />;
    }

    if (state.status === 'error') {
        return <LoadError message={state.message} onRetry={reload} />;
    }

    return <ForecastDetail forecast={state.data} />;
}

function ForecastDetail({ forecast }: { forecast: ProductForecastDetail }) {
    const can = usePermissions();
    const { product } = forecast;

    return (
        <AdminPageLayout
            title={product.name}
            back={{ href: '/admin/forecasts', label: 'Demand forecast' }}
            description={
                <span className="inline-flex flex-wrap items-center gap-2">
                    {product.sku} · {product.supplier?.name ?? 'No supplier'} · {forecast.lead_time_days} day lead time
                    <ReorderStatusBadge status={forecast.status} />
                </span>
            }
            actions={
                can('view products') && (
                    <ButtonLink href={`/admin/products/${product.id}`} variant="secondary" icon={<Package className="size-4" aria-hidden />}>
                        Product
                    </ButtonLink>
                )
            }
        >
            {forecast.status === 'no_data' ? (
                <Card>
                    <EmptyState
                        title="Not enough sales to forecast yet"
                        description={`The model needs at least ${forecast.settings.min_history_days} in-stock days with sales. This product has ${forecast.history_days - forecast.stock_out_days}.`}
                    />
                </Card>
            ) : (
                <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Summary
                            label="Forecast, next 7 days"
                            value={`${qty(forecast.forecast_7_days ?? 0)} units`}
                            hint={`Recent average ${forecast.recent_daily_average.toFixed(1)} / day`}
                        />
                        <Summary
                            label="Stock runs out"
                            value={forecast.days_of_cover === null ? '90+ days' : forecast.days_of_cover === 0 ? 'Today' : date(forecast.stockout_date)}
                            hint={`${qty(product.stock_on_hand)} on hand${forecast.on_order > 0 ? `, ${qty(forecast.on_order)} on order` : ''}`}
                        />
                        <Summary
                            label="Suggested order"
                            value={forecast.suggested_order_quantity > 0 ? `${qty(forecast.suggested_order_quantity)} units` : 'None needed'}
                            hint={`Reorder point ${qty(forecast.reorder_point ?? 0)} · target ${qty(forecast.target_stock ?? 0)}`}
                        />
                        <Card className="p-4">
                            <p className="text-sm text-slate-500">Confidence</p>
                            <div className="mt-1.5">
                                <ConfidenceBadge confidence={forecast.confidence} />
                            </div>
                            <p className="mt-1.5 text-xs text-slate-500">
                                Back-test error {percent(forecast.accuracy?.wape)} vs {percent(forecast.accuracy?.baseline_wape)} for an average
                            </p>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader
                            title="Daily demand"
                            description={`Last 8 weeks of sales, the back-test over the final ${forecast.settings.holdout_days} days, and the next 30 days`}
                        />
                        <CardBody>
                            <DemandChart history={forecast.history} backtest={forecast.backtest} forecast={forecast.forecast} />
                        </CardBody>
                    </Card>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <ReorderBreakdown forecast={forecast} />
                        <WeekdayPattern forecast={forecast} />
                    </div>

                    <BacktestCard forecast={forecast} />
                </div>
            )}
        </AdminPageLayout>
    );
}

function ReorderBreakdown({ forecast }: { forecast: ProductForecastDetail }) {
    const available = forecast.product.stock_on_hand + forecast.on_order;
    const rows: Array<[string, string]> = [
        ['On hand + on order', qty(available)],
        [`Safety stock (${Math.round(forecast.settings.service_level * 100)}% service level)`, qty(forecast.safety_stock ?? 0)],
        [`Reorder point: ${forecast.lead_time_days} days of demand + safety`, qty(forecast.reorder_point ?? 0)],
        [`Target: ${forecast.lead_time_days + forecast.settings.review_period_days} days of demand + safety`, qty(forecast.target_stock ?? 0)],
    ];

    return (
        <Card>
            <CardHeader title="Why this suggestion" description="Order when stock plus open orders falls to the reorder point, then order up to the target." />
            <CardBody>
                <dl className="divide-y divide-slate-100 text-sm">
                    {rows.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 py-2">
                            <dt className="text-slate-600">{label}</dt>
                            <dd className="font-medium text-slate-900 tabular-nums">{value}</dd>
                        </div>
                    ))}
                    <div className="flex justify-between gap-4 py-2">
                        <dt className="font-semibold text-slate-900">Suggested order</dt>
                        <dd className="font-semibold text-slate-900 tabular-nums">
                            {forecast.suggested_order_quantity > 0 ? `${qty(forecast.suggested_order_quantity)} units` : 'None: above the reorder point'}
                        </dd>
                    </div>
                </dl>
                <p className="mt-3 text-xs text-slate-500">
                    The fixed reorder level on the product is {qty(forecast.product.reorder_level)}; the forecast reorder point is{' '}
                    {qty(forecast.reorder_point ?? 0)}.
                </p>
            </CardBody>
        </Card>
    );
}

function WeekdayPattern({ forecast }: { forecast: ProductForecastDetail }) {
    const factors = WEEKDAYS.map(([key, label]) => ({ label, factor: forecast.model?.weekday_factors[key] ?? 1 }));
    const max = Math.max(1.5, ...factors.map((day) => day.factor));

    return (
        <Card>
            <CardHeader title="Weekly pattern the model learned" description="Demand on each weekday relative to an average day (1.00×)." />
            <CardBody>
                <ul className="space-y-2">
                    {factors.map((day) => (
                        <li key={day.label} className="grid grid-cols-[2.5rem_1fr_3rem] items-center gap-3 text-sm">
                            <span className="text-slate-600">{day.label}</span>
                            <span className="relative h-3 rounded-r bg-slate-100" title={`${day.label}: ${day.factor.toFixed(2)}× an average day`}>
                                <span className="absolute inset-y-0 left-0 rounded-r bg-brand-600" style={{ width: `${(day.factor / max) * 100}%` }} />
                                <span className="absolute inset-y-[-3px] w-px bg-slate-500" style={{ left: `${(1 / max) * 100}%` }} aria-hidden />
                            </span>
                            <span className="text-right text-slate-900 tabular-nums">{day.factor.toFixed(2)}×</span>
                        </li>
                    ))}
                </ul>
                {forecast.model && (
                    <p className="mt-4 text-xs text-slate-500">
                        Learned smoothing: level α = {forecast.model.alpha}, trend β = {forecast.model.beta}; typical daily error ±
                        {forecast.model.residual_std_dev.toFixed(1)} units.
                    </p>
                )}
            </CardBody>
        </Card>
    );
}

function BacktestCard({ forecast }: { forecast: ProductForecastDetail }) {
    const accuracy = forecast.accuracy;

    if (!accuracy) {
        return null;
    }

    const better = accuracy.wape !== null && accuracy.baseline_wape !== null && accuracy.wape < accuracy.baseline_wape;
    const predictedTotal = forecast.backtest.reduce((sum, point) => sum + point.predicted, 0);

    return (
        <Card>
            <CardHeader
                title="Back-test"
                description={`Trained without the last ${forecast.settings.holdout_days} days, then asked to predict them.`}
            />
            <CardBody className="grid gap-4 text-sm sm:grid-cols-4">
                <Metric label="Actually sold" value={`${qty(accuracy.actual_units)} units`} />
                <Metric label="Model predicted" value={`${qty(Math.round(predictedTotal))} units`} />
                <Metric label="Model error (WAPE)" value={percent(accuracy.wape)} hint={better ? 'Better than the average' : 'Not better than the average'} />
                <Metric label={`${forecast.settings.baseline_days}-day average error`} value={percent(accuracy.baseline_wape)} hint={`Bias ${percent(accuracy.bias)}`} />
            </CardBody>
        </Card>
    );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div>
            <p className="text-slate-500">{label}</p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">{value}</p>
            {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
    );
}

function Summary({ label, value, hint }: { label: string; value: string; hint: string }) {
    return (
        <Card className="p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 truncate text-xl font-semibold text-slate-900">{value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
        </Card>
    );
}
