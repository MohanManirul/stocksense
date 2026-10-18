import { router } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useRef, type FormEvent } from 'react';
import { Alert, Button, ButtonLink, Card, CardBody, CardHeader, Field, Input, LoadError, PageSkeleton, Select, Textarea } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { useApiForm } from '@/config/useApiForm';
import { money, qty } from '@/lib/format';
import { toast } from '@/lib/toast';
import { createPurchaseOrder, getPurchaseOrderOptions, updatePurchaseOrder } from '../api';
import type { PurchaseOrder, PurchaseOrderFormData, PurchaseOrderLine, PurchaseOrderOptions } from '../types';

export default function PurchaseOrderForm({ order }: { order?: PurchaseOrder }) {
    const options = useApi(getPurchaseOrderOptions);

    if (options.state.status === 'loading') {
        return <PageSkeleton />;
    }

    if (options.state.status === 'error') {
        return <LoadError message="The suppliers and products for this form couldn’t be loaded." onRetry={options.reload} />;
    }

    return <Form order={order} options={options.state.data} />;
}

// Amounts are added up in paisa so 0.1 + 0.2 style float errors never reach the total.
const paisa = (price: string) => Math.round((Number(price) || 0) * 100);

function daysFromToday(days: number): string {
    const day = new Date();
    day.setDate(day.getDate() + days);

    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

const emptyLine = (key: number): PurchaseOrderLine => ({ key, product_id: '', quantity: '1', unit_cost: '' });

function Form({ order, options }: { order?: PurchaseOrder; options: PurchaseOrderOptions }) {
    const nextKey = useRef(order?.items?.length ?? 1);
    // Once the user picks a date themselves, changing supplier must not overwrite it.
    const expectedTouched = useRef(Boolean(order?.expected_at));
    const form = useApiForm<PurchaseOrderFormData>({
        supplier_id: order ? String(order.supplier_id) : '',
        expected_at: order?.expected_at ?? '',
        notes: order?.notes ?? '',
        items: order?.items?.map((item, index) => ({
            key: index,
            product_id: String(item.product_id),
            quantity: String(item.quantity),
            unit_cost: item.unit_cost,
        })) ?? [emptyLine(0)],
    });

    const supplier = options.suppliers.find((option) => String(option.id) === form.data.supplier_id);
    const products = useMemo(
        () => options.products.filter((product) => String(product.supplier_id) === form.data.supplier_id),
        [options.products, form.data.supplier_id],
    );
    const byId = useMemo(() => new Map(products.map((product) => [String(product.id), product])), [products]);
    const chosen = new Set(form.data.items.map((line) => line.product_id));

    const lines = form.data.items.map((line) => {
        const quantity = Math.max(0, Math.floor(Number(line.quantity) || 0));

        return { line, product: byId.get(line.product_id), amount: paisa(line.unit_cost) * quantity };
    });
    const total = lines.reduce((sum, { amount }) => sum + amount, 0);

    const changeSupplier = (supplierId: string) => {
        const next = options.suppliers.find((option) => String(option.id) === supplierId);

        form.clearErrors();
        form.setData('supplier_id', supplierId);
        // Products belong to one supplier, so lines from the old supplier no longer apply.
        form.setData('items', [emptyLine(nextKey.current++)]);

        if (next && !expectedTouched.current) {
            form.setData('expected_at', daysFromToday(next.lead_time_days));
        }
    };

    const updateLine = (key: number, changes: Partial<PurchaseOrderLine>) =>
        form.setData(
            'items',
            form.data.items.map((line) => (line.key === key ? { ...line, ...changes } : line)),
        );

    const chooseProduct = (key: number, productId: string) => {
        const product = byId.get(productId);

        updateLine(key, { product_id: productId, ...(product ? { unit_cost: product.cost_price } : {}) });
    };

    const addLine = () => form.setData('items', [...form.data.items, emptyLine(nextKey.current++)]);

    const removeLine = (key: number) => {
        // Server errors are keyed by line index, which shifts once a line is removed.
        form.clearErrors();
        form.setData(
            'items',
            form.data.items.filter((line) => line.key !== key),
        );
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();

        const saved = await form.submit((data) => (order ? updatePurchaseOrder(order.id, data) : createPurchaseOrder(data)));

        if (saved) {
            toast.success(order ? 'Purchase order updated.' : `${saved.number} saved as draft.`);
            router.visit(`/admin/purchase-orders/${saved.id}`);
        }
    };

    return (
        <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-3 lg:items-start">
            <Card className="lg:col-span-2">
                <CardHeader title="Items" description={supplier ? `Active products supplied by ${supplier.name}` : 'Choose a supplier to see its products.'} />
                <CardBody>
                    {form.errors.items && (
                        <div className="mb-4">
                            <Alert>{form.errors.items}</Alert>
                        </div>
                    )}

                    {supplier && products.length === 0 ? (
                        <Alert tone="info">{supplier.name} has no active products yet. Set this supplier on a product first.</Alert>
                    ) : (
                        <>
                            <div className="hidden grid-cols-[minmax(0,1fr)_6rem_7rem_7rem_2.5rem] gap-3 pb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase sm:grid">
                                <span>Product</span>
                                <span>Quantity</span>
                                <span>Unit cost</span>
                                <span className="text-right">Amount</span>
                                <span className="sr-only">Remove</span>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {lines.map(({ line, product, amount }, index) => {
                                    const productError = form.errors[`items.${index}.product_id`];
                                    const quantityError = form.errors[`items.${index}.quantity`];
                                    const costError = form.errors[`items.${index}.unit_cost`];

                                    return (
                                        <div
                                            key={line.key}
                                            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-x-3 gap-y-2 py-3 first:pt-0 sm:grid-cols-[minmax(0,1fr)_6rem_7rem_7rem_2.5rem] sm:items-start"
                                        >
                                            <div className="col-span-3 sm:col-span-1">
                                                <Select
                                                    value={line.product_id}
                                                    onChange={(event) => chooseProduct(line.key, event.target.value)}
                                                    disabled={!supplier}
                                                    error={productError}
                                                    aria-invalid={Boolean(productError)}
                                                    aria-label={`Product, line ${index + 1}`}
                                                >
                                                    <option value="">Choose a product</option>
                                                    {products.map((option) => {
                                                        const value = String(option.id);

                                                        return (
                                                            <option key={option.id} value={value} disabled={chosen.has(value) && value !== line.product_id}>
                                                                {option.name} ({option.sku}){option.stock_on_hand <= option.reorder_level ? ' · low stock' : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </Select>
                                                {productError ? (
                                                    <p className="mt-1.5 text-sm text-red-600">{productError}</p>
                                                ) : (
                                                    product && (
                                                        <p className="mt-1.5 text-xs text-slate-500">
                                                            {qty(product.stock_on_hand)} on hand · reorder level {qty(product.reorder_level)}
                                                        </p>
                                                    )
                                                )}
                                            </div>
                                            <div>
                                                <Input
                                                    type="number"
                                                    inputMode="numeric"
                                                    min="1"
                                                    step="1"
                                                    value={line.quantity}
                                                    onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                                                    error={quantityError}
                                                    aria-invalid={Boolean(quantityError)}
                                                    aria-label={`Quantity, line ${index + 1}`}
                                                />
                                                {quantityError && <p className="mt-1.5 text-sm text-red-600">{quantityError}</p>}
                                            </div>
                                            <div>
                                                <Input
                                                    type="number"
                                                    inputMode="decimal"
                                                    min="0"
                                                    step="0.01"
                                                    value={line.unit_cost}
                                                    onChange={(event) => updateLine(line.key, { unit_cost: event.target.value })}
                                                    error={costError}
                                                    aria-invalid={Boolean(costError)}
                                                    aria-label={`Unit cost, line ${index + 1}`}
                                                />
                                                {costError && <p className="mt-1.5 text-sm text-red-600">{costError}</p>}
                                            </div>
                                            <p className="tabular col-span-3 text-right text-sm font-medium text-slate-900 max-sm:order-last sm:col-span-1 sm:py-2">
                                                {money(amount / 100)}
                                            </p>
                                            <Button
                                                variant="ghost"
                                                className="px-0"
                                                icon={<Trash2 className="size-4" aria-hidden />}
                                                onClick={() => removeLine(line.key)}
                                                disabled={form.data.items.length === 1}
                                                aria-label={`Remove line ${index + 1}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <Button
                                variant="secondary"
                                size="sm"
                                className="mt-2"
                                icon={<Plus className="size-4" aria-hidden />}
                                onClick={addLine}
                                disabled={!supplier || form.data.items.length >= Math.min(50, products.length)}
                            >
                                Add another product
                            </Button>
                        </>
                    )}
                </CardBody>
            </Card>

            <Card>
                <CardBody className="space-y-5">
                    <Field label="Supplier" error={form.errors.supplier_id} required>
                        {(field) => (
                            <Select {...field} value={form.data.supplier_id} onChange={(event) => changeSupplier(event.target.value)} error={form.errors.supplier_id}>
                                <option value="">Choose a supplier</option>
                                {options.suppliers.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.name}
                                    </option>
                                ))}
                            </Select>
                        )}
                    </Field>
                    <Field
                        label="Expected delivery"
                        error={form.errors.expected_at}
                        hint={supplier ? `${supplier.name} usually delivers in ${supplier.lead_time_days} days.` : undefined}
                    >
                        {(field) => (
                            <Input
                                {...field}
                                type="date"
                                value={form.data.expected_at}
                                onChange={(event) => {
                                    expectedTouched.current = true;
                                    form.setData('expected_at', event.target.value);
                                }}
                                error={form.errors.expected_at}
                            />
                        )}
                    </Field>
                    <Field label="Notes" error={form.errors.notes}>
                        {(field) => <Textarea {...field} value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} error={form.errors.notes} />}
                    </Field>
                    <div className="flex items-baseline justify-between border-t border-slate-100 pt-4 text-sm">
                        <span className="font-medium text-slate-700">Total</span>
                        <span className="tabular text-2xl font-semibold text-slate-900">{money(total / 100)}</span>
                    </div>
                    <p className="text-xs text-slate-500">Saved as a draft. Stock only changes when the order is received.</p>
                </CardBody>
                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
                    <ButtonLink href={order ? `/admin/purchase-orders/${order.id}` : '/admin/purchase-orders'} variant="secondary">
                        Cancel
                    </ButtonLink>
                    <Button type="submit" processing={form.processing}>
                        {order ? 'Save changes' : 'Save draft'}
                    </Button>
                </div>
            </Card>
        </form>
    );
}
