import AdminPageLayout from '@/components/admin/AdminPageLayout';
import ProductForm from '../components/ProductForm';

export default function CreateProduct() {
    return (
        <div className="mx-auto max-w-3xl">
            <AdminPageLayout title="Add product" back={{ href: '/admin/products', label: 'Products' }}>
                <ProductForm />
            </AdminPageLayout>
        </div>
    );
}
