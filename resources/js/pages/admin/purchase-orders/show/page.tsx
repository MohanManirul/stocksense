import { Link, router } from '@inertiajs/react';
import { Ban, PackageCheck, Pencil, Send, Trash2 } from 'lucide-react';
import { useCallback } from 'react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { ButtonLink, Card, CardBody, CardHeader, ConfirmButton, LoadError, OrderStatusBadge, PageSkeleton, Table, Tbody, Td, Th } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { usePermissions } from '@/config/usePermissions';
import { date, dateTimeLabel, money, qty } from '@/lib/format';
import { toast } from '@/lib/toast';
import { changePurchaseOrderStatus, deletePurchaseOrder, getPurchaseOrder } from '../api';
import type { PurchaseOrder } from '../types';

export default function ShowPurchaseOrder({ purchaseOrderId }: { purchaseOrderId: number }) {
    const load = useCallback((signal: AbortSignal) => getPurchaseOrder(purchaseOrderId, signal), [purchaseOrderId]);
    const { state, reload } = useApi(load);

    if (state.status === 'loading') {
        return <PageSkeleton />;
    }

    if (state.status === 'error') {
        return <LoadError message={state.message} onRetry={reload} />;
    }

    return <OrderDetail order={state.data} onChange={reload} />;
}

function OrderDetail({ order, onChange }: { order: PurchaseOrder; onChange: () => void }) {
    const can = usePermissions();
    const items = order.items ?? [];
    const units = items.reduce((sum, item) => sum + item.quantity, 0);

    const change = async (action: 'place' | 'receive' | 'cancel', message: string) => {
        await changePurchaseOrderStatus(order.id, action);
        toast.success(message);
        onChange();
    };

    const remove = async () => {
        await deletePurchaseOrder(order.id);
        toast.success(`${order.number} deleted.`);
        router.visit('/admin/purchase-orders');
    };

    return (
        <AdminPageLayout
            title={order.number}
            back={{ href: '/admin/purchase-orders', label: 'Purchase orders' }}
            description={
                <span className="inline-flex flex-wrap items-center gap-2">
                    {order.supplier?.name}
                    <OrderStatusBadge status={order.status} label={order.status_label} />
                </span>
            }
            actions={
                <>
                    {order.status === 'draft' && can('edit purchase orders') && (
                        <>
                            <ButtonLink href={`/admin/purchase-orders/${order.id}/edit`} variant="secondary" icon={<Pencil className="size-4" aria-hidden />}>
                                Edit
                            </ButtonLink>
                            <ConfirmButton
                                onConfirm={() => change('place', `${order.number} placed with ${order.supplier?.name}.`)}
                                title={`Place ${order.number}?`}
                                description="The order can no longer be edited, and its units count as “on order” for each product."
                                confirmLabel="Place order"
                                triggerVariant="primary"
                                icon={<Send className="size-4" aria-hidden />}
                            >
                                Place order
                            </ConfirmButton>
                        </>
                    )}
                    {order.status === 'draft' && can('delete purchase orders') && (
                        <ConfirmButton
                            onConfirm={remove}
                            title={`Delete ${order.number}?`}
                            description="This draft and its items will be removed."
                            confirmLabel="Delete draft"
                            variant="danger"
                            triggerVariant="ghost"
                            icon={<Trash2 className="size-4" aria-hidden />}
                        >
                            Delete
                        </ConfirmButton>
                    )}
                    {order.status === 'ordered' && can('receive purchase orders') && (
                        <ConfirmButton
                            onConfirm={() => change('receive', `${order.number} received. Stock updated.`)}
                            title={`Receive ${order.number}?`}
                            description={`${qty(units)} units will be added to stock and recorded in each product’s stock ledger.`}
                            confirmLabel="Receive into stock"
                            triggerVariant="primary"
                            icon={<PackageCheck className="size-4" aria-hidden />}
                        >
                            Receive
                        </ConfirmButton>
                    )}
                    {(order.status === 'draft' || order.status === 'ordered') && can('edit purchase orders') && (
                        <ConfirmButton
                            onConfirm={() => change('cancel', `${order.number} cancelled.`)}
                            title={`Cancel ${order.number}?`}
                            description={
                                order.status === 'draft'
                                    ? 'The draft is kept for the record but can no longer be placed. Stock is not changed.'
                                    : 'Use this when the supplier won’t deliver. Stock is not changed.'
                            }
                            confirmLabel="Cancel order"
                            variant="danger"
                            triggerVariant="ghost"
                            icon={<Ban className="size-4" aria-hidden />}
                        >
                            Cancel order
                        </ConfirmButton>
                    )}
                </>
            }
        >
            <div className="grid gap-4 sm:grid-cols-3">
                <Summary label="Total" value={money(order.total)} hint={`${qty(units)} units`} />
                <Summary label="Expected delivery" value={date(order.expected_at)} hint={`${order.supplier?.lead_time_days ?? '—'} day lead time`} />
                <Summary label="Created by" value={order.creator?.name ?? '—'} hint={dateTimeLabel(order.created_at)} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3 lg:items-start">
                <Card className="lg:col-span-2">
                    <CardHeader title="Items" />
                    <Table>
                        <thead>
                            <tr>
                                <Th>Product</Th>
                                <Th align="right">Qty</Th>
                                <Th align="right" className="hidden sm:table-cell">
                                    Unit cost
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
                                        <p className="text-xs text-slate-500">
                                            {item.product?.sku} · {qty(item.product?.stock_on_hand ?? 0)} on hand
                                        </p>
                                    </Td>
                                    <Td align="right">{qty(item.quantity)}</Td>
                                    <Td align="right" className="hidden sm:table-cell">
                                        {money(item.unit_cost)}
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
                                    {money(order.total)}
                                </Td>
                            </tr>
                        </tfoot>
                    </Table>
                </Card>

                <Card>
                    <CardHeader title="History" />
                    <CardBody>
                        <ol className="space-y-3 text-sm">
                            <Step label="Draft created" at={order.created_at} by={order.creator?.name} />
                            {order.ordered_at && <Step label="Placed with supplier" at={order.ordered_at} />}
                            {order.received_at && <Step label="Received into stock" at={order.received_at} by={order.receiver?.name} />}
                            {order.cancelled_at && <Step label="Cancelled" at={order.cancelled_at} />}
                        </ol>
                        {order.notes && <p className="mt-4 border-t border-slate-100 pt-4 text-sm whitespace-pre-line text-slate-600">{order.notes}</p>}
                    </CardBody>
                </Card>
            </div>
        </AdminPageLayout>
    );
}

function Step({ label, at, by }: { label: string; at: string; by?: string }) {
    return (
        <li>
            <p className="font-medium text-slate-900">{label}</p>
            <p className="text-xs text-slate-500">
                {dateTimeLabel(at)}
                {by && ` · ${by}`}
            </p>
        </li>
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
