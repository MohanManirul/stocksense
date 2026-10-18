import { CircleAlert, CircleCheck, CircleDashed, CircleHelp, PackageCheck, Send, TriangleAlert, XCircle } from 'lucide-react';
import type { PurchaseOrderStatus, ReorderStatus } from '@/types';
import { Badge, type Tone } from './Badge';

const orderTones: Record<PurchaseOrderStatus, { tone: Tone; icon: typeof Send }> = {
    draft: { tone: 'gray', icon: CircleDashed },
    ordered: { tone: 'blue', icon: Send },
    received: { tone: 'green', icon: PackageCheck },
    cancelled: { tone: 'red', icon: XCircle },
};

export function OrderStatusBadge({ status, label }: { status: PurchaseOrderStatus; label: string }) {
    const { tone, icon: Icon } = orderTones[status];

    return (
        <Badge tone={tone} icon={<Icon className="size-3.5" aria-hidden />}>
            {label}
        </Badge>
    );
}

const reorderTones: Record<ReorderStatus, { tone: Tone; icon: typeof Send; label: string }> = {
    critical: { tone: 'red', icon: CircleAlert, label: 'Order now' },
    reorder: { tone: 'amber', icon: TriangleAlert, label: 'Reorder' },
    ok: { tone: 'green', icon: CircleCheck, label: 'Healthy' },
    no_data: { tone: 'gray', icon: CircleHelp, label: 'No sales data' },
};

export function ReorderStatusBadge({ status }: { status: ReorderStatus }) {
    const { tone, icon: Icon, label } = reorderTones[status];

    return (
        <Badge tone={tone} icon={<Icon className="size-3.5" aria-hidden />}>
            {label}
        </Badge>
    );
}

export function StockBadge({ stock, active = true, reorderLevel }: { stock: number; active?: boolean; reorderLevel?: number }) {
    if (!active) {
        return <Badge tone="gray">Inactive</Badge>;
    }

    if (stock <= 0) {
        return <Badge tone="red" icon={<CircleAlert className="size-3.5" aria-hidden />}>Out of stock</Badge>;
    }

    if (reorderLevel !== undefined && stock <= reorderLevel) {
        return <Badge tone="amber" icon={<TriangleAlert className="size-3.5" aria-hidden />}>Low stock</Badge>;
    }

    return <Badge tone="green" icon={<CircleCheck className="size-3.5" aria-hidden />}>In stock</Badge>;
}
