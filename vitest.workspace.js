import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  './vite.config.ts',
  './packages/server/vitest.config.ts',
  './packages/web/vite.config.ts',
]);
