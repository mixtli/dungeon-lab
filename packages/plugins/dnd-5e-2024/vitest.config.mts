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
        '**/*.test.mts',
        '**/*.spec.ts',
        '**/*.spec.mts',
        'src/scripts/',
        'src/character-sheet.vue'
      ],
      include: ['src/**/*.mts'],
      reportsDirectory: './coverage'
    }
  },
  resolve: {
    alias: [
      {
        find: /^@dungeon-lab\/shared$/,
        replacement: r('../../shared/src/index.mjs')
      },
      {
        find: /^@dungeon-lab\/shared\/(.*)/,
        replacement: r('../../shared/src/$1')
      }
    ],
    extensions: ['.mts', '.ts', '.mjs', '.js', '.json']
  }
});