import AdminPageLayout from '@/components/admin/AdminPageLayout';
import PurchaseOrderForm from '../components/PurchaseOrderForm';

export default function CreatePurchaseOrder() {
    return (
        <AdminPageLayout title="New purchase order" back={{ href: '/admin/purchase-orders', label: 'Purchase orders' }}>
            <PurchaseOrderForm />
        </AdminPageLayout>
    );
}
