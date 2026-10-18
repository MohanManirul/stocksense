import { useCallback } from 'react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { LoadError, PageSkeleton } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { getRole } from '../api';
import RoleForm from '../components/RoleForm';

export default function EditRole({ roleId }: { roleId: number }) {
    const load = useCallback((signal: AbortSignal) => getRole(roleId, signal), [roleId]);
    const { state, reload } = useApi(load);

    if (state.status === 'loading') {
        return <PageSkeleton />;
    }

    if (state.status === 'error') {
        return <LoadError message={state.message} onRetry={reload} />;
    }

    return (
        <div className="mx-auto max-w-3xl">
            <AdminPageLayout title={`Edit ${state.data.name}`} back={{ href: '/admin/roles', label: 'Roles' }}>
                <RoleForm role={state.data} />
            </AdminPageLayout>
        </div>
    );
}
