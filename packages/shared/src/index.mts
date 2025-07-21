// Main shared package index
// Since all packages now use specific barrel files, this is primarily for convenience

// For backward compatibility and convenience, we can re-export some commonly used items
// Note: Specific barrel files should be preferred for most imports

// Re-export utils (no conflicts)
export * from './utils/index.mjs';

// Re-export base classes (no conflicts)  
export * from './base/index.mjs';

// Note: Component implementations have been removed as they were unused
// Base Vue component classes are still available in './base/index.mjs'

// For types and schemas, consumers should import from specific barrel files:
// - @dungeon-lab/shared/types/index.mjs
// - @dungeon-lab/shared/schemas/index.mjs
// - @dungeon-lab/shared/validation/index.mjs
// - @dungeon-lab/shared/base/index.mjs (for base Vue component classes)
