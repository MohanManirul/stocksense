import { router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button, ButtonLink, Card, CardBody, CardHeader, Checkbox, Field, Input, LoadError, TableSkeleton } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { useApiForm } from '@/config/useApiForm';
import { toast } from '@/lib/toast';
import { createRole, getPermissionGroups, updateRole } from '../api';
import type { Role, RoleFormData } from '../types';

const action = (permission: string) => permission.split(' ')[0];

export default function RoleForm({ role }: { role?: Role }) {
    const groups = useApi(getPermissionGroups);
    const form = useApiForm<RoleFormData>({
        name: role?.name ?? '',
        permissions: role?.permissions ?? [],
    });

    const selected = new Set(form.data.permissions);
    const permissionError = form.errors.permissions ?? Object.entries(form.errors).find(([key]) => key.startsWith('permissions.'))?.[1];

    const toggle = (permissions: string[], checked: boolean) => {
        const next = new Set(form.data.permissions);
        permissions.forEach((permission) => (checked ? next.add(permission) : next.delete(permission)));
        form.setData('permissions', [...next]);
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();

        const saved = await form.submit((data) => (role ? updateRole(role.id, data) : createRole(data)));

        if (saved) {
            toast.success(role ? 'Role updated.' : 'Role created.');
            router.visit('/admin/roles');
        }
    };

    return (
        <form onSubmit={submit} noValidate className="space-y-6">
            <Card>
                <CardBody>
                    <Field label="Role name" error={form.errors.name} required hint="Lowercase with dashes, like store-manager.">
                        {(field) => <Input {...field} value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} error={form.errors.name} />}
                    </Field>
                </CardBody>
            </Card>

            <Card>
                <CardHeader title="Permissions" description={`${selected.size} selected`} />
                {groups.state.status === 'loading' && <TableSkeleton rows={4} />}
                {groups.state.status === 'error' && (
                    <div className="p-4 sm:px-5">
                        <LoadError message={groups.state.message} onRetry={groups.reload} />
                    </div>
                )}
                {groups.state.status === 'success' && (
                    <ul className="divide-y divide-slate-100">
                        {groups.state.data.map((group) => {
                            const all = group.permissions.every((permission) => selected.has(permission));

                            return (
                                <li key={group.module} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                                    <div className="sm:w-48">
                                        <Checkbox
                                            label={group.module}
                                            checked={all}
                                            onChange={(event) => toggle(group.permissions, event.target.checked)}
                                            aria-label={`All ${group.module} permissions`}
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-x-5 gap-y-2 capitalize">
                                        {group.permissions.map((permission) => (
                                            <Checkbox
                                                key={permission}
                                                label={action(permission)}
                                                checked={selected.has(permission)}
                                                onChange={(event) => toggle([permission], event.target.checked)}
                                                aria-label={permission}
                                            />
                                        ))}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {permissionError && <p className="px-4 pb-4 text-sm text-red-600 sm:px-5">{permissionError}</p>}
                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
                    <ButtonLink href="/admin/roles" variant="secondary">
                        Cancel
                    </ButtonLink>
                    <Button type="submit" processing={form.processing}>
                        {role ? 'Save changes' : 'Create role'}
                    </Button>
                </div>
            </Card>
        </form>
    );
}
