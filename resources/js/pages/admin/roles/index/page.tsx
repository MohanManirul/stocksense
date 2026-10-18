import { Link } from '@inertiajs/react';
import { Lock, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { ButtonLink, Card, ConfirmButton, EmptyState, LoadError, Table, TableSkeleton, Tbody, Td, Th } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { usePermissions } from '@/config/usePermissions';
import { toast } from '@/lib/toast';
import { deleteRole, getRoles } from '../api';
import type { Role } from '../types';

export default function Roles() {
    const can = usePermissions();
    const hasActions = can('edit roles') || can('delete roles');
    const { state, reload } = useApi(getRoles);

    const remove = async (role: Role) => {
        await deleteRole(role.id);
        toast.success('Role deleted.');
        reload();
    };

    return (
        <AdminPageLayout
            title="Roles"
            description="Each role is a set of permissions. Give a user a role to decide what they can see and change."
            actions={
                can('create roles') && (
                    <ButtonLink href="/admin/roles/create" icon={<Plus className="size-4" aria-hidden />}>
                        Add role
                    </ButtonLink>
                )
            }
        >
            <Card>
                {state.status === 'loading' && <TableSkeleton rows={3} />}

                {state.status === 'error' && (
                    <div className="p-4 sm:px-5">
                        <LoadError message={state.message} onRetry={reload} />
                    </div>
                )}

                {state.status === 'success' &&
                    (state.data.length === 0 ? (
                        <EmptyState icon={<ShieldCheck className="size-5" />} title="No roles yet" />
                    ) : (
                        <Table>
                            <thead>
                                <tr>
                                    <Th>Role</Th>
                                    <Th align="right">Permissions</Th>
                                    <Th align="right">Users</Th>
                                    {hasActions && (
                                        <Th align="right">
                                            <span className="sr-only">Actions</span>
                                        </Th>
                                    )}
                                </tr>
                            </thead>
                            <Tbody>
                                {state.data.map((role) => (
                                    <tr key={role.id}>
                                        <Td className="font-medium text-slate-900 capitalize">{role.name.replace('-', ' ')}</Td>
                                        <Td align="right">{role.protected ? 'All' : role.permissions_count}</Td>
                                        <Td align="right">{role.users_count}</Td>
                                        {hasActions && (
                                            <Td align="right">
                                                {role.protected ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-slate-400" title="The super admin role always has every permission">
                                                        <Lock className="size-3.5" aria-hidden />
                                                        Protected
                                                    </span>
                                                ) : (
                                                    <div className="flex justify-end gap-1">
                                                        {can('edit roles') && (
                                                            <Link
                                                                href={`/admin/roles/${role.id}/edit`}
                                                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                                                title="Edit"
                                                                aria-label={`Edit ${role.name}`}
                                                            >
                                                                <Pencil className="size-4" />
                                                            </Link>
                                                        )}
                                                        {can('delete roles') && (
                                                            <ConfirmButton
                                                                onConfirm={() => remove(role)}
                                                                title={`Delete the ${role.name} role?`}
                                                                description={role.users_count ? 'Move the users with this role to another role first.' : 'This cannot be undone.'}
                                                                confirmLabel="Delete role"
                                                                variant="danger"
                                                                triggerVariant="ghost"
                                                                size="sm"
                                                                icon={<Trash2 className="size-4 text-slate-400" aria-label={`Delete ${role.name}`} />}
                                                            >
                                                                {null}
                                                            </ConfirmButton>
                                                        )}
                                                    </div>
                                                )}
                                            </Td>
                                        )}
                                    </tr>
                                ))}
                            </Tbody>
                        </Table>
                    ))}
            </Card>
        </AdminPageLayout>
    );
}
