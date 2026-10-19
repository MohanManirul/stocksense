import { Link } from '@inertiajs/react';
import { ArrowRight, PackageCheck, ShoppingCart, TrendingUp, Truck, TriangleAlert, type LucideIcon } from 'lucide-react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { Card, CardHeader, EmptyState, LoadError, PageSkeleton, Table, Tbody, Td, Th } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { money, qty } from '@/lib/format';
import { getDashboard } from './api';

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
    return (
        <Card className="flex items-center gap-4 p-4 sm:p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="truncate text-xl font-semibold text-slate-900">{value}</p>
            </div>
        </Card>
    );
}

export default function Dashboard() {
    const { state, reload } = useApi(getDashboard);

    return (
        <AdminPageLayout title="Dashboard" description="Today’s stock and sales at a glance.">
            {state.status === 'loading' && <PageSkeleton />}

            {state.status === 'error' && <LoadError message={state.message} onRetry={reload} />}

            {state.status === 'success' && (
                <div className="space-y-6">
                    {state.data.reorder && state.data.reorder.needs_reorder > 0 && (
                        <Link
                            href="/admin/forecasts"
                            className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
                        >
                            <TrendingUp className="size-5 shrink-0 text-amber-700" aria-hidden />
                            <span className="flex-1">
                                <strong className="font-semibold">
                                    {qty(state.data.reorder.needs_reorder)} {state.data.reorder.needs_reorder === 1 ? 'product' : 'products'}
                                </strong>{' '}
                                should be reordered based on the demand forecast
                                {state.data.reorder.critical > 0 && <>, {qty(state.data.reorder.critical)} of them will likely run out before a new delivery arrives</>}.
                            </span>
                            <ArrowRight className="size-4 shrink-0" aria-hidden />
                        </Link>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard label="Sales today" value={money(state.data.stats.sales_today)} icon={ShoppingCart} />
                        <StatCard label="Sales, last 30 days" value={money(state.data.stats.sales_last_30_days)} icon={ShoppingCart} />
                        <StatCard label="Active products" value={qty(state.data.stats.active_products)} icon={PackageCheck} />
                        <StatCard label="Open purchase orders" value={qty(state.data.stats.open_purchase_orders)} icon={Truck} />
                    </div>

                    <Card>
                        <CardHeader title="Low stock" description={`${qty(state.data.stats.low_stock_count)} products at or below their reorder level`} />
                        {state.data.low_stock_products.length === 0 ? (
                            <EmptyState icon={<PackageCheck className="size-5" aria-hidden />} title="Stock looks healthy" description="No active product is at or below its reorder level." />
                        ) : (
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>Product</Th>
                                        <Th>SKU</Th>
                                        <Th align="right">On hand</Th>
                                        <Th align="right">Reorder level</Th>
                                    </tr>
                                </thead>
                                <Tbody>
                                    {state.data.low_stock_products.map((product) => (
                                        <tr key={product.id}>
                                            <Td className="font-medium text-slate-900">
                                                <Link href={`/admin/products/${product.id}`} className="inline-flex items-center gap-2 hover:underline">
                                                    <TriangleAlert className="size-4 text-amber-500" aria-hidden />
                                                    {product.name}
                                                </Link>
                                            </Td>
                                            <Td className="text-slate-500">{product.sku}</Td>
                                            <Td align="right">{qty(product.stock_on_hand)}</Td>
                                            <Td align="right">{qty(product.reorder_level)}</Td>
                                        </tr>
                                    ))}
                                </Tbody>
                            </Table>
                        )}
                    </Card>
                </div>
            )}
        </AdminPageLayout>
    );
}
