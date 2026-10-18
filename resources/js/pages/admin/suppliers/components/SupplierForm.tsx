import { router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button, ButtonLink, Card, CardBody, Field, Input } from '@/components/ui';
import { useApiForm } from '@/config/useApiForm';
import { toast } from '@/lib/toast';
import { createSupplier, updateSupplier } from '../api';
import type { Supplier, SupplierFormData } from '../types';

type TextKey = 'name' | 'contact_name' | 'email' | 'phone';

export default function SupplierForm({ supplier }: { supplier?: Supplier }) {
    const form = useApiForm<SupplierFormData>({
        name: supplier?.name ?? '',
        contact_name: supplier?.contact_name ?? '',
        email: supplier?.email ?? '',
        phone: supplier?.phone ?? '',
        lead_time_days: supplier ? String(supplier.lead_time_days) : '7',
    });

    const submit = async (event: FormEvent) => {
        event.preventDefault();

        const saved = await form.submit((data) => (supplier ? updateSupplier(supplier.id, data) : createSupplier(data)));

        if (saved) {
            toast.success(supplier ? 'Supplier updated.' : 'Supplier added.');
            router.visit('/admin/suppliers');
        }
    };

    const text = (key: TextKey, label: string, options: { required?: boolean; type?: string; className?: string } = {}) => (
        <Field label={label} error={form.errors[key]} required={options.required} className={options.className}>
            {(field) => (
                <Input {...field} type={options.type ?? 'text'} value={form.data[key]} onChange={(event) => form.setData(key, event.target.value)} error={form.errors[key]} />
            )}
        </Field>
    );

    return (
        <form onSubmit={submit} noValidate>
            <Card>
                <CardBody className="grid gap-5 sm:grid-cols-2">
                    {text('name', 'Company name', { required: true, className: 'sm:col-span-2' })}
                    {text('contact_name', 'Contact person')}
                    <Field label="Lead time (days)" error={form.errors.lead_time_days} required hint="Days from placing an order to receiving it. Drives the reorder forecast.">
                        {(field) => (
                            <Input
                                {...field}
                                type="number"
                                min="1"
                                max="180"
                                value={form.data.lead_time_days}
                                onChange={(event) => form.setData('lead_time_days', event.target.value)}
                                error={form.errors.lead_time_days}
                            />
                        )}
                    </Field>
                    {text('email', 'Email', { type: 'email' })}
                    {text('phone', 'Phone', { type: 'tel' })}
                </CardBody>
                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
                    <ButtonLink href="/admin/suppliers" variant="secondary">
                        Cancel
                    </ButtonLink>
                    <Button type="submit" processing={form.processing}>
                        {supplier ? 'Save changes' : 'Add supplier'}
                    </Button>
                </div>
            </Card>
        </form>
    );
}
