import { usePage } from '@inertiajs/react';
import { useCallback } from 'react';
import type { SharedProps } from '@/types';

export function usePermissions() {
    const { permissions } = usePage<SharedProps>().props.auth;

    return useCallback((permission: string) => permissions.includes(permission), [permissions]);
}
