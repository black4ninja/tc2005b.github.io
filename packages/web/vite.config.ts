import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Puertos configurables para poder levantar VARIOS worktrees a la vez sin
// colisionar (ver `tools/wt.zsh` y la sección de worktrees en CONTRIBUTING.md).
// `loadEnv` con prefijo vacío lee tanto `packages/web/.env.local` —lo que escribe
// el bootstrap de cada worktree— como el entorno del proceso, así que sirve igual
// para un `VITE_PORT=5174 yarn dev` puntual.
// Los defaults son los del checkout principal: sin `.env.local` nada cambia.
const PUERTO_WEB = 5173;
const PUERTO_API = 3006;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const puertoWeb = Number(env.VITE_PORT) || PUERTO_WEB;
  const puertoApi = Number(env.VITE_API_PORT) || PUERTO_API;

  return {
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
      port: puertoWeb,
      // `strictPort` evita el fallo silencioso de dos worktrees compartiendo
      // dev-server: si el puerto está tomado, Vite falla en vez de saltar al
      // siguiente y quedarse proxeando al API equivocado.
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://localhost:${puertoApi}`,
          changeOrigin: true,
        },
      },
    },
  };
});
