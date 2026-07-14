import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    /**
     * Sin esto, vitest recorre TODO el repo y arrastra los `.test.js` que viven
     * bajo `deprecated/` — ejercicios de un curso de JS archivados ahí, ajenos al
     * proyecto. Uno de ellos importa un archivo que no existe, así que `yarn test`
     * terminaba SIEMPRE en rojo aunque los tests reales pasaran.
     *
     * Una suite que siempre sale roja deja de servir como señal: cuando algo se
     * rompa de verdad, el rojo se verá igual que el de siempre. Por eso se acota
     * a los tests del proyecto en vez de arreglar el ejercicio archivado.
     */
    include: ['packages/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', 'deprecated/**'],
  },
});
