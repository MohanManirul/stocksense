import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    // VITE_PORT must match the port published in compose.yaml,
    // or the browser cannot reach the dev server inside the container.
    const env = loadEnv(mode, process.cwd(), '');
    const port = Number(env.VITE_PORT || 5173);

    return {
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'resources/js'),
            },
        },
        plugins: [
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.tsx'],
                refresh: true,
                fonts: [
                    bunny('Instrument Sans', {
                        weights: [400, 500, 600],
                    }),
                ],
            }),
            react(),
            tailwindcss(),
        ],
        server: {
            host: true,
            port,
            strictPort: true,
            hmr: { host: 'localhost', clientPort: port },
            watch: {
                ignored: ['**/vendor/**', '**/storage/**', '**/public/build/**'],
            },
        },
    };
});
