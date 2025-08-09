// Main shared package index (Vue-free)
// All Vue-specific code has been moved to @dungeon-lab/shared-ui

// Re-export utils (universal, no Vue/browser dependencies)
export * from './utils/index.mjs';

// Re-export base classes (universal, no Vue/browser dependencies)  
export * from './base/index.mjs';

// For types and schemas, consumers should import from specific barrel files:
// - @dungeon-lab/shared/types/index.mjs
// - @dungeon-lab/shared/schemas/index.mjs
// - @dungeon-lab/shared/validation/index.mjs
// - @dungeon-lab/shared/base/index.mjs
// 
// For Vue components and plugin interfaces, use:
// - @dungeon-lab/shared-ui (Vue components and plugin base classes)
