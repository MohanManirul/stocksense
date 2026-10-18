import AdminPageLayout from '@/components/admin/AdminPageLayout';
import SupplierForm from '../components/SupplierForm';

export default function CreateSupplier() {
    return (
        <div className="mx-auto max-w-2xl">
            <AdminPageLayout title="Add supplier" back={{ href: '/admin/suppliers', label: 'Suppliers' }}>
                <SupplierForm />
            </AdminPageLayout>
        </div>
    );
}
