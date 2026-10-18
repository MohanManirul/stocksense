import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

interface DialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: ReactNode;
    children?: ReactNode;
    footer?: ReactNode;
}

export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;

        if (!dialog) {
            return;
        }

        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={ref}
            onClose={onClose}
            onClick={(event) => event.target === ref.current && onClose()}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-0 shadow-xl ring-1 ring-slate-200 backdrop:bg-slate-900/40"
        >
            <div className="flex items-start justify-between gap-4 px-5 pt-5">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                    {description && <div className="mt-1 text-sm text-slate-500">{description}</div>}
                </div>
                <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                    <X className="size-4" />
                </button>
            </div>
            {children && <div className="px-5 pt-4">{children}</div>}
            {footer && <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">{footer}</div>}
        </dialog>
    );
}
