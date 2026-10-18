import { useCallback, useState } from 'react';
import { Badge, Card, CardHeader, EmptyState, LoadError, Pagination, Table, TableSkeleton, Tbody, Td, Th } from '@/components/ui';
import { useApi } from '@/config/useApi';
import { dateTimeLabel, signed } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getStockMovements } from '../api';

const movementTone = { opening: 'gray', sale: 'blue', purchase: 'green', adjustment: 'amber' } as const;

export default function StockLedger({ productId }: { productId: number }) {
    const [page, setPage] = useState(1);
    const load = useCallback((signal: AbortSignal) => getStockMovements(productId, page, signal), [productId, page]);
    const { state, reload, refreshing } = useApi(load);

    return (
        <Card className="mt-6">
            <CardHeader title="Stock ledger" description="Every change to this product’s stock, newest first" />
            {state.status === 'loading' && <TableSkeleton rows={5} />}
            {state.status === 'error' && (
                <div className="p-4 sm:px-5">
                    <LoadError message={state.message} onRetry={reload} />
                </div>
            )}
            {state.status === 'success' &&
                (state.data.data.length === 0 ? (
                    <EmptyState title="No stock movements yet" description="Opening stock, sales, purchases and adjustments will appear here." />
                ) : (
                    <div className={cn('transition-opacity', refreshing && 'opacity-60')}>
                        <Table>
                            <thead>
                                <tr>
                                    <Th>When</Th>
                                    <Th>Type</Th>
                                    <Th className="hidden md:table-cell">Reference</Th>
                                    <Th className="hidden lg:table-cell">By</Th>
                                    <Th align="right">Change</Th>
                                    <Th align="right">Balance</Th>
                                </tr>
                            </thead>
                            <Tbody>
                                {state.data.data.map((movement) => (
                                    <tr key={movement.id}>
                                        <Td className="whitespace-nowrap text-slate-500">{dateTimeLabel(movement.occurred_at)}</Td>
                                        <Td>
                                            <Badge tone={movementTone[movement.type]}>{movement.type_label}</Badge>
                                            {movement.note && <p className="mt-1 text-xs text-slate-500">{movement.note}</p>}
                                        </Td>
                                        <Td className="hidden md:table-cell">{movement.reference?.number ?? <span className="text-slate-400">—</span>}</Td>
                                        <Td className="hidden lg:table-cell">{movement.user?.name ?? '—'}</Td>
                                        <Td align="right" className={cn('font-medium', movement.quantity < 0 ? 'text-red-700' : 'text-green-800')}>
                                            {signed(movement.quantity)}
                                        </Td>
                                        <Td align="right" className="font-medium text-slate-900">
                                            {movement.balance_after}
                                        </Td>
                                    </tr>
                                ))}
                            </Tbody>
                        </Table>
                    </div>
                ))}
            {state.status === 'success' && <Pagination meta={state.data.meta} onPageChange={setPage} />}
        </Card>
    );
}
