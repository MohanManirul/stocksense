export interface Supplier {
    id: number;
    name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    lead_time_days: number;
    products_count: number;
}

export interface SupplierFormData {
    name: string;
    contact_name: string;
    email: string;
    phone: string;
    lead_time_days: string;
}

export interface SupplierFilters {
    search?: string;
    page?: string;
}
