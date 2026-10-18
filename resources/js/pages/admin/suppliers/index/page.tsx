import { Link } from '@inertiajs/react';
import { Pencil, Plus, Search, Trash2, Truck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { ButtonLink, Card, ConfirmButton, EmptyState, Input, LoadError, Pagination, Table, TableSkeleton, Tbody, Td, Th } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { usePermissions } from '@/config/usePermissions';
import { useQueryParams } from '@/config/useQueryParams';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { deleteSupplier, getSuppliers } from '../api';
import type { Supplier } from '../types';

export default function Suppliers() {
    const can = usePermissions();
    const hasActions = can('edit suppliers') || can('delete suppliers');
    const [params, setParams] = useQueryParams();
    const [search, setSearch] = useState(params.search ?? '');
    const load = useCallback((signal: AbortSignal) => getSuppliers({ search: params.search, page: params.page }, signal), [params.search, params.page]);
    const { state, reload, refreshing } = useApi(load);

    useEffect(() => {
        if (search === (params.search ?? '')) {
            return;
        }

        const timer = window.setTimeout(() => setParams({ search, page: undefined }), 300);

        return () => window.clearTimeout(timer);
    }, [search]);

    const remove = async (supplier: Supplier) => {
        await deleteSupplier(supplier.id);
        toast.success('Supplier deleted.');
        reload();
    };

    return (
        <AdminPageLayout
            title="Suppliers"
            description="Who you buy from and how long deliveries take."
            actions={
                can('create suppliers') && (
                    <ButtonLink href="/admin/suppliers/create" icon={<Plus className="size-4" aria-hidden />}>
                        Add supplier
                    </ButtonLink>
                )
            }
        >
            <Card>
                <div className="border-b border-slate-100 p-4 sm:px-5">
                    <div className="relative max-w-md">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                        <Input type="search" placeholder="Search suppliers" aria-label="Search suppliers" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
                    </div>
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
                            icon={<Truck className="size-5" />}
                            title={params.search ? 'No suppliers match your search' : 'No suppliers yet'}
                            description={params.search ? 'Try a different name, contact or email.' : 'Add the companies you buy stock from.'}
                        />
                    ) : (
                        <div className={cn('transition-opacity', refreshing && 'opacity-60')}>
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>Supplier</Th>
                                        <Th className="hidden md:table-cell">Contact</Th>
                                        <Th align="right">Lead time</Th>
                                        <Th align="right">Products</Th>
                                        {hasActions && (
                                            <Th align="right">
                                                <span className="sr-only">Actions</span>
                                            </Th>
                                        )}
                                    </tr>
                                </thead>
                                <Tbody>
                                    {state.data.data.map((supplier) => (
                                        <tr key={supplier.id}>
                                            <Td className="font-medium text-slate-900">{supplier.name}</Td>
                                            <Td className="hidden md:table-cell">
                                                <p>{supplier.contact_name ?? '—'}</p>
                                                <p className="text-xs text-slate-500">{[supplier.email, supplier.phone].filter(Boolean).join(' · ')}</p>
                                            </Td>
                                            <Td align="right">{supplier.lead_time_days} days</Td>
                                            <Td align="right">{supplier.products_count}</Td>
                                            {hasActions && (
                                                <Td align="right">
                                                    <div className="flex justify-end gap-1">
                                                        {can('edit suppliers') && (
                                                            <Link
                                                                href={`/admin/suppliers/${supplier.id}/edit`}
                                                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                                                title="Edit"
                                                                aria-label={`Edit ${supplier.name}`}
                                                            >
                                                                <Pencil className="size-4" />
                                                            </Link>
                                                        )}
                                                        {can('delete suppliers') && (
                                                            <ConfirmButton
                                                                onConfirm={() => remove(supplier)}
                                                                title={`Delete ${supplier.name}?`}
                                                                description="Suppliers that still have products or purchase orders can’t be deleted."
                                                                confirmLabel="Delete supplier"
                                                                variant="danger"
                                                                triggerVariant="ghost"
                                                                size="sm"
                                                                icon={<Trash2 className="size-4 text-slate-400" aria-label={`Delete ${supplier.name}`} />}
                                                            >
                                                                {null}
                                                            </ConfirmButton>
                                                        )}
                                                    </div>
                                                </Td>
                                            )}
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
