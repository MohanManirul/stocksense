import { Head, useForm } from '@inertiajs/react';
import { Boxes, LogIn } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input } from '@/components/ui/field';

interface DemoAccount {
    role: string;
    email: string;
    password: string;
}

export default function Login({ demo }: { demo: DemoAccount[] | null }) {
    const form = useForm({ email: '', password: '', remember: false });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/login', { onFinish: () => form.reset('password') });
    };

    return (
        <div className="flex min-h-full flex-col justify-center bg-slate-50 px-4 py-12">
            <Head title="Log in" />
            <div className="mx-auto w-full max-w-sm">
                <div className="mb-8 flex flex-col items-center text-center">
                    <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                        <Boxes className="size-6" aria-hidden />
                    </span>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in to StockSense</h1>
                    <p className="mt-1 text-sm text-slate-500">Inventory, sales and smart reordering for small shops.</p>
                </div>

                <form onSubmit={submit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200" noValidate>
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

                {demo && (
                    <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white/60 p-4">
                        <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Demo accounts</p>
                        <ul className="space-y-2">
                            {demo.map((account) => (
                                <li key={account.email} className="flex items-center justify-between gap-3 text-sm">
                                    <span className="min-w-0">
                                        <span className="font-medium text-slate-800">{account.role}</span>
                                        <span className="block truncate text-slate-500">
                                            {account.email} · {account.password}
                                        </span>
                                    </span>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => form.setData({ email: account.email, password: account.password, remember: false })}
                                    >
                                        Use
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
