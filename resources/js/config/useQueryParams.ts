import { router, usePage } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';

type Params = Record<string, string | undefined>;

export function useQueryParams() {
    const { url } = usePage();
    const [pathname, search = ''] = url.split('?');

    const params = useMemo<Params>(() => Object.fromEntries(new URLSearchParams(search)), [search]);

    const update = useCallback(
        (next: Params) => {
            const query = Object.fromEntries(Object.entries({ ...params, ...next }).filter((entry): entry is [string, string] => Boolean(entry[1])));
            router.get(pathname, query, { preserveState: true, preserveScroll: true, replace: true });
        },
        [params, pathname],
    );

    return [params, update] as const;
}
