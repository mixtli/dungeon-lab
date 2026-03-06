import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@dungeon-lab/shared': path.resolve(__dirname, '../../shared/src'),
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    globals: true,
    environment: 'node'
  }
}); 