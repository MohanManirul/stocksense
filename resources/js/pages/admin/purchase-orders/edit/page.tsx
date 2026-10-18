import { useCallback } from 'react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { LoadError, PageSkeleton } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { getPurchaseOrder } from '../api';
import PurchaseOrderForm from '../components/PurchaseOrderForm';

export default function EditPurchaseOrder({ purchaseOrderId }: { purchaseOrderId: number }) {
    const load = useCallback((signal: AbortSignal) => getPurchaseOrder(purchaseOrderId, signal), [purchaseOrderId]);
    const { state, reload } = useApi(load);

    if (state.status === 'loading') {
        return <PageSkeleton />;
    }

    if (state.status === 'error') {
        return <LoadError message={state.message} onRetry={reload} />;
    }

    return (
        <AdminPageLayout title={`Edit ${state.data.number}`} back={{ href: `/admin/purchase-orders/${purchaseOrderId}`, label: state.data.number }}>
            <PurchaseOrderForm order={state.data} />
        </AdminPageLayout>
    );
}
