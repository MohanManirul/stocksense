import AdminPageLayout from '@/components/admin/AdminPageLayout';
import UserForm from '../components/UserForm';

export default function CreateUser() {
    return (
        <div className="mx-auto max-w-2xl">
            <AdminPageLayout title="Add user" back={{ href: '/admin/users', label: 'Users' }}>
                <UserForm />
            </AdminPageLayout>
        </div>
    );
}
