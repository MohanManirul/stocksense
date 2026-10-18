import { router } from '@inertiajs/react';
import { Pencil, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { Button, ButtonLink, Card, CardBody, ConfirmButton, LoadError, PageSkeleton, StockBadge } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { usePermissions } from '@/config/usePermissions';
import { money } from '@/lib/format';
import { toast } from '@/lib/toast';
import { deleteProduct, getProduct } from '../api';
import AdjustStockDialog from '../components/AdjustStockDialog';
import StockLedger from '../components/StockLedger';
import type { Product } from '../types';

export default function ShowProduct({ productId }: { productId: number }) {
    const load = useCallback((signal: AbortSignal) => getProduct(productId, signal), [productId]);
    const { state, reload } = useApi(load);
    const [version, setVersion] = useState(0);

    if (state.status === 'loading') {
        return <PageSkeleton />;
    }

    if (state.status === 'error') {
        return <LoadError message={state.message} onRetry={reload} />;
    }

    return (
        <ProductDetail
            product={state.data}
            version={version}
            onStockChange={() => {
                reload();
                setVersion((value) => value + 1);
            }}
        />
    );
}

function ProductDetail({ product, version, onStockChange }: { product: Product; version: number; onStockChange: () => void }) {
    const can = usePermissions();
    const [adjusting, setAdjusting] = useState(false);

    const remove = async () => {
        await deleteProduct(product.id);
        toast.success('Product deleted.');
        router.visit('/admin/products');
    };

    return (
        <AdminPageLayout
            title={product.name}
            back={{ href: '/admin/products', label: 'Products' }}
            description={
                <span className="inline-flex flex-wrap items-center gap-2">
                    {product.sku} · {product.category?.name}
                    <StockBadge stock={product.stock_on_hand} active={product.is_active} reorderLevel={product.reorder_level} />
                </span>
            }
            actions={
                <>
                    {can('adjust stock') && (
                        <Button variant="secondary" icon={<SlidersHorizontal className="size-4" aria-hidden />} onClick={() => setAdjusting(true)}>
                            Adjust stock
                        </Button>
                    )}
                    {can('edit products') && (
                        <ButtonLink href={`/admin/products/${product.id}/edit`} variant="secondary" icon={<Pencil className="size-4" aria-hidden />}>
                            Edit
                        </ButtonLink>
                    )}
                    {can('delete products') && (
                        <ConfirmButton
                            onConfirm={remove}
                            title={`Delete ${product.name}?`}
                            description="Products with sales or purchase history can’t be deleted; mark them inactive instead."
                            confirmLabel="Delete product"
                            variant="danger"
                            triggerVariant="ghost"
                            icon={<Trash2 className="size-4" aria-hidden />}
                        >
                            Delete
                        </ConfirmButton>
                    )}
                </>
            }
        >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Summary label="On hand" value={String(product.stock_on_hand)} hint={`Reorder level ${product.reorder_level}`} />
                <Summary label="On order" value={String(product.on_order ?? 0)} hint="Placed, not yet received" />
                <Summary label="Sale price" value={money(product.sale_price)} hint={`Cost ${money(product.cost_price)}`} />
                <Summary
                    label="Supplier"
                    value={product.supplier?.name ?? '—'}
                    hint={product.supplier ? `${product.supplier.lead_time_days} day lead time` : 'No supplier set'}
                />
            </div>

            <StockLedger key={version} productId={product.id} />

            {product.description && (
                <Card className="mt-6">
                    <CardBody>
                        <p className="text-sm text-slate-600">{product.description}</p>
                    </CardBody>
                </Card>
            )}

            {can('adjust stock') && <AdjustStockDialog product={product} open={adjusting} onClose={() => setAdjusting(false)} onAdjusted={onStockChange} />}
        </AdminPageLayout>
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
