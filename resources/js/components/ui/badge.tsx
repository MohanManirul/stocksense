import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet';

const tones: Record<Tone, string> = {
    gray: 'bg-slate-100 text-slate-700 ring-slate-500/20',
    blue: 'bg-brand-50 text-brand-700 ring-brand-500/30',
    green: 'bg-green-50 text-green-800 ring-green-600/25',
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/30',
    red: 'bg-red-50 text-red-700 ring-red-600/25',
    violet: 'bg-violet-50 text-violet-700 ring-violet-600/25',
};

export function Badge({ tone = 'gray', icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', tones[tone], className)}>
            {icon}
            {children}
        </span>
    );
}
