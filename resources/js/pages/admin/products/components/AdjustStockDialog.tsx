import type { FormEvent } from 'react';
import { Button, Dialog, Field, Input } from '@/components/ui';
import { useApiForm } from '@/config/useApiForm';
import { toast } from '@/lib/toast';
import { adjustStock } from '../api';
import type { Product, StockAdjustmentData } from '../types';

interface AdjustStockDialogProps {
    product: Product;
    open: boolean;
    onClose: () => void;
    onAdjusted: () => void;
}

export default function AdjustStockDialog({ product, open, onClose, onAdjusted }: AdjustStockDialogProps) {
    const form = useApiForm<StockAdjustmentData>({ quantity: '', note: '' });
    const change = Number(form.data.quantity) || 0;

    const close = () => {
        form.reset();
        onClose();
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();

        const movement = await form.submit((data) => adjustStock(product.id, data));

        if (movement) {
            toast.success(`Stock adjusted. New balance: ${movement.balance_after}.`);
            close();
            onAdjusted();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={close}
            title="Adjust stock"
            description="Use a positive number to add units (found, returned) or a negative number to remove them (damaged, lost, count correction)."
        >
            <form onSubmit={submit} className="space-y-4 pb-5" noValidate>
                <Field label="Change in units" error={form.errors.quantity} required hint={`Current: ${product.stock_on_hand} → after: ${product.stock_on_hand + change}`}>
                    {(field) => (
                        <Input
                            {...field}
                            type="number"
                            step="1"
                            placeholder="e.g. -2"
                            autoFocus
                            value={form.data.quantity}
                            onChange={(event) => form.setData('quantity', event.target.value)}
                            error={form.errors.quantity}
                        />
                    )}
                </Field>
                <Field label="Reason" error={form.errors.note} required>
                    {(field) => (
                        <Input
                            {...field}
                            placeholder="e.g. Two bottles broken in storage"
                            value={form.data.note}
                            onChange={(event) => form.setData('note', event.target.value)}
                            error={form.errors.note}
                        />
                    )}
                </Field>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={close} disabled={form.processing}>
                        Cancel
                    </Button>
                    <Button type="submit" processing={form.processing}>
                        Save adjustment
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
