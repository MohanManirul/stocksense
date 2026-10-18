import { api } from '@/lib/api-client';
import type { ApiResponse } from '@/types';
import type { PermissionGroup, Role, RoleFormData } from './types';

export async function getRoles(signal: AbortSignal): Promise<Role[]> {
    const response = await api.get<ApiResponse<Role[]>>('/admin/roles', signal);

    return response.data;
}

export async function getRole(id: number, signal: AbortSignal): Promise<Role> {
    const response = await api.get<ApiResponse<Role>>(`/admin/roles/${id}`, signal);

    return response.data;
}

export async function getPermissionGroups(signal: AbortSignal): Promise<PermissionGroup[]> {
    const response = await api.get<ApiResponse<PermissionGroup[]>>('/admin/roles/permission-groups', signal);

    return response.data;
}

export async function createRole(data: RoleFormData): Promise<Role> {
    const response = await api.post<ApiResponse<Role>>('/admin/roles', data);

    return response.data;
}

export async function updateRole(id: number, data: RoleFormData): Promise<Role> {
    const response = await api.put<ApiResponse<Role>>(`/admin/roles/${id}`, data);

    return response.data;
}

export function deleteRole(id: number): Promise<void> {
    return api.delete(`/admin/roles/${id}`);
}
