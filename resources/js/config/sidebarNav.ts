import { LayoutDashboard, type LucideIcon } from 'lucide-react';

export interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    match: (url: string) => boolean;
}

export const sidebarNav: NavItem[] = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (url) => url.startsWith('/admin/dashboard') },
];
