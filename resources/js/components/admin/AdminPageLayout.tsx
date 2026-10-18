import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/ui';

interface AdminPageLayoutProps {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
    back?: { href: string; label: string };
    children: ReactNode;
}

export default function AdminPageLayout({ title, description, actions, back, children }: AdminPageLayoutProps) {
    return (
        <>
            <Head title={title} />
            <PageHeader title={title} description={description} actions={actions} back={back} />
            {children}
        </>
    );
}
