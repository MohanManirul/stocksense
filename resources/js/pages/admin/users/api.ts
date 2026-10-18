import { api, withQuery } from '@/lib/api-client';
import type { ApiResponse, Paginated } from '@/types';
import type { User, UserFilters, UserFormData } from './types';

export function getUsers(filters: UserFilters, signal: AbortSignal): Promise<Paginated<User>> {
    return api.get<Paginated<User>>(withQuery('/admin/users', { ...filters, per_page: 15 }), signal);
}

export async function getUser(id: number, signal: AbortSignal): Promise<User> {
    const response = await api.get<ApiResponse<User>>(`/admin/users/${id}`, signal);

    return response.data;
}

export async function getRoleOptions(signal: AbortSignal): Promise<string[]> {
    const response = await api.get<ApiResponse<string[]>>('/admin/users/roles', signal);

    return response.data;
}

export async function createUser(data: UserFormData): Promise<User> {
    const response = await api.post<ApiResponse<User>>('/admin/users', data);

    return response.data;
}

export async function updateUser(id: number, data: UserFormData): Promise<User> {
    const response = await api.put<ApiResponse<User>>(`/admin/users/${id}`, data);

    return response.data;
}

export function deleteUser(id: number): Promise<void> {
    return api.delete(`/admin/users/${id}`);
}
