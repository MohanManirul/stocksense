import { Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useCallback } from 'react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { ButtonLink, Card, CardBody, CardHeader, LoadError, PageSkeleton, Table, Tbody, Td, Th } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { usePermissions } from '@/config/usePermissions';
import { dateTimeLabel, money, qty } from '@/lib/format';
import { getSale } from '../api';
import type { Sale } from '../types';

export default function ShowSale({ saleId }: { saleId: number }) {
    const load = useCallback((signal: AbortSignal) => getSale(saleId, signal), [saleId]);
    const { state, reload } = useApi(load);

    if (state.status === 'loading') {
        return <PageSkeleton />;
    }

    if (state.status === 'error') {
        return <LoadError message={state.message} onRetry={reload} />;
    }

    return <SaleDetail sale={state.data} />;
}

function SaleDetail({ sale }: { sale: Sale }) {
    const can = usePermissions();
    const items = sale.items ?? [];
    const units = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <AdminPageLayout
            title={`Sale ${sale.number}`}
            back={{ href: '/admin/sales', label: 'Sales' }}
            description={`${dateTimeLabel(sale.sold_at)} · sold by ${sale.user?.name ?? '—'}`}
            actions={
                can('create sales') && (
                    <ButtonLink href="/admin/sales/create" variant="secondary" icon={<Plus className="size-4" aria-hidden />}>
                        New sale
                    </ButtonLink>
                )
            }
        >
            <div className="grid gap-4 sm:grid-cols-3">
                <Summary label="Total" value={money(sale.total)} />
                <Summary label="Units sold" value={qty(units)} hint={`${items.length} ${items.length === 1 ? 'product' : 'products'}`} />
                <Summary label="Customer" value={sale.customer_name ?? 'Walk-in'} />
            </div>

            <Card className="mt-6">
                <CardHeader title="Items" />
                <Table>
                    <thead>
                        <tr>
                            <Th>Product</Th>
                            <Th align="right">Qty</Th>
                            <Th align="right" className="hidden sm:table-cell">
                                Unit price
                            </Th>
                            <Th align="right">Amount</Th>
                        </tr>
                    </thead>
                    <Tbody>
                        {items.map((item) => (
                            <tr key={item.id}>
                                <Td>
                                    {can('view products') ? (
                                        <Link href={`/admin/products/${item.product_id}`} className="font-medium text-slate-900 hover:underline">
                                            {item.product?.name}
                                        </Link>
                                    ) : (
                                        <span className="font-medium text-slate-900">{item.product?.name}</span>
                                    )}
                                    <p className="text-xs text-slate-500">{item.product?.sku}</p>
                                </Td>
                                <Td align="right">{qty(item.quantity)}</Td>
                                <Td align="right" className="hidden sm:table-cell">
                                    {money(item.unit_price)}
                                </Td>
                                <Td align="right" className="font-medium text-slate-900">
                                    {money(item.line_total)}
                                </Td>
                            </tr>
                        ))}
                    </Tbody>
                    <tfoot>
                        <tr className="border-t border-slate-200">
                            <Td className="font-semibold text-slate-900">Total</Td>
                            <Td />
                            <Td className="hidden sm:table-cell" />
                            <Td align="right" className="font-semibold text-slate-900">
                                {money(sale.total)}
                            </Td>
                        </tr>
                    </tfoot>
                </Table>
            </Card>

            {sale.notes && (
                <Card className="mt-6">
                    <CardBody>
                        <p className="text-sm whitespace-pre-line text-slate-600">{sale.notes}</p>
                    </CardBody>
                </Card>
            )}
        </AdminPageLayout>
    );
}

function Summary({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <Card className="p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 truncate text-xl font-semibold text-slate-900">{value}</p>
            {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
        </Card>
    );
}
