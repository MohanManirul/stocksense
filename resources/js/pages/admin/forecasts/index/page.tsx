import { Link } from '@inertiajs/react';
import { CircleAlert, Gauge, PackageCheck, TrendingUp, TriangleAlert, type LucideIcon } from 'lucide-react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { Card, CardHeader, EmptyState, LoadError, PageSkeleton, ReorderStatusBadge, Table, Tbody, Td, Th } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { date, dateTimeLabel, percent, qty } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getForecasts } from '../api';
import ConfidenceBadge from '../components/ConfidenceBadge';
import HowItWorks from '../components/HowItWorks';
import type { ForecastOverview, ProductForecast } from '../types';

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: LucideIcon }) {
    return (
        <Card className="flex items-center gap-4 p-4 sm:p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="truncate text-xl font-semibold text-slate-900">{value}</p>
                {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
            </div>
        </Card>
    );
}

export default function Forecasts() {
    const { state, reload } = useApi(getForecasts);

    return (
        <AdminPageLayout title="Demand forecast" description="Predicted sales per product and what to reorder before it runs out.">
            {state.status === 'loading' && <PageSkeleton />}

            {state.status === 'error' && <LoadError message={state.message} onRetry={reload} />}

            {state.status === 'success' && <Overview overview={state.data} />}
        </AdminPageLayout>
    );
}

function Overview({ overview }: { overview: ForecastOverview }) {
    const { stats, accuracy, products } = overview;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Order now" value={qty(stats.critical)} hint="Will run out before a new order arrives" icon={CircleAlert} />
                <StatCard label="Reorder soon" value={qty(stats.reorder)} hint="At or below the forecast reorder point" icon={TriangleAlert} />
                <StatCard
                    label="Forecast error (WAPE)"
                    value={percent(accuracy.wape)}
                    hint={`vs ${percent(accuracy.baseline_wape)} for a ${overview.settings.baseline_days}-day average`}
                    icon={Gauge}
                />
                <StatCard
                    label="Error reduction"
                    value={percent(accuracy.improvement)}
                    hint={`Back-tested on ${qty(accuracy.actual_units)} units, ${accuracy.products_evaluated} products`}
                    icon={TrendingUp}
                />
            </div>

            <Card>
                <CardHeader
                    title="Reorder suggestions"
                    description={`Most urgent first · updated ${dateTimeLabel(overview.generated_at)}`}
                />
                {products.length === 0 ? (
                    <EmptyState icon={<PackageCheck className="size-5" aria-hidden />} title="No active products" description="Add products and record sales to see a forecast." />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Product</Th>
                                <Th>Status</Th>
                                <Th align="right">Forecast / day</Th>
                                <Th align="right">On hand</Th>
                                <Th align="right">On order</Th>
                                <Th>Runs out</Th>
                                <Th align="right">Suggested order</Th>
                                <Th>Confidence</Th>
                            </tr>
                        </thead>
                        <Tbody>
                            {products.map((forecast) => (
                                <ForecastRow key={forecast.product.id} forecast={forecast} />
                            ))}
                        </Tbody>
                    </Table>
                )}
            </Card>

            <HowItWorks settings={overview.settings} />
        </div>
    );
}

function ForecastRow({ forecast }: { forecast: ProductForecast }) {
    const { product } = forecast;
    const runsOutSoon = forecast.days_of_cover !== null && forecast.days_of_cover < forecast.lead_time_days;

    return (
        <tr>
            <Td className="font-medium text-slate-900">
                <Link href={`/admin/forecasts/${product.id}`} className="hover:underline">
                    {product.name}
                </Link>
                <p className="text-xs font-normal text-slate-500">
                    {product.sku} · {forecast.lead_time_days} day lead time
                </p>
            </Td>
            <Td>
                <ReorderStatusBadge status={forecast.status} />
            </Td>
            <Td align="right">{forecast.forecast_daily === null ? '—' : forecast.forecast_daily.toFixed(1)}</Td>
            <Td align="right">{qty(product.stock_on_hand)}</Td>
            <Td align="right">{forecast.on_order > 0 ? qty(forecast.on_order) : '—'}</Td>
            <Td className={cn('whitespace-nowrap', runsOutSoon && 'font-medium text-red-700')}>
                {forecast.status === 'no_data' ? (
                    '—'
                ) : forecast.days_of_cover === null ? (
                    'Not within 90 days'
                ) : (
                    <>
                        {forecast.days_of_cover === 0 ? 'Today' : date(forecast.stockout_date)}
                        <span className="block text-xs font-normal text-slate-500">
                            {forecast.days_of_cover === 0 ? 'Out of stock or about to be' : `in ${forecast.days_of_cover} days`}
                        </span>
                    </>
                )}
            </Td>
            <Td align="right" className="font-semibold text-slate-900">
                {forecast.suggested_order_quantity > 0 ? qty(forecast.suggested_order_quantity) : <span className="font-normal text-slate-400">—</span>}
            </Td>
            <Td>
                <ConfidenceBadge confidence={forecast.confidence} />
            </Td>
        </tr>
    );
}
