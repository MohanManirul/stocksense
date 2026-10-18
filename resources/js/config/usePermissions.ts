import { usePage } from '@inertiajs/react';
import type { Permissions, SharedProps } from '@/types';

const none: Permissions = { manageCatalog: false, manageCategories: false, manageSuppliers: false, managePurchaseOrders: false };

export function usePermissions(): Permissions {
    return usePage<SharedProps>().props.auth.can ?? none;
}
