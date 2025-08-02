import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@dungeon-lab/shared': path.resolve(__dirname, '../shared/src'),
      '@dungeon-lab/client': path.resolve(__dirname, '../client/src'),
      '@dungeon-lab/plugin-dnd-5e-2024': path.resolve(__dirname, '../plugins/dnd-5e-2024/src'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
