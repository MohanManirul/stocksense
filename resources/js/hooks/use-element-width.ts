import { useEffect, useRef, useState } from 'react';

export function useElementWidth<T extends HTMLElement>(fallback = 640) {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(fallback);

    useEffect(() => {
        if (!ref.current) {
            return;
        }

        const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.floor(entry.contentRect.width))));
        observer.observe(ref.current);

        return () => observer.disconnect();
    }, []);

    return [ref, width] as const;
}
