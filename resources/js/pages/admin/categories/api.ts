import { api } from '@/lib/api-client';
import type { ApiResponse } from '@/types';
import type { Category, CategoryForm } from './types';

export async function getCategories(signal: AbortSignal): Promise<Category[]> {
    const response = await api.get<ApiResponse<Category[]>>('/admin/categories', signal);

    return response.data;
}

export async function createCategory(data: CategoryForm): Promise<Category> {
    const response = await api.post<ApiResponse<Category>>('/admin/categories', data);

    return response.data;
}

export async function updateCategory(id: number, data: CategoryForm): Promise<Category> {
    const response = await api.put<ApiResponse<Category>>(`/admin/categories/${id}`, data);

    return response.data;
}

export function deleteCategory(id: number): Promise<void> {
    return api.delete(`/admin/categories/${id}`);
}
