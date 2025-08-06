/**
 * Static Import Test
 * 
 * This test verifies that static imports work correctly between packages,
 * specifically testing if we can import plugin types that depend on shared schemas.
 */

// Test static import of built plugin files (to match dynamic import behavior)
import type { DndCharacterData } from '../../../plugins/dnd-5e-2024/dist/types/dnd/character.mjs';

// Test static import of the plugin class itself from dist
import DnD5e2024Plugin from '../../../plugins/dnd-5e-2024/dist/index.mjs';

console.log('Static imports test:');
console.log('- Plugin class imported successfully:', typeof DnD5e2024Plugin);

// Try to instantiate the plugin
try {
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
  console.log('- Plugin instantiated successfully:', plugin.manifest.name);
} catch (error) {
  console.error('- Plugin instantiation failed:', error);
}

// Just verify the type exists (no runtime check needed for types)
const testType: DndCharacterData = {} as DndCharacterData;
console.log('- Character type imported successfully:', typeof testType);

export { DnD5e2024Plugin, type DndCharacterData };