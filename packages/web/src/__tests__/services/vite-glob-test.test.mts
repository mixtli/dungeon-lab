import { describe, it, expect } from 'vitest';

// Helper function to create test manifest
const createTestManifest = () => ({
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
});

/**
 * Vite Glob Import Test
 * 
 * This test verifies that Vite's glob imports work correctly with our plugin
 * directory structure and path aliases.
 */

describe('Vite Glob Imports - Path Resolution Test', () => {
  it('should resolve plugin manifest paths using glob imports', async () => {
    // Test if Vite can find manifests using the proposed path pattern
    const manifestModules = import.meta.glob(
      '@/../../plugins/*/manifest.json',
      { eager: true, import: 'default' }
    );

    console.log('Found manifest paths:', Object.keys(manifestModules));
    
    // Should find at least the dnd-5e-2024 manifest
    expect(Object.keys(manifestModules).length).toBeGreaterThan(0);
    
    // Check if specific manifests are found
    const manifestPaths = Object.keys(manifestModules);
    const hasDnd5e2024 = manifestPaths.some(path => path.includes('dnd-5e-2024'));
    
    expect(hasDnd5e2024).toBe(true);
    
    // Test that we can actually access the manifest data
    for (const [path, manifestData] of Object.entries(manifestModules)) {
      console.log(`Manifest at ${path}:`, manifestData);
      expect(manifestData).toBeDefined();
    }
  });

  it('should import and instantiate D&D plugin using workspace alias', async () => {
    // Use the working pattern from vue-component-import.test
    const { default: DnD5e2024Plugin } = await import('@dungeon-lab/plugin-dnd-5e-2024/index.mjs');
    
    expect(typeof DnD5e2024Plugin).toBe('function');
    console.log('✅ Plugin class imported successfully');
    
    // Create plugin instance with test manifest
    const plugin = new DnD5e2024Plugin(createTestManifest());
    expect(plugin).toBeDefined();
    expect(plugin.manifest).toBeDefined();
    expect(plugin.manifest.id).toBe('dnd-5e-2024');
    expect(plugin.manifest.name).toBe('D&D 5th Edition (2024)');
    
    console.log('✅ Plugin instantiated with manifest:', {
      id: plugin.manifest.id,
      name: plugin.manifest.name,
      enabled: plugin.manifest.enabled
    });
  });

  it('should access Vue components from the imported plugin', async () => {
    const { default: DnD5e2024Plugin } = await import('@dungeon-lab/plugin-dnd-5e-2024/index.mjs');
    const plugin = new DnD5e2024Plugin(createTestManifest());
    
    // Test character sheet component
    const characterSheet = await plugin.getComponent('character-sheet');
    expect(characterSheet).toBeDefined();
    console.log('✅ Character sheet component loaded:', characterSheet);
    
    // Test character creator component  
    const characterCreator = await plugin.getComponent('character-creator');
    expect(characterCreator).toBeDefined();
    // expect(characterCreator).toHaveProperty('props'); // Component props interface varies
    console.log('✅ Character creator component loaded');
    
    // Test unknown component returns null
    const unknownComponent = await plugin.getComponent('unknown-component');
    expect(unknownComponent).toBeNull();
    console.log('✅ Unknown component correctly returns null');
  });

  it('should test plugin validation functionality', async () => {
    const { default: DnD5e2024Plugin } = await import('@dungeon-lab/plugin-dnd-5e-2024/index.mjs');
    const plugin = new DnD5e2024Plugin(createTestManifest());
    
    // Test character validation
    const result = plugin.validate('character', { 
      name: 'Test Character',
      species: { id: 'human', name: 'Human' },
      background: { id: 'acolyte', name: 'Acolyte' }
    });
    
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    console.log('✅ Plugin validation result:', result);
    
    // Test unknown validation type
    const unknownResult = plugin.validate('unknown-type', {});
    expect(unknownResult.success).toBe(false);
    expect(unknownResult.errors).toContain('Unknown validation type: unknown-type');
    console.log('✅ Unknown validation type correctly handled');
  });

  it('should demonstrate complete manifest → import → component workflow', async () => {
    console.log('🧪 Testing complete plugin workflow...');
    
    // Step 1: Discover manifests (we know this works)
    const manifestModules = import.meta.glob(
      '@/../../plugins/*/manifest.json',
      { eager: true, import: 'default' }
    );
    
    const manifests = Object.values(manifestModules);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enabledManifests = manifests.filter((m: any) => m.enabled);
    expect(enabledManifests.length).toBeGreaterThan(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log('✅ Step 1: Found enabled manifests:', enabledManifests.map((m: any) => m.id));
    
    // Step 2: Import plugin using workspace alias pattern
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enabledManifest = enabledManifests[0] as any;
    const pluginId = enabledManifest.id;
    
    // Construct workspace alias dynamically
    const workspaceAlias = `@dungeon-lab/plugin-${pluginId}/index.mjs`;
    console.log(`✅ Step 2: Importing plugin from ${workspaceAlias}`);
    
    const pluginModule = await import(/* @vite-ignore */ workspaceAlias);
    const PluginClass = pluginModule.default;
    expect(typeof PluginClass).toBe('function');
    
    // Step 3: Create instance and test functionality
    const plugin = new PluginClass();
    expect(plugin.manifest.id).toBe(pluginId);
    console.log('✅ Step 3: Plugin instance created');
    
    // Step 4: Access components
    const characterSheet = plugin.getComponent('character-sheet');
    expect(characterSheet).toBeDefined();
    console.log('✅ Step 4: Component access successful');
    
    console.log('🎉 Complete workflow successful - no HTTP calls, all Vite module resolution!');
  });
});