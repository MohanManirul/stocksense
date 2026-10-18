import { CircleAlert, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Alert({ tone = 'error', title, children, action }: { tone?: 'error' | 'info'; title?: string; children: ReactNode; action?: ReactNode }) {
    const Icon = tone === 'error' ? CircleAlert : Info;

    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            className={cn(
                'flex items-start gap-3 rounded-lg px-4 py-3 text-sm ring-1 ring-inset',
                tone === 'error' ? 'bg-red-50 text-red-800 ring-red-200' : 'bg-brand-50 text-brand-700 ring-brand-100',
            )}
        >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
                {title && <p className="font-medium">{title}</p>}
                <div className={cn(title && 'mt-0.5')}>{children}</div>
            </div>
            {action}
        </div>
    );
}
