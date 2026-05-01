import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts', 'components/**/*.tsx'],
      exclude: ['node_modules/', '.next/', 'setupTests.ts']
    },
    include: ['__tests__/**/*.test.{ts,tsx}'],
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});
