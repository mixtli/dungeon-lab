import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

const r = (p: string) => resolve(__dirname, p);

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.ts', '**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'packs'],
    testTimeout: 10000, // 10 seconds for converter tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'packs/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.spec.ts',
        'src/scripts/',
        'src/character-sheet.vue'
      ],
      include: ['src/**/*.ts'],
      reportsDirectory: './coverage'
    }
  },
  resolve: {
    alias: [
      {
        find: /^@dungeon-lab\/shared$/,
        replacement: r('../../shared/src/index.js')
      },
      {
        find: /^@dungeon-lab\/shared\/(.*)/,
        replacement: r('../../shared/src/$1')
      }
    ],
    extensions: ['.ts', '.ts', '.js', '.js', '.json']
  }
});