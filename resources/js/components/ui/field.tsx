import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const control =
    'block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500';

const invalid = 'ring-red-400 focus:ring-red-500';

export function controlClasses(error?: string, className?: string) {
    return cn(control, error && invalid, className);
}

interface FieldProps {
    label: string;
    error?: string;
    hint?: ReactNode;
    required?: boolean;
    className?: string;
    children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode;
}

export function Field({ label, error, hint, required, className, children }: FieldProps) {
    const id = useId();
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

    return (
        <div className={className}>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
                {label}
                {required && <span className="ml-0.5 text-red-600">*</span>}
            </label>
            {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
            {error ? (
                <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
                    {error}
                </p>
            ) : (
                hint && (
                    <p id={`${id}-hint`} className="mt-1.5 text-sm text-slate-500">
                        {hint}
                    </p>
                )
            )}
        </div>
    );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: string }>(function Input(
    { error, className, ...props },
    ref,
) {
    return <input ref={ref} className={controlClasses(error, className)} {...props} />;
});

export function Select({ error, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
    return (
        <select className={controlClasses(error, cn('pr-8', className))} {...props}>
            {children}
        </select>
    );
}

export function Textarea({ error, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
    return <textarea className={controlClasses(error, className)} rows={3} {...props} />;
}

export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
    return (
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" {...props} />
            {label}
        </label>
    );
}
