import { Link } from '@inertiajs/react';
import { Plus, Search, ShoppingCart } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { ButtonLink, Card, EmptyState, Input, LoadError, Pagination, Table, TableSkeleton, Tbody, Td, Th } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { usePermissions } from '@/config/usePermissions';
import { useQueryParams } from '@/config/useQueryParams';
import { dateTimeLabel, money, qty } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getSales } from '../api';

export default function Sales() {
    const can = usePermissions();
    const [params, setParams] = useQueryParams();
    const [search, setSearch] = useState(params.search ?? '');
    const load = useCallback(
        (signal: AbortSignal) => getSales({ search: params.search, from: params.from, to: params.to, page: params.page }, signal),
        [params.search, params.from, params.to, params.page],
    );
    const { state, reload, refreshing } = useApi(load);
    const filtered = Boolean(params.search || params.from || params.to);

    useEffect(() => {
        if (search === (params.search ?? '')) {
            return;
        }

        const timer = window.setTimeout(() => setParams({ search, page: undefined }), 300);

        return () => window.clearTimeout(timer);
    }, [search]);

    return (
        <AdminPageLayout
            title="Sales"
            description="Every sale recorded at the counter, newest first."
            actions={
                can('create sales') && (
                    <ButtonLink href="/admin/sales/create" icon={<Plus className="size-4" aria-hidden />}>
                        New sale
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
                            placeholder="Search by sale number or customer"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="pl-9"
                            aria-label="Search sales"
                        />
                    </div>
                    <Input
                        type="date"
                        value={params.from ?? ''}
                        max={params.to}
                        onChange={(event) => setParams({ from: event.target.value, page: undefined })}
                        aria-label="Sold from"
                    />
                    <Input
                        type="date"
                        value={params.to ?? ''}
                        min={params.from}
                        onChange={(event) => setParams({ to: event.target.value, page: undefined })}
                        aria-label="Sold until"
                    />
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
                            icon={<ShoppingCart className="size-5" />}
                            title="No sales found"
                            description={filtered ? 'Try a different search or date range.' : 'Sales you record will appear here.'}
                        />
                    ) : (
                        <div className={cn('transition-opacity', refreshing && 'opacity-60')}>
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>Sale</Th>
                                        <Th className="hidden md:table-cell">Customer</Th>
                                        <Th align="right" className="hidden sm:table-cell">
                                            Items
                                        </Th>
                                        <Th className="hidden lg:table-cell">Sold by</Th>
                                        <Th align="right">Total</Th>
                                    </tr>
                                </thead>
                                <Tbody>
                                    {state.data.data.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-slate-50">
                                            <Td>
                                                <Link href={`/admin/sales/${sale.id}`} className="font-medium text-slate-900 hover:underline">
                                                    {sale.number}
                                                </Link>
                                                <p className="text-xs whitespace-nowrap text-slate-500">{dateTimeLabel(sale.sold_at)}</p>
                                            </Td>
                                            <Td className="hidden md:table-cell">{sale.customer_name ?? <span className="text-slate-400">Walk-in</span>}</Td>
                                            <Td align="right" className="hidden sm:table-cell">
                                                {qty(sale.items_count ?? 0)}
                                            </Td>
                                            <Td className="hidden lg:table-cell">{sale.user?.name}</Td>
                                            <Td align="right" className="font-medium text-slate-900">
                                                {money(sale.total)}
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
