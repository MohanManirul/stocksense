export interface AuthUser {
    id: number;
    name: string;
    email: string;
}

export interface SharedPageProps {
    auth: {
        user: AuthUser | null;
    };
    flash: {
        success?: string | null;
        error?: string | null;
    };
}

declare module '@inertiajs/core' {
    interface PageProps extends SharedPageProps {}
}
