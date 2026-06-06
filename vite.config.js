import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        host: '127.0.0.1',
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
    build: {
        outDir: 'public/build',
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    // Vendor chunks for better caching
                    if (id.includes('node_modules/lucide-react')) return 'vendor-lucide';
                    if (id.includes('node_modules/recharts')) return 'vendor-recharts';
                    if (id.includes('node_modules/country-flag-icons')) return 'vendor-flags';
                    if (id.includes('node_modules/jsbarcode')) return 'vendor-barcode';
                    if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) return 'vendor-i18n';
                },
            },
        },
    },
});
