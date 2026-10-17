import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

// Wraps every non-auth page (see the `layout` option in app.tsx),
// so the header stays mounted while Inertia swaps the page below it.
export default function AppLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage().props;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <header className="border-b border-gray-200 bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                    <Link href="/" className="text-lg font-semibold">
                        StockSense
                    </Link>
                    {auth.user && <span className="text-sm text-gray-600">{auth.user.name}</span>}
                </div>
            </header>
            <main className="mx-auto max-w-6xl px-4">{children}</main>
        </div>
    );
}
