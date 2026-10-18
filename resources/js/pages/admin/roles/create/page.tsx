import AdminPageLayout from '@/components/admin/AdminPageLayout';
import RoleForm from '../components/RoleForm';

export default function CreateRole() {
    return (
        <div className="mx-auto max-w-3xl">
            <AdminPageLayout title="Add role" back={{ href: '/admin/roles', label: 'Roles' }}>
                <RoleForm />
            </AdminPageLayout>
        </div>
    );
}
