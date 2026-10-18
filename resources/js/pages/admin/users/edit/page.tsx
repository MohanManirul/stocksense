import { useCallback } from 'react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { LoadError, PageSkeleton } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { getUser } from '../api';
import UserForm from '../components/UserForm';

export default function EditUser({ userId }: { userId: number }) {
    const load = useCallback((signal: AbortSignal) => getUser(userId, signal), [userId]);
    const { state, reload } = useApi(load);

    if (state.status === 'loading') {
        return <PageSkeleton />;
    }

    if (state.status === 'error') {
        return <LoadError message={state.message} onRetry={reload} />;
    }

    return (
        <div className="mx-auto max-w-2xl">
            <AdminPageLayout title={`Edit ${state.data.name}`} back={{ href: '/admin/users', label: 'Users' }}>
                <UserForm user={state.data} />
            </AdminPageLayout>
        </div>
    );
}
