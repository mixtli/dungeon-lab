import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  "./vite.config.ts",
  "./dist/vite.config.js",
  "./packages/server/vitest.config.ts",
  "./packages/web/vite.config.ts",
  "./dist/packages/web/vite.config.js",
  "./dist/packages/server/vitest.config.js"
])
