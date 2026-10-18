import { useState, type ReactNode } from 'react';
import { errorMessage } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { Button } from './Button';
import { Dialog } from './Dialog';

interface ConfirmButtonProps {
    onConfirm: () => Promise<unknown>;
    title: string;
    description: ReactNode;
    confirmLabel: string;
    variant?: 'primary' | 'danger' | 'secondary';
    triggerVariant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md';
    icon?: ReactNode;
    children: ReactNode;
}

export function ConfirmButton({
    onConfirm,
    title,
    description,
    confirmLabel,
    variant = 'primary',
    triggerVariant = 'secondary',
    size = 'md',
    icon,
    children,
}: ConfirmButtonProps) {
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    const confirm = async () => {
        setProcessing(true);

        try {
            await onConfirm();
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setProcessing(false);
            setOpen(false);
        }
    };

    return (
        <>
            <Button variant={triggerVariant} size={size} icon={icon} onClick={() => setOpen(true)}>
                {children}
            </Button>
            <Dialog
                open={open}
                onClose={() => !processing && setOpen(false)}
                title={title}
                description={description}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setOpen(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button variant={variant} onClick={confirm} processing={processing}>
                            {confirmLabel}
                        </Button>
                    </>
                }
            />
        </>
    );
}
