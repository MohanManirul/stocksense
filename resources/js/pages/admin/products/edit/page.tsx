import { useCallback } from 'react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { LoadError, PageSkeleton } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { getProduct } from '../api';
import ProductForm from '../components/ProductForm';

export default function EditProduct({ productId }: { productId: number }) {
    const load = useCallback((signal: AbortSignal) => getProduct(productId, signal), [productId]);
    const { state, reload } = useApi(load);

    if (state.status === 'loading') {
        return <PageSkeleton />;
    }

    if (state.status === 'error') {
        return <LoadError message={state.message} onRetry={reload} />;
    }

    return (
        <div className="mx-auto max-w-3xl">
            <AdminPageLayout title={`Edit ${state.data.name}`} back={{ href: `/admin/products/${productId}`, label: state.data.name }}>
                <ProductForm product={state.data} />
            </AdminPageLayout>
        </div>
    );
}
