import { LoaderCircle, RotateCw } from 'lucide-react';
import { Alert } from './Alert';
import { Button } from './Button';
import { Card } from './Card';

export function Spinner({ label = 'Loading' }: { label?: string }) {
    return (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500" role="status">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            {label}
        </div>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className ?? ''}`} />;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
    return (
        <div className="space-y-3 px-4 py-4 sm:px-5" aria-busy="true" aria-label="Loading">
            {Array.from({ length: rows }, (_, index) => (
                <Skeleton key={index} className="h-9" />
            ))}
        </div>
    );
}

export function PageSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading">
            <Skeleton className="mb-3 h-4 w-24" />
            <Skeleton className="mb-6 h-8 w-64" />
            <Card>
                <TableSkeleton rows={5} />
            </Card>
        </div>
    );
}

export function LoadError({ message, onRetry, title = 'This couldn’t be loaded' }: { message: string; onRetry: () => void; title?: string }) {
    return (
        <Alert
            title={title}
            action={
                <Button variant="secondary" size="sm" onClick={onRetry} icon={<RotateCw className="size-3.5" aria-hidden />}>
                    Retry
                </Button>
            }
        >
            {message}
        </Alert>
    );
}
