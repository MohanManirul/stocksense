import { Link } from '@inertiajs/react';
import { ClipboardList, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { ButtonLink, Card, EmptyState, Input, LoadError, OrderStatusBadge, Pagination, Select, Table, TableSkeleton, Tbody, Td, Th } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { usePermissions } from '@/config/usePermissions';
import { useQueryParams } from '@/config/useQueryParams';
import { date, money, qty } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getPurchaseOrderOptions, getPurchaseOrders } from '../api';

export default function PurchaseOrders() {
    const can = usePermissions();
    const [params, setParams] = useQueryParams();
    const [search, setSearch] = useState(params.search ?? '');
    const options = useApi(getPurchaseOrderOptions);
    const load = useCallback(
        (signal: AbortSignal) => getPurchaseOrders({ search: params.search, status: params.status, supplier: params.supplier, page: params.page }, signal),
        [params.search, params.status, params.supplier, params.page],
    );
    const { state, reload, refreshing } = useApi(load);
    const filtered = Boolean(params.search || params.status || params.supplier);

    useEffect(() => {
        if (search === (params.search ?? '')) {
            return;
        }

        const timer = window.setTimeout(() => setParams({ search, page: undefined }), 300);

        return () => window.clearTimeout(timer);
    }, [search]);

    return (
        <AdminPageLayout
            title="Purchase orders"
            description="Stock you order from suppliers. Receiving an order adds it to stock."
            actions={
                can('create purchase orders') && (
                    <ButtonLink href="/admin/purchase-orders/create" icon={<Plus className="size-4" aria-hidden />}>
                        New purchase order
                    </ButtonLink>
                )
            }
        >
            <Card>
                <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
                    <div className="relative sm:col-span-2">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                        <Input
                            type="search"
                            placeholder="Search by PO number or supplier"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="pl-9"
                            aria-label="Search purchase orders"
                        />
                    </div>
                    <Select value={params.status ?? ''} onChange={(event) => setParams({ status: event.target.value, page: undefined })} aria-label="Filter by status">
                        <option value="">Any status</option>
                        <option value="draft">Draft</option>
                        <option value="ordered">Ordered</option>
                        <option value="received">Received</option>
                        <option value="cancelled">Cancelled</option>
                    </Select>
                    <Select value={params.supplier ?? ''} onChange={(event) => setParams({ supplier: event.target.value, page: undefined })} aria-label="Filter by supplier">
                        <option value="">All suppliers</option>
                        {options.state.status === 'success' &&
                            options.state.data.suppliers.map((supplier) => (
                                <option key={supplier.id} value={supplier.id}>
                                    {supplier.name}
                                </option>
                            ))}
                    </Select>
                </div>

                {state.status === 'loading' && <TableSkeleton />}

                {state.status === 'error' && (
                    <div className="p-4 sm:px-5">
                        <LoadError message={state.message} onRetry={reload} />
                    </div>
                )}

                {state.status === 'success' &&
                    (state.data.data.length === 0 ? (
                        <EmptyState
                            icon={<ClipboardList className="size-5" />}
                            title="No purchase orders found"
                            description={filtered ? 'Try a different search or clear the filters.' : 'Create a purchase order when stock runs low.'}
                        />
                    ) : (
                        <div className={cn('transition-opacity', refreshing && 'opacity-60')}>
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>Order</Th>
                                        <Th className="hidden md:table-cell">Supplier</Th>
                                        <Th align="right" className="hidden sm:table-cell">
                                            Items
                                        </Th>
                                        <Th className="hidden lg:table-cell">Expected</Th>
                                        <Th align="right">Total</Th>
                                        <Th>Status</Th>
                                    </tr>
                                </thead>
                                <Tbody>
                                    {state.data.data.map((order) => (
                                        <tr key={order.id} className="hover:bg-slate-50">
                                            <Td>
                                                <Link href={`/admin/purchase-orders/${order.id}`} className="font-medium text-slate-900 hover:underline">
                                                    {order.number}
                                                </Link>
                                                <p className="text-xs text-slate-500 md:hidden">{order.supplier?.name}</p>
                                            </Td>
                                            <Td className="hidden md:table-cell">{order.supplier?.name}</Td>
                                            <Td align="right" className="hidden sm:table-cell">
                                                {qty(order.items_count ?? 0)}
                                            </Td>
                                            <Td className="hidden whitespace-nowrap lg:table-cell">{date(order.expected_at)}</Td>
                                            <Td align="right" className="font-medium text-slate-900">
                                                {money(order.total)}
                                            </Td>
                                            <Td>
                                                <OrderStatusBadge status={order.status} label={order.status_label} />
                                            </Td>
                                        </tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </div>
                    ))}

                {state.status === 'success' && <Pagination meta={state.data.meta} onPageChange={(page) => setParams({ page: String(page) })} />}
            </Card>
        </AdminPageLayout>
    );
}
