import '../css/app.css';

import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import AppLayout from '@/layouts/app-layout';

const pages = import.meta.glob('./pages/**/*.tsx');
const appName = import.meta.env.VITE_APP_NAME || 'StockSense';

createInertiaApp({
    title: (title) => (title ? `${title} · ${appName}` : appName),
    resolve: async (name) => {
        const page = pages[`./pages/${name}.tsx`];
        if (!page) {
            throw new Error(`Page not found: ${name}`);
        }
        const module = (await page()) as { default: ResolvedComponent };
        return module.default;
    },
    layout: (name) => (name.startsWith('auth/') ? null : AppLayout),
    setup({ el, App, props }) {
        if (el) {
            createRoot(el).render(<App {...props} />);
        }
    },
    progress: {
        color: '#2a78d6',
        delay: 150,
        showSpinner: false,
    },
});