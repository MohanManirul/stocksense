import { router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button, ButtonLink, Card, CardBody, Field, Input, Select } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { useApiForm } from '@/config/useApiForm';
import { toast } from '@/lib/toast';
import { createUser, getRoleOptions, updateUser } from '../api';
import type { User, UserFormData } from '../types';

export default function UserForm({ user }: { user?: User }) {
    const roles = useApi(getRoleOptions);
    const form = useApiForm<UserFormData>({
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
        password_confirmation: '',
        role: user?.role ?? 'staff',
    });

    const submit = async (event: FormEvent) => {
        event.preventDefault();

        const saved = await form.submit((data) => (user ? updateUser(user.id, data) : createUser(data)));

        if (saved) {
            toast.success(user ? 'User updated.' : 'User created.');
            router.visit('/admin/users');
        }
    };

    return (
        <form onSubmit={submit} noValidate>
            <Card>
                <CardBody className="grid gap-5 sm:grid-cols-2">
                    <Field label="Full name" error={form.errors.name} required>
                        {(field) => <Input {...field} value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} error={form.errors.name} />}
                    </Field>
                    <Field label="Email" error={form.errors.email} required>
                        {(field) => (
                            <Input {...field} type="email" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} error={form.errors.email} />
                        )}
                    </Field>
                    <Field label="Role" error={form.errors.role} required className="sm:col-span-2" hint="The role decides which pages and actions this user can use.">
                        {(field) => (
                            <Select
                                {...field}
                                value={form.data.role}
                                onChange={(event) => form.setData('role', event.target.value)}
                                error={form.errors.role}
                                disabled={roles.state.status !== 'success'}
                            >
                                {roles.state.status === 'success' ? (
                                    roles.state.data.map((role) => (
                                        <option key={role} value={role}>
                                            {role.replace('-', ' ')}
                                        </option>
                                    ))
                                ) : (
                                    <option value={form.data.role}>{roles.state.status === 'error' ? 'Could not load roles' : 'Loading roles…'}</option>
                                )}
                            </Select>
                        )}
                    </Field>
                    <Field label="Password" error={form.errors.password} required={!user} hint={user ? 'Leave blank to keep the current password.' : 'At least 8 characters.'}>
                        {(field) => (
                            <Input
                                {...field}
                                type="password"
                                autoComplete="new-password"
                                value={form.data.password}
                                onChange={(event) => form.setData('password', event.target.value)}
                                error={form.errors.password}
                            />
                        )}
                    </Field>
                    <Field label="Confirm password" error={form.errors.password_confirmation} required={!user}>
                        {(field) => (
                            <Input
                                {...field}
                                type="password"
                                autoComplete="new-password"
                                value={form.data.password_confirmation}
                                onChange={(event) => form.setData('password_confirmation', event.target.value)}
                                error={form.errors.password_confirmation}
                            />
                        )}
                    </Field>
                </CardBody>
                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
                    <ButtonLink href="/admin/users" variant="secondary">
                        Cancel
                    </ButtonLink>
                    <Button type="submit" processing={form.processing}>
                        {user ? 'Save changes' : 'Create user'}
                    </Button>
                </div>
            </Card>
        </form>
    );
}
