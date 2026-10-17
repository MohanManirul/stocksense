import { Head, usePage } from '@inertiajs/react';

export default function Dashboard() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Dashboard" />
            <div className="p-8">
                <h1 className="text-2xl font-semibold">StockSense</h1>
                <p className="mt-2 text-gray-600">
                    {auth.user ? `Welcome, ${auth.user.name}` : 'Inertia + React + TypeScript is working.'}
                </p>
            </div>
        </>
    );
}
