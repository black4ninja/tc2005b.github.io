import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  publicDir: path.resolve(__dirname, '../../static-legacy'),
  build: {
    outDir: '../../dist/web',
    emptyOutDir: true,
    copyPublicDir: false,
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      },
    },
  },
});
