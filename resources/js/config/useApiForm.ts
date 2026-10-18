import { useCallback, useRef, useState } from 'react';
import { ApiError, errorMessage, type FieldErrors } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export function useApiForm<T extends object>(initial: T) {
    const defaults = useRef(initial);
    const [data, setValues] = useState<T>(initial);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [processing, setProcessing] = useState(false);

    const setData = useCallback(<K extends keyof T>(key: K, value: T[K]) => setValues((current) => ({ ...current, [key]: value })), []);

    const reset = useCallback(() => {
        setValues(defaults.current);
        setErrors({});
    }, []);

    const clearErrors = useCallback(() => setErrors({}), []);

    const submit = async <R>(send: (data: T) => Promise<R>): Promise<R | undefined> => {
        setProcessing(true);

        try {
            const result = await send(data);
            setErrors({});

            return result;
        } catch (error) {
            if (error instanceof ApiError && error.status === 422 && Object.keys(error.errors).length > 0) {
                setErrors(error.errors);
                toast.error('Please fix the highlighted fields.');
            } else {
                toast.error(errorMessage(error));
            }

            return undefined;
        } finally {
            setProcessing(false);
        }
    };

    return { data, setData, errors, processing, submit, reset, clearErrors };
}
