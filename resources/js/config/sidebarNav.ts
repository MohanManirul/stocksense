import { LayoutDashboard, Tags, Truck, type LucideIcon } from 'lucide-react';

export interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    match: (url: string) => boolean;
}

export const sidebarNav: NavItem[] = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (url) => url.startsWith('/admin/dashboard') },
    { href: '/admin/categories', label: 'Categories', icon: Tags, match: (url) => url.startsWith('/admin/categories') },
    { href: '/admin/suppliers', label: 'Suppliers', icon: Truck, match: (url) => url.startsWith('/admin/suppliers') },
];
