import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    root: '.',

    plugins: [react()],

    server: {
        host: 'localhost',
        port: 5173,
        strictPort: true,

        watch: {
    usePolling: true,
    interval: 100,
},

        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
});