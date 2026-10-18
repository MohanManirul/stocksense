export interface Role {
    id: number;
    name: string;
    permissions?: string[];
    permissions_count?: number;
    users_count?: number;
    protected: boolean;
}

export interface PermissionGroup {
    module: string;
    permissions: string[];
}

export interface RoleFormData {
    name: string;
    permissions: string[];
}
