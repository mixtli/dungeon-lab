import { describe, it, expect } from 'vitest';

/**
 * Vue Component Import Test with Vitest
 * 
 * This test checks if Vitest can handle Vue component imports
 * that are causing issues with our plugin loading.
 */

describe('Vue Component Import with Vitest', () => {
  it('should import character types using workspace aliases (like tsx script)', async () => {
    // Use the same pattern that works in the tsx script - source files
    const typesModule = await import('@dungeon-lab/plugin-dnd-5e-2024/types/dnd/character.mjs');
    expect(typesModule.dndCharacterDataSchema).toBeDefined();
    
    console.log('✅ Character types import successful in Vitest with workspace alias');
  });

  it('should import plugin with Vue components using workspace alias', async () => {
    try {
      // Test importing the plugin with Vue components using workspace alias - source files
      const { default: DnD5e2024Plugin } = await import('@dungeon-lab/plugin-dnd-5e-2024/index.mjs');
      
      expect(typeof DnD5e2024Plugin).toBe('function');
      
      // Try to instantiate
      const plugin = new DnD5e2024Plugin();
      expect(plugin).toBeDefined();
      expect(plugin.manifest.id).toBe('dnd-5e-2024');
      
      // Test component access
      const characterSheet = plugin.getComponent('character-sheet');
      expect(characterSheet).toBeDefined();
      
      console.log('✅ Vitest successfully imported plugin with Vue components!');
      console.log('Character sheet component:', characterSheet);
      
    } catch (error) {
      console.error('❌ Vitest Vue component import failed:', error.message);
      
      // Check if it's the same Vue file extension error
      if (error.message.includes('.vue')) {
        console.log('🔍 Same Vue file extension issue in Vitest as tsx');
      }
      
      throw error;
    }
  });

});