import { useCallback, useEffect, useState } from 'react';

export type ApiState<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: T };

export function useApi<T>(load: (signal: AbortSignal) => Promise<T>) {
    const [state, setState] = useState<ApiState<T>>({ status: 'loading' });
    const [refreshing, setRefreshing] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setRefreshing(true);
        setState((current) => (current.status === 'success' ? current : { status: 'loading' }));

        load(controller.signal)
            .then((data) => setState({ status: 'success', data }))
            .catch((error: Error) => {
                if (error.name !== 'AbortError') {
                    setState({ status: 'error', message: error.message });
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setRefreshing(false);
                }
            });

        return () => controller.abort();
    }, [load, attempt]);

    const reload = useCallback(() => setAttempt((value) => value + 1), []);

    return { state, reload, refreshing };
}
