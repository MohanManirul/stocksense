import { router } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useRef, type FormEvent } from 'react';
import { Alert, Button, ButtonLink, Card, CardBody, CardHeader, Field, Input, LoadError, PageSkeleton, Select, Textarea } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { useApiForm } from '@/config/useApiForm';
import { money, qty } from '@/lib/format';
import { toast } from '@/lib/toast';
import { createSale, getSaleOptions } from '../api';
import type { SaleFormData, SaleLine, SaleProductOption } from '../types';

export default function SaleForm() {
    const options = useApi(getSaleOptions);

    if (options.state.status === 'loading') {
        return <PageSkeleton />;
    }

    if (options.state.status === 'error') {
        return <LoadError message="The products for this sale couldn’t be loaded." onRetry={options.reload} />;
    }

    return <Form products={options.state.data.products} />;
}

// Prices are added up in paisa so 0.1 + 0.2 style float errors never reach the total.
const paisa = (price: string) => Math.round(Number(price) * 100);

function Form({ products }: { products: SaleProductOption[] }) {
    const nextKey = useRef(1);
    const form = useApiForm<SaleFormData>({ customer_name: '', notes: '', items: [{ key: 0, product_id: '', quantity: '1' }] });
    const byId = useMemo(() => new Map(products.map((product) => [String(product.id), product])), [products]);
    const chosen = new Set(form.data.items.map((line) => line.product_id));

    const lines = form.data.items.map((line) => {
        const product = byId.get(line.product_id);
        const quantity = Math.max(0, Math.floor(Number(line.quantity) || 0));

        return { line, product, quantity, amount: product ? paisa(product.sale_price) * quantity : 0 };
    });
    const total = lines.reduce((sum, { amount }) => sum + amount, 0);
    const units = lines.reduce((sum, { product, quantity }) => sum + (product ? quantity : 0), 0);

    const updateLine = (key: number, changes: Partial<SaleLine>) =>
        form.setData(
            'items',
            form.data.items.map((line) => (line.key === key ? { ...line, ...changes } : line)),
        );

    const addLine = () => form.setData('items', [...form.data.items, { key: nextKey.current++, product_id: '', quantity: '1' }]);

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

        const sale = await form.submit(createSale);

        if (sale) {
            toast.success(`Sale ${sale.number} recorded.`);
            router.visit(`/admin/sales/${sale.id}`);
        }
    };

    return (
        <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-3 lg:items-start">
            <Card className="lg:col-span-2">
                <CardHeader title="Items" description="Prices come from the product catalog." />
                <CardBody>
                    {form.errors.items && (
                        <div className="mb-4">
                            <Alert>{form.errors.items}</Alert>
                        </div>
                    )}

                    <div className="hidden grid-cols-[minmax(0,1fr)_7rem_8rem_2.5rem] gap-3 pb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase sm:grid">
                        <span>Product</span>
                        <span>Quantity</span>
                        <span className="text-right">Amount</span>
                        <span className="sr-only">Remove</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {lines.map(({ line, product, quantity, amount }, index) => {
                            const productError = form.errors[`items.${index}.product_id`];
                            const quantityError = form.errors[`items.${index}.quantity`];
                            const overStock = product !== undefined && quantity > product.stock_on_hand;

                            return (
                                <div
                                    key={line.key}
                                    className="grid grid-cols-[6rem_minmax(0,1fr)_2.5rem] gap-x-3 gap-y-2 py-3 first:pt-0 sm:grid-cols-[minmax(0,1fr)_7rem_8rem_2.5rem] sm:items-start"
                                >
                                    <div className="col-span-3 sm:col-span-1">
                                        <Select
                                            value={line.product_id}
                                            onChange={(event) => updateLine(line.key, { product_id: event.target.value })}
                                            error={productError}
                                            aria-invalid={Boolean(productError)}
                                            aria-label={`Product, line ${index + 1}`}
                                        >
                                            <option value="">Choose a product</option>
                                            {products.map((option) => {
                                                const value = String(option.id);
                                                const unavailable = option.stock_on_hand <= 0 || (chosen.has(value) && value !== line.product_id);

                                                return (
                                                    <option key={option.id} value={value} disabled={unavailable}>
                                                        {option.name} ({option.sku}) · {money(option.sale_price)}
                                                        {option.stock_on_hand <= 0 ? ' · out of stock' : ''}
                                                    </option>
                                                );
                                            })}
                                        </Select>
                                        {productError ? (
                                            <p className="mt-1.5 text-sm text-red-600">{productError}</p>
                                        ) : (
                                            product && <p className="mt-1.5 text-xs text-slate-500">{qty(product.stock_on_hand)} in stock</p>
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
                                        {quantityError ? (
                                            <p className="mt-1.5 text-sm text-red-600">{quantityError}</p>
                                        ) : (
                                            overStock && <p className="mt-1.5 text-xs text-amber-700">Only {qty(product.stock_on_hand)} left</p>
                                        )}
                                    </div>
                                    <p className="tabular py-2 text-right text-sm font-medium text-slate-900">{money(amount / 100)}</p>
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
                        disabled={form.data.items.length >= Math.min(50, products.length)}
                    >
                        Add another product
                    </Button>
                </CardBody>
            </Card>

            <Card>
                <CardBody className="space-y-5">
                    <Field label="Customer name" error={form.errors.customer_name} hint="Leave empty for a walk-in customer.">
                        {(field) => (
                            <Input
                                {...field}
                                value={form.data.customer_name}
                                onChange={(event) => form.setData('customer_name', event.target.value)}
                                error={form.errors.customer_name}
                            />
                        )}
                    </Field>
                    <Field label="Notes" error={form.errors.notes}>
                        {(field) => <Textarea {...field} value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} error={form.errors.notes} />}
                    </Field>
                    <dl className="space-y-1 border-t border-slate-100 pt-4 text-sm">
                        <div className="flex justify-between text-slate-500">
                            <dt>Units</dt>
                            <dd className="tabular">{qty(units)}</dd>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <dt className="font-medium text-slate-700">Total</dt>
                            <dd className="tabular text-2xl font-semibold text-slate-900">{money(total / 100)}</dd>
                        </div>
                    </dl>
                </CardBody>
                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
                    <ButtonLink href="/admin/sales" variant="secondary">
                        Cancel
                    </ButtonLink>
                    <Button type="submit" processing={form.processing}>
                        Record sale
                    </Button>
                </div>
            </Card>
        </form>
    );
}
