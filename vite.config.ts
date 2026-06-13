/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'serve-calculator-dir-index',
      // Dev-only: the SPA fallback would otherwise serve the journey page for /calculator/.
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const path = (req.url || '').split('?')[0];
          if (path === '/calculator' || path === '/calculator/') {
            req.url = '/calculator/index.html';
          }
          next();
        });
      },
    },
  ],
  build: { outDir: 'dist' },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
});
