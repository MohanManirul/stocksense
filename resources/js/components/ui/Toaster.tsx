import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast as toasts, type ToastTone } from '@/lib/toast';

interface Toast {
    id: number;
    tone: ToastTone;
    message: string;
}

export function Toaster() {
    const [items, setItems] = useState<Toast[]>([]);
    const nextId = useRef(0);

    useEffect(
        () =>
            toasts.subscribe((tone, message) => {
                const id = ++nextId.current;
                setItems((current) =>
                    current.some((item) => item.message === message && item.tone === tone) ? current : [...current.slice(-2), { id, tone, message }],
                );
                window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), tone === 'error' ? 7000 : 4500);
            }),
        [],
    );

    return (
        <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6">
            {items.map((item) => (
                <div
                    key={item.id}
                    role={item.tone === 'error' ? 'alert' : 'status'}
                    className={cn(
                        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg bg-white px-4 py-3 text-sm shadow-lg ring-1',
                        item.tone === 'success' ? 'ring-green-200' : 'ring-red-200',
                    )}
                >
                    {item.tone === 'success' ? (
                        <CircleCheck className="mt-0.5 size-4 shrink-0 text-green-700" aria-hidden />
                    ) : (
                        <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
                    )}
                    <p className="flex-1 text-slate-800">{item.message}</p>
                    <button
                        type="button"
                        onClick={() => setItems((current) => current.filter((other) => other.id !== item.id))}
                        className="text-slate-400 hover:text-slate-600"
                        aria-label="Dismiss"
                    >
                        <X className="size-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
