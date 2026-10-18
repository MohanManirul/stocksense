import { Link } from '@inertiajs/react';
import { Package, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { ButtonLink, Card, EmptyState, Input, LoadError, Pagination, Select, StockBadge, Table, TableSkeleton, Tbody, Td, Th } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { usePermissions } from '@/config/usePermissions';
import { useQueryParams } from '@/config/useQueryParams';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getProductOptions, getProducts } from '../api';

export default function Products() {
    const can = usePermissions();
    const [params, setParams] = useQueryParams();
    const [search, setSearch] = useState(params.search ?? '');
    const options = useApi(getProductOptions);
    const load = useCallback(
        (signal: AbortSignal) =>
            getProducts(
                { search: params.search, category: params.category, supplier: params.supplier, status: params.status, stock: params.stock, page: params.page },
                signal,
            ),
        [params.search, params.category, params.supplier, params.status, params.stock, params.page],
    );
    const { state, reload, refreshing } = useApi(load);
    const filtered = Boolean(params.search || params.category || params.supplier || params.status || params.stock);

    useEffect(() => {
        if (search === (params.search ?? '')) {
            return;
        }

        const timer = window.setTimeout(() => setParams({ search, page: undefined }), 300);

        return () => window.clearTimeout(timer);
    }, [search]);

    return (
        <AdminPageLayout
            title="Products"
            description="Your catalog, prices and current stock."
            actions={
                can('create products') && (
                    <ButtonLink href="/admin/products/create" icon={<Plus className="size-4" aria-hidden />}>
                        Add product
                    </ButtonLink>
                )
            }
        >
            <Card>
                <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-5">
                    <div className="relative sm:col-span-2 lg:col-span-1">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                        <Input
                            type="search"
                            placeholder="Search by name or SKU"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="pl-9"
                            aria-label="Search products"
                        />
                    </div>
                    <Select value={params.category ?? ''} onChange={(event) => setParams({ category: event.target.value, page: undefined })} aria-label="Filter by category">
                        <option value="">All categories</option>
                        {options.state.status === 'success' &&
                            options.state.data.categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
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
                    <Select value={params.stock ?? ''} onChange={(event) => setParams({ stock: event.target.value, page: undefined })} aria-label="Filter by stock level">
                        <option value="">Any stock level</option>
                        <option value="low">Low stock</option>
                        <option value="out">Out of stock</option>
                    </Select>
                    <Select value={params.status ?? ''} onChange={(event) => setParams({ status: event.target.value, page: undefined })} aria-label="Filter by status">
                        <option value="">Any status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
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
                            icon={<Package className="size-5" />}
                            title="No products found"
                            description={filtered ? 'Try a different search or clear the filters.' : 'Add your first product to get started.'}
                        />
                    ) : (
                        <div className={cn('transition-opacity', refreshing && 'opacity-60')}>
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>Product</Th>
                                        <Th className="hidden md:table-cell">Category</Th>
                                        <Th className="hidden lg:table-cell">Supplier</Th>
                                        <Th align="right">Price</Th>
                                        <Th align="right">On hand</Th>
                                        <Th>Status</Th>
                                    </tr>
                                </thead>
                                <Tbody>
                                    {state.data.data.map((product) => (
                                        <tr key={product.id} className="hover:bg-slate-50">
                                            <Td>
                                                <Link href={`/admin/products/${product.id}`} className="font-medium text-slate-900 hover:underline">
                                                    {product.name}
                                                </Link>
                                                <p className="text-xs text-slate-500">{product.sku}</p>
                                            </Td>
                                            <Td className="hidden md:table-cell">{product.category?.name}</Td>
                                            <Td className="hidden lg:table-cell">{product.supplier?.name ?? <span className="text-slate-400">—</span>}</Td>
                                            <Td align="right">{money(product.sale_price)}</Td>
                                            <Td align="right" className="font-medium text-slate-900">
                                                {product.stock_on_hand}
                                            </Td>
                                            <Td>
                                                <StockBadge stock={product.stock_on_hand} active={product.is_active} reorderLevel={product.reorder_level} />
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
