export type Role = 'owner' | 'staff';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: Role;
}

export interface Permissions {
    manageCatalog: boolean;
    manageCategories: boolean;
    manageSuppliers: boolean;
    managePurchaseOrders: boolean;
}

export interface SharedProps {
    appName: string;
    auth: { user: AuthUser | null; can: Permissions | null };
    errors: Record<string, string>;
    [key: string]: unknown;
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface Paginated<T> {
    data: T[];
    links: { first: string | null; last: string | null; prev: string | null; next: string | null };
    meta: {
        current_page: number;
        last_page: number;
        from: number | null;
        to: number | null;
        total: number;
        per_page: number;
        links: PaginationLink[];
    };
}

export interface NamedRef {
    id: number;
    name: string;
}

