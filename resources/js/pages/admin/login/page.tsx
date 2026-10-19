import { Head, router, useForm } from '@inertiajs/react';
import { Boxes, LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button, Checkbox, Field, Input } from '@/components/ui';
import type { DemoAccount } from './types';

export default function Login({ demo }: { demo: DemoAccount[] | null }) {
    const form = useForm({ email: '', password: '', remember: false });
    const [signingIn, setSigningIn] = useState<number | null>(null);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/admin/login', { onFinish: () => form.reset('password') });
    };

    const use = (account: DemoAccount) => {
        router.post(`/admin/demo-login/${account.id}`, {}, {
            onStart: () => setSigningIn(account.id),
            onFinish: () => setSigningIn(null),
        });
    };

    return (
        <div className="flex min-h-full flex-col justify-center bg-[radial-gradient(circle_at_top,#1e293b,#0f172a)] px-4 py-12">
            <Head title="Log in" />
            <div className="mx-auto w-full max-w-sm">
                <div className="mb-8 flex flex-col items-center text-center">
                    <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                        <Boxes className="size-6" aria-hidden />
                    </span>
                    <h1 className="text-2xl font-semibold tracking-tight text-white">Sign in to StockSense</h1>
                    <p className="mt-1 text-sm text-slate-400">Inventory, sales and smart reordering for small shops.</p>
                </div>

                <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-2xl shadow-black/40" noValidate>
                    <Field label="Email" error={form.errors.email}>
                        {(field) => (
                            <Input
                                {...field}
                                type="email"
                                autoComplete="username"
                                autoFocus
                                value={form.data.email}
                                onChange={(event) => form.setData('email', event.target.value)}
                                error={form.errors.email}
                            />
                        )}
                    </Field>
                    <Field label="Password" error={form.errors.password}>
                        {(field) => (
                            <Input
                                {...field}
                                type="password"
                                autoComplete="current-password"
                                value={form.data.password}
                                onChange={(event) => form.setData('password', event.target.value)}
                                error={form.errors.password}
                            />
                        )}
                    </Field>
                    <Checkbox label="Remember me" checked={form.data.remember} onChange={(event) => form.setData('remember', event.target.checked)} />
                    <Button type="submit" className="w-full" processing={form.processing} icon={<LogIn className="size-4" aria-hidden />}>
                        Log in
                    </Button>
                </form>

                {demo && demo.length > 0 && (
                    <div className="mt-6 rounded-xl border border-dashed border-slate-700 bg-[#111c33] p-4">
                        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Demo accounts</p>
                        <ul className="max-h-72 space-y-2 overflow-y-auto">
                            {demo.map((account) => (
                                <li key={account.id} className="flex items-center justify-between gap-3 text-sm">
                                    <span className="min-w-0">
                                        <span className="font-medium text-slate-100">{account.name}</span>
                                        <span className="ml-1.5 text-xs text-slate-400 capitalize">{account.role?.replace('-', ' ') ?? 'no role'}</span>
                                        <span className="block truncate text-slate-400">{account.email}</span>
                                    </span>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        processing={signingIn === account.id}
                                        disabled={signingIn !== null}
                                        onClick={() => use(account)}
                                    >
                                        Use
                                    </Button>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-3 text-xs text-slate-400">Demo mode: “Use” signs you straight in as that account.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
