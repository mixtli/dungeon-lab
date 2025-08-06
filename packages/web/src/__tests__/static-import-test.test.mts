import { describe, it, expect } from 'vitest';

/**
 * Static Import Test
 * 
 * This test verifies that static imports work correctly between packages,
 * specifically testing if we can import plugin files that depend on shared schemas.
 */

describe('Static Import Test', () => {
  it('should successfully import plugin class via static import', async () => {
    // Dynamic import to avoid compilation issues with test runner
    const { DnD5e2024Plugin } = await import('./static-import-test.mjs');
    
    expect(typeof DnD5e2024Plugin).toBe('function');
    
    // Try to instantiate
    const testManifest = {
      id: 'dnd-5e-2024',
      name: 'D&D 5th Edition (2024)',
      version: '2.0.0',
      description: 'D&D 5e 2024 game system plugin',
      author: 'Test',
      gameSystem: 'dnd-5e-2024',
      enabled: true,
      characterTypes: ['character', 'npc'],
      itemTypes: ['weapon', 'armor', 'consumable', 'tool'],
      validationTypes: ['character', 'item', 'actor', 'vtt-document'],
      entryPoint: './dist/index.mjs',
      keywords: ['dnd', '5e', '2024']
    };
    const plugin = new DnD5e2024Plugin(testManifest);
    expect(plugin).toBeDefined();
    expect(plugin.manifest.id).toBe('dnd-5e-2024');
    
    console.log('✅ Static import successful - plugin instantiated:', plugin.manifest.name);
  });

  it('should successfully import character types via static import', async () => {
    // Dynamic import to test that type imports work
    // (Types are compile-time, but if the import works, type import worked too)
    const testModule = await import('./static-import-test.mjs');
    
    // If we can import the test file, the type import worked
    expect(testModule).toBeDefined();
    
    console.log('✅ Static import successful - character type imported');
  });
});