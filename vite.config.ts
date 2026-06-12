/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { outDir: 'dist' },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
});
