import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

const r = (p: string) => resolve(__dirname, p);

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.ts', '**/*.{test,spec}.mts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 1000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
    }
  },
  resolve: {
    alias: [
      {
        find: /^@dungeon-lab\/shared$/,
        replacement: r('../shared/src/index.mjs')
      },
      {
        find: /^@dungeon-lab\/shared\/(.*)/,
        replacement: r('../shared/src/$1')
      }
    ],
    extensions: ['.mts', '.ts', '.mjs', '.js', '.json']
  }
}); 