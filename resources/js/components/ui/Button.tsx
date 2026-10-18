import { Link, type InertiaLinkProps } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60';

const variants: Record<Variant, string> = {
    primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
    secondary: 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-300 ring-inset hover:bg-slate-50',
    danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
};

const sizes: Record<Size, string> = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
};

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string) {
    return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    processing?: boolean;
    icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', processing = false, icon, className, children, disabled, ...props }: ButtonProps) {
    return (
        <button type="button" className={buttonClasses(variant, size, className)} disabled={disabled || processing} aria-busy={processing} {...props}>
            {processing ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
            {children}
        </button>
    );
}

interface ButtonLinkProps extends Omit<InertiaLinkProps, 'size'> {
    variant?: Variant;
    size?: Size;
    icon?: ReactNode;
}

export function ButtonLink({ variant = 'primary', size = 'md', icon, className, children, ...props }: ButtonLinkProps) {
    return (
        <Link className={buttonClasses(variant, size, typeof className === 'string' ? className : undefined)} {...props}>
            {icon}
            {children}
        </Link>
    );
}
