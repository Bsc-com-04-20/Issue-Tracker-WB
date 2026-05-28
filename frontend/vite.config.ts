import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const proxyConfig = {
  '/api-proxy': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/api-proxy/, ''),
  },
  '/issue': { target: 'http://localhost:3000', changeOrigin: true },
  '/auth': { target: 'http://localhost:3000', changeOrigin: true },
  '/user': { target: 'http://localhost:3000', changeOrigin: true },
  '/report': { target: 'http://localhost:3000', changeOrigin: true },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': '/src' },
  },
  server: {
    port: 5173,
    proxy: proxyConfig,
  },
  preview: {
    port: 5173,
    proxy: proxyConfig,
  },
});
