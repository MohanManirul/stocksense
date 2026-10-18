import AdminPageLayout from '@/components/admin/AdminPageLayout';
import SaleForm from '../components/SaleForm';

export default function CreateSale() {
    return (
        <AdminPageLayout title="New sale" description="Recording the sale takes the items out of stock straight away." back={{ href: '/admin/sales', label: 'Sales' }}>
            <SaleForm />
        </AdminPageLayout>
    );
}
