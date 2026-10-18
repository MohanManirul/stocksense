export interface User {
    id: number;
    name: string;
    email: string;
    role: string | null;
    protected: boolean;
    created_at: string | null;
}

export interface UserFormData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: string;
}

export interface UserFilters {
    search?: string;
    page?: string;
}
