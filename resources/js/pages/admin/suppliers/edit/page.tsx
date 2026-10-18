import { useCallback } from 'react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { LoadError, PageSkeleton } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { getSupplier } from '../api';
import SupplierForm from '../components/SupplierForm';

export default function EditSupplier({ supplierId }: { supplierId: number }) {
    const load = useCallback((signal: AbortSignal) => getSupplier(supplierId, signal), [supplierId]);
    const { state, reload } = useApi(load);

    if (state.status === 'loading') {
        return <PageSkeleton />;
    }

    if (state.status === 'error') {
        return <LoadError message={state.message} onRetry={reload} />;
    }

    return (
        <div className="mx-auto max-w-2xl">
            <AdminPageLayout title={`Edit ${state.data.name}`} back={{ href: '/admin/suppliers', label: 'Suppliers' }}>
                <SupplierForm supplier={state.data} />
            </AdminPageLayout>
        </div>
    );
}
