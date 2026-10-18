import { Link, router, usePage } from '@inertiajs/react';
import {
    Boxes,
    ChartNoAxesCombined,
    ClipboardList,
    LayoutDashboard,
    LogOut,
    Menu,
    Package,
    ShoppingCart,
    Tags,
    Truck,
    X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/cn';
import type { SharedProps } from '@/types';

const navigation = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, match: (url: string) => url === '/' },
    { href: '/sales', label: 'Sales', icon: ShoppingCart, match: (url: string) => url.startsWith('/sales') },
    { href: '/products', label: 'Products', icon: Package, match: (url: string) => url.startsWith('/products') },
    { href: '/reorder-suggestions', label: 'Reorder forecast', icon: ChartNoAxesCombined, match: (url: string) => url.startsWith('/reorder-suggestions') },
    { href: '/purchase-orders', label: 'Purchase orders', icon: ClipboardList, match: (url: string) => url.startsWith('/purchase-orders') },
    { href: '/suppliers', label: 'Suppliers', icon: Truck, match: (url: string) => url.startsWith('/suppliers') },
    { href: '/categories', label: 'Categories', icon: Tags, match: (url: string) => url.startsWith('/categories') },
];

export default function AppLayout({ children }: { children: ReactNode }) {
    const { url, props } = usePage<SharedProps>();
    const [open, setOpen] = useState(false);
    const user = props.auth.user;

    useEffect(() => router.on('navigate', () => setOpen(false)), []);

    const sidebar = (
        <div className="flex h-full flex-col">
            <Link href="/" className="flex h-16 items-center gap-2.5 px-5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                    <Boxes className="size-4.5" aria-hidden />
                </span>
                <span className="text-base font-semibold tracking-tight text-slate-900">{props.appName}</span>
            </Link>
            <nav className="flex-1 space-y-0.5 px-3 py-2" aria-label="Main">
                {navigation.map((item) => {
                    const active = item.match(url.split('?')[0]);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                                active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                            )}
                            aria-current={active ? 'page' : undefined}
                        >
                            <item.icon className={cn('size-4.5', active ? 'text-brand-600' : 'text-slate-400')} aria-hidden />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
            {user && (
                <div className="border-t border-slate-200 p-3">
                    <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                            {user.name
                                .split(' ')
                                .map((part) => part[0])
                                .join('')
                                .slice(0, 2)}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                            <p className="truncate text-xs text-slate-500 capitalize">{user.role}</p>
                        </div>
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Log out"
                            title="Log out"
                        >
                            <LogOut className="size-4" />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-full">
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">{sidebar}</aside>

            {open && (
                <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
                    <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="absolute top-4 right-3 rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                            aria-label="Close menu"
                        >
                            <X className="size-5" />
                        </button>
                        {sidebar}
                    </aside>
                </div>
            )}

            <div className="lg:pl-64">
                <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
                    <button type="button" onClick={() => setOpen(true)} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100" aria-label="Open menu">
                        <Menu className="size-5" />
                    </button>
                    <span className="font-semibold text-slate-900">{props.appName}</span>
                </header>
                <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
            </div>

            <Toaster />
        </div>
    );
}
