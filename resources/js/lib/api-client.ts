import { router } from '@inertiajs/react';

const BASE_URL = '/v1';

export type FieldErrors = Record<string, string>;

export type Query = Record<string, string | number | boolean | null | undefined>;

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public errors: FieldErrors = {},
    ) {
        super(message);
    }
}

export function withQuery(path: string, query: Query = {}): string {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '' && value !== false) {
            params.set(key, value === true ? '1' : String(value));
        }
    }

    const search = params.toString();

    return search ? `${path}?${search}` : path;
}

function xsrfToken(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);

    return match ? decodeURIComponent(match[1]) : null;
}

function firstMessages(errors: Record<string, string[] | string> | undefined): FieldErrors {
    return Object.fromEntries(Object.entries(errors ?? {}).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}

async function request<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
    const token = xsrfToken();

    if (token) {
        headers['X-XSRF-TOKEN'] = token;
    }

    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'same-origin',
        signal,
    });

    if (response.status === 401) {
        router.visit('/admin/login');
        throw new ApiError('Your session has expired. Please log in again.', 401);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new ApiError(data?.message || `Request failed with status ${response.status}`, response.status, firstMessages(data?.errors));
    }

    return data as T;
}

export const api = {
    get: <T>(path: string, signal?: AbortSignal) => request<T>('GET', path, undefined, signal),
    post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
    put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
    delete: (path: string) => request<void>('DELETE', path),
};

export function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
