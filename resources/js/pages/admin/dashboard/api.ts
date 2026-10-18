import { api } from '@/lib/api-client';
import type { ApiResponse } from '@/types';
import type { DashboardSummary } from './types';

export async function getDashboard(signal: AbortSignal): Promise<DashboardSummary> {
    const response = await api.get<ApiResponse<DashboardSummary>>('/admin/dashboard', signal);

    return response.data;
}
