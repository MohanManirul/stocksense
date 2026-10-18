import { LayoutDashboard, Package, ShieldCheck, Tags, Truck, Users, type LucideIcon } from 'lucide-react';

export interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    permission?: string;
    match: (url: string) => boolean;
}

export const sidebarNav: NavItem[] = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (url) => url.startsWith('/admin/dashboard') },
    { href: '/admin/products', label: 'Products', icon: Package, permission: 'view products', match: (url) => url.startsWith('/admin/products') },
    { href: '/admin/categories', label: 'Categories', icon: Tags, permission: 'view categories', match: (url) => url.startsWith('/admin/categories') },
    { href: '/admin/suppliers', label: 'Suppliers', icon: Truck, permission: 'view suppliers', match: (url) => url.startsWith('/admin/suppliers') },
    { href: '/admin/users', label: 'Users', icon: Users, permission: 'view users', match: (url) => url.startsWith('/admin/users') },
    { href: '/admin/roles', label: 'Roles', icon: ShieldCheck, permission: 'view roles', match: (url) => url.startsWith('/admin/roles') },
];
