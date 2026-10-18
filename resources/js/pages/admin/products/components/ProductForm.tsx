import { router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button, ButtonLink, Card, CardBody, Checkbox, Field, Input, LoadError, PageSkeleton, Select, Textarea } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { useApiForm } from '@/config/useApiForm';
import { money } from '@/lib/format';
import { toast } from '@/lib/toast';
import { createProduct, getProductOptions, updateProduct } from '../api';
import type { Product, ProductFormData, ProductOptions } from '../types';

export default function ProductForm({ product }: { product?: Product }) {
    const options = useApi(getProductOptions);

    if (options.state.status === 'loading') {
        return <PageSkeleton />;
    }

    if (options.state.status === 'error') {
        return <LoadError message="The categories and suppliers for this form couldn’t be loaded." onRetry={options.reload} />;
    }

    return <Form product={product} options={options.state.data} />;
}

function Form({ product, options }: { product?: Product; options: ProductOptions }) {
    const form = useApiForm<ProductFormData>({
        sku: product?.sku ?? '',
        name: product?.name ?? '',
        description: product?.description ?? '',
        category_id: product ? String(product.category_id) : '',
        supplier_id: product?.supplier_id ? String(product.supplier_id) : '',
        cost_price: product?.cost_price ?? '',
        sale_price: product?.sale_price ?? '',
        reorder_level: product ? String(product.reorder_level) : '0',
        is_active: product?.is_active ?? true,
        opening_stock: '0',
    });

    const submit = async (event: FormEvent) => {
        event.preventDefault();

        const saved = await form.submit((data) => (product ? updateProduct(product.id, data) : createProduct(data)));

        if (saved) {
            toast.success(product ? 'Product updated.' : `${saved.name} was added.`);
            router.visit(`/admin/products/${saved.id}`);
        }
    };

    const cost = Number(form.data.cost_price);
    const price = Number(form.data.sale_price);
    const margin = cost > 0 && price > 0 ? ((price - cost) / price) * 100 : null;

    return (
        <form onSubmit={submit} noValidate>
            <Card>
                <CardBody className="grid gap-5 sm:grid-cols-2">
                    <Field label="Name" error={form.errors.name} required className="sm:col-span-2">
                        {(field) => <Input {...field} value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} error={form.errors.name} />}
                    </Field>
                    <Field label="SKU" error={form.errors.sku} required hint="Letters, numbers and dashes. Stored in upper case.">
                        {(field) => (
                            <Input {...field} value={form.data.sku} onChange={(event) => form.setData('sku', event.target.value.toUpperCase())} error={form.errors.sku} />
                        )}
                    </Field>
                    <Field label="Category" error={form.errors.category_id} required>
                        {(field) => (
                            <Select {...field} value={form.data.category_id} onChange={(event) => form.setData('category_id', event.target.value)} error={form.errors.category_id}>
                                <option value="">Choose a category</option>
                                {options.categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </Select>
                        )}
                    </Field>
                    <Field label="Cost price" error={form.errors.cost_price} required>
                        {(field) => (
                            <Input
                                {...field}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                value={form.data.cost_price}
                                onChange={(event) => form.setData('cost_price', event.target.value)}
                                error={form.errors.cost_price}
                            />
                        )}
                    </Field>
                    <Field
                        label="Sale price"
                        error={form.errors.sale_price}
                        required
                        hint={margin !== null ? `Margin ${margin.toFixed(1)}% (${money(price - cost)} per unit)` : undefined}
                    >
                        {(field) => (
                            <Input
                                {...field}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                value={form.data.sale_price}
                                onChange={(event) => form.setData('sale_price', event.target.value)}
                                error={form.errors.sale_price}
                            />
                        )}
                    </Field>
                    <Field label="Supplier" error={form.errors.supplier_id} hint="Lead time is used by the reorder forecast.">
                        {(field) => (
                            <Select {...field} value={form.data.supplier_id} onChange={(event) => form.setData('supplier_id', event.target.value)} error={form.errors.supplier_id}>
                                <option value="">No supplier</option>
                                {options.suppliers.map((supplier) => (
                                    <option key={supplier.id} value={supplier.id}>
                                        {supplier.name} ({supplier.lead_time_days} day lead time)
                                    </option>
                                ))}
                            </Select>
                        )}
                    </Field>
                    <Field label="Reorder level" error={form.errors.reorder_level} required hint="Shown as low stock when on hand drops to this number.">
                        {(field) => (
                            <Input
                                {...field}
                                type="number"
                                min="0"
                                step="1"
                                value={form.data.reorder_level}
                                onChange={(event) => form.setData('reorder_level', event.target.value)}
                                error={form.errors.reorder_level}
                            />
                        )}
                    </Field>
                    {!product && (
                        <Field label="Opening stock" error={form.errors.opening_stock} required hint="Recorded in the stock ledger as the opening balance.">
                            {(field) => (
                                <Input
                                    {...field}
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={form.data.opening_stock}
                                    onChange={(event) => form.setData('opening_stock', event.target.value)}
                                    error={form.errors.opening_stock}
                                />
                            )}
                        </Field>
                    )}
                    <Field label="Description" error={form.errors.description} className="sm:col-span-2">
                        {(field) => (
                            <Textarea {...field} value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} error={form.errors.description} />
                        )}
                    </Field>
                    <div className="sm:col-span-2">
                        <Checkbox
                            label="Active (available for sale and forecasting)"
                            checked={form.data.is_active}
                            onChange={(event) => form.setData('is_active', event.target.checked)}
                        />
                    </div>
                </CardBody>
                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
                    <ButtonLink href={product ? `/admin/products/${product.id}` : '/admin/products'} variant="secondary">
                        Cancel
                    </ButtonLink>
                    <Button type="submit" processing={form.processing}>
                        {product ? 'Save changes' : 'Create product'}
                    </Button>
                </div>
            </Card>
        </form>
    );
}
