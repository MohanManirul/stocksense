import { CircleDashed, PackageCheck, Send, XCircle } from 'lucide-react';
import { Fragment } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui';
import { dateTimeLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PurchaseOrder } from '../types';

type FlowStep = {
    label: string;
    at: string | null;
    icon: typeof Send;
    isCurrent: boolean;
    isCancelled?: boolean;
};

/**
 * Draft → Ordered → Received, with the order's current position highlighted.
 * A cancelled order ends at a red "Cancelled" step after the last one it reached.
 */
export default function StatusFlow({ order }: { order: PurchaseOrder }) {
    const mainSteps: FlowStep[] = [
        { label: 'Draft', at: order.created_at, icon: CircleDashed, isCurrent: order.status === 'draft' },
        { label: 'Ordered', at: order.ordered_at, icon: Send, isCurrent: order.status === 'ordered' },
        { label: 'Received', at: order.received_at, icon: PackageCheck, isCurrent: order.status === 'received' },
    ];

    const steps =
        order.status === 'cancelled'
            ? [...mainSteps.filter((step) => step.at !== null), { label: 'Cancelled', at: order.cancelled_at, icon: XCircle, isCurrent: true, isCancelled: true }]
            : mainSteps;

    return (
        <Card>
            <CardHeader title="Status flow" description="Draft → Ordered → Received. Drafts and placed orders can be cancelled." />
            <CardBody>
                <ol className="flex items-start">
                    {steps.map((step, index) => (
                        <Fragment key={step.label}>
                            {index > 0 && (
                                <li aria-hidden className={cn('mt-5 h-0.5 flex-1', step.at ? (step.isCancelled ? 'bg-red-300' : 'bg-emerald-400') : 'bg-slate-200')} />
                            )}
                            <FlowNode step={step} />
                        </Fragment>
                    ))}
                </ol>
            </CardBody>
        </Card>
    );
}

function FlowNode({ step }: { step: FlowStep }) {
    const isReached = step.at !== null;
    const Icon = step.icon;

    return (
        <li className="flex w-20 shrink-0 flex-col items-center text-center sm:w-28" aria-current={step.isCurrent ? 'step' : undefined}>
            <span
                className={cn(
                    'flex size-10 items-center justify-center rounded-full ring-2',
                    step.isCancelled
                        ? 'bg-red-50 text-red-600 ring-red-500'
                        : isReached
                          ? 'bg-emerald-50 text-emerald-600 ring-emerald-500'
                          : 'bg-white text-slate-400 ring-slate-200',
                    step.isCurrent && 'ring-4 ring-offset-2',
                )}
            >
                <Icon className="size-5" aria-hidden />
            </span>
            <p className={cn('mt-2 text-sm font-medium', isReached ? 'text-slate-900' : 'text-slate-400')}>{step.label}</p>
            <p className="text-xs text-slate-500">{step.at ? dateTimeLabel(step.at) : 'Pending'}</p>
        </li>
    );
}
