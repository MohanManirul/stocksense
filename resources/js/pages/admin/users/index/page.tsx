import { Link, usePage } from '@inertiajs/react';
import { Lock, Pencil, Plus, Search, Trash2, Users as UsersIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AdminPageLayout from '@/components/admin/AdminPageLayout';
import { Badge, ButtonLink, Card, ConfirmButton, EmptyState, Input, LoadError, Pagination, Table, TableSkeleton, Tbody, Td, Th } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { usePermissions } from '@/config/usePermissions';
import { useQueryParams } from '@/config/useQueryParams';
import { date } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { SharedProps } from '@/types';
import { deleteUser, getUsers } from '../api';
import type { User } from '../types';

export default function Users() {
    const can = usePermissions();
    const currentUserId = usePage<SharedProps>().props.auth.user?.id;
    const hasActions = can('edit users') || can('delete users');
    const [params, setParams] = useQueryParams();
    const [search, setSearch] = useState(params.search ?? '');
    const load = useCallback((signal: AbortSignal) => getUsers({ search: params.search, page: params.page }, signal), [params.search, params.page]);
    const { state, reload, refreshing } = useApi(load);

    useEffect(() => {
        if (search === (params.search ?? '')) {
            return;
        }

        const timer = window.setTimeout(() => setParams({ search, page: undefined }), 300);

        return () => window.clearTimeout(timer);
    }, [search]);

    const remove = async (user: User) => {
        await deleteUser(user.id);
        toast.success('User deleted.');
        reload();
    };

    return (
        <AdminPageLayout
            title="Users"
            description="Everyone who can sign in, and the role that decides what they can do."
            actions={
                can('create users') && (
                    <ButtonLink href="/admin/users/create" icon={<Plus className="size-4" aria-hidden />}>
                        Add user
                    </ButtonLink>
                )
            }
        >
            <Card>
                <div className="border-b border-slate-100 p-4 sm:px-5">
                    <div className="relative max-w-md">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                        <Input type="search" placeholder="Search by name or email" aria-label="Search users" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
                    </div>
                </div>

                {state.status === 'loading' && <TableSkeleton />}

                {state.status === 'error' && (
                    <div className="p-4 sm:px-5">
                        <LoadError message={state.message} onRetry={reload} />
                    </div>
                )}

                {state.status === 'success' &&
                    (state.data.data.length === 0 ? (
                        <EmptyState icon={<UsersIcon className="size-5" />} title="No users match your search" description="Try a different name or email." />
                    ) : (
                        <div className={cn('transition-opacity', refreshing && 'opacity-60')}>
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>User</Th>
                                        <Th>Role</Th>
                                        <Th className="hidden md:table-cell">Added</Th>
                                        {hasActions && (
                                            <Th align="right">
                                                <span className="sr-only">Actions</span>
                                            </Th>
                                        )}
                                    </tr>
                                </thead>
                                <Tbody>
                                    {state.data.data.map((user) => (
                                        <tr key={user.id}>
                                            <Td>
                                                <p className="font-medium text-slate-900">{user.name}</p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </Td>
                                            <Td>
                                                <Badge tone={user.protected ? 'violet' : user.role === 'admin' ? 'blue' : 'gray'} className="capitalize">
                                                    {user.role?.replace('-', ' ') ?? 'No role'}
                                                </Badge>
                                            </Td>
                                            <Td className="hidden text-slate-500 md:table-cell">{date(user.created_at)}</Td>
                                            {hasActions && (
                                                <Td align="right">
                                                    {user.protected ? (
                                                        <span className="inline-flex items-center gap-1 text-xs text-slate-400" title="The super admin account cannot be changed">
                                                            <Lock className="size-3.5" aria-hidden />
                                                            Protected
                                                        </span>
                                                    ) : (
                                                        <div className="flex justify-end gap-1">
                                                            {can('edit users') && (
                                                                <Link
                                                                    href={`/admin/users/${user.id}/edit`}
                                                                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                                                    title="Edit"
                                                                    aria-label={`Edit ${user.name}`}
                                                                >
                                                                    <Pencil className="size-4" />
                                                                </Link>
                                                            )}
                                                            {can('delete users') && user.id !== currentUserId && (
                                                                <ConfirmButton
                                                                    onConfirm={() => remove(user)}
                                                                    title={`Delete ${user.name}?`}
                                                                    description="They will no longer be able to sign in. Users with sales or purchase orders on record can’t be deleted."
                                                                    confirmLabel="Delete user"
                                                                    variant="danger"
                                                                    triggerVariant="ghost"
                                                                    size="sm"
                                                                    icon={<Trash2 className="size-4 text-slate-400" aria-label={`Delete ${user.name}`} />}
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
                        </div>
                    ))}

                {state.status === 'success' && <Pagination meta={state.data.meta} onPageChange={(page) => setParams({ page: String(page) })} />}
            </Card>
        </AdminPageLayout>
    );
}
