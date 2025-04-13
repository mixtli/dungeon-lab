import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  './vite.config.mts',
  './packages/server/vitest.config.mts',
  './packages/web/vite.config.ts',
]);
