export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

export type ReorderStatus = 'critical' | 'reorder' | 'ok' | 'no_data';

export interface ApiResponse<T> {
    message: string;
    data: T;
}

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    roles: string[];
}

export interface SharedProps {
    appName: string;
    auth: { user: AuthUser | null; permissions: string[] };
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

