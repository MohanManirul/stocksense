import { api, withQuery } from '@/lib/api-client';
import type { ApiResponse, Paginated } from '@/types';
import type { PurchaseOrder, PurchaseOrderFilters, PurchaseOrderFormData, PurchaseOrderOptions } from './types';

export function getPurchaseOrders(filters: PurchaseOrderFilters, signal: AbortSignal): Promise<Paginated<PurchaseOrder>> {
    return api.get<Paginated<PurchaseOrder>>(withQuery('/admin/purchase-orders', { ...filters, per_page: 15 }), signal);
}

export async function getPurchaseOrder(id: number, signal: AbortSignal): Promise<PurchaseOrder> {
    const response = await api.get<ApiResponse<PurchaseOrder>>(`/admin/purchase-orders/${id}`, signal);

    return response.data;
}

export async function getPurchaseOrderOptions(signal: AbortSignal): Promise<PurchaseOrderOptions> {
    const response = await api.get<ApiResponse<PurchaseOrderOptions>>('/admin/purchase-orders/options', signal);

    return response.data;
}

function payload(data: PurchaseOrderFormData) {
    return {
        supplier_id: data.supplier_id,
        expected_at: data.expected_at || null,
        notes: data.notes,
        items: data.items.map(({ product_id, quantity, unit_cost }) => ({ product_id, quantity, unit_cost })),
    };
}

export async function createPurchaseOrder(data: PurchaseOrderFormData): Promise<PurchaseOrder> {
    const response = await api.post<ApiResponse<PurchaseOrder>>('/admin/purchase-orders', payload(data));

    return response.data;
}

export async function updatePurchaseOrder(id: number, data: PurchaseOrderFormData): Promise<PurchaseOrder> {
    const response = await api.put<ApiResponse<PurchaseOrder>>(`/admin/purchase-orders/${id}`, payload(data));

    return response.data;
}

export function deletePurchaseOrder(id: number): Promise<void> {
    return api.delete(`/admin/purchase-orders/${id}`);
}

export async function changePurchaseOrderStatus(id: number, action: 'place' | 'receive' | 'cancel'): Promise<PurchaseOrder> {
    const response = await api.post<ApiResponse<PurchaseOrder>>(`/admin/purchase-orders/${id}/${action}`);

    return response.data;
}
