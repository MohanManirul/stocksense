import type { Paginated } from '@/types';
import { cn } from '@/lib/cn';

type Meta = Paginated<unknown>['meta'];

const pageOf = (url: string) => Number(new URL(url, window.location.origin).searchParams.get('page') ?? 1);

export function Pagination({ meta, onPageChange }: { meta: Meta; onPageChange: (page: number) => void }) {
    if (meta.last_page <= 1) {
        return meta.total > 0 ? <Summary meta={meta} /> : null;
    }

    return (
        <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5" aria-label="Pagination">
            <Summary meta={meta} />
            <div className="flex flex-wrap gap-1">
                {meta.links.map((link, index) => {
                    const label = link.label.replace('&laquo;', '‹').replace('&raquo;', '›').replace(/Previous|Next/, '').trim();

                    return link.url ? (
                        <button
                            key={index}
                            type="button"
                            onClick={() => onPageChange(pageOf(link.url!))}
                            className={cn(
                                'min-w-8 rounded-md px-2.5 py-1 text-center text-sm',
                                link.active ? 'bg-brand-600 font-medium text-white' : 'text-slate-600 hover:bg-slate-100',
                            )}
                            aria-current={link.active ? 'page' : undefined}
                        >
                            {label}
                        </button>
                    ) : (
                        <span key={index} className="min-w-8 rounded-md px-2.5 py-1 text-center text-sm text-slate-300">
                            {label}
                        </span>
                    );
                })}
            </div>
        </nav>
    );
}

function Summary({ meta }: { meta: Meta }) {
    return (
        <p className="px-4 py-3 text-sm text-slate-500 sm:px-5 [nav_&]:p-0">
            Showing <span className="font-medium text-slate-700">{meta.from}</span>–<span className="font-medium text-slate-700">{meta.to}</span> of{' '}
            <span className="font-medium text-slate-700">{meta.total}</span>
        </p>
    );
}
