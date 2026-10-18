import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Table({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('overflow-x-auto', className)}>
            <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
        </div>
    );
}

export function Th({ className, align = 'left', ...props }: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
    return (
        <th
            scope="col"
            className={cn(
                'bg-slate-50 px-4 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5',
                align === 'right' && 'text-right',
                align === 'center' && 'text-center',
                align === 'left' && 'text-left',
                className,
            )}
            {...props}
        />
    );
}

export function Td({ className, align = 'left', ...props }: TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' | 'center' }) {
    return (
        <td
            className={cn(
                'px-4 py-3 first:pl-4 sm:first:pl-5 last:pr-4 sm:last:pr-5',
                align === 'right' && 'tabular text-right',
                align === 'center' && 'text-center',
                className,
            )}
            {...props}
        />
    );
}

export function Tbody({ children }: { children: ReactNode }) {
    return <tbody className="divide-y divide-slate-100 bg-white text-slate-700">{children}</tbody>;
}
