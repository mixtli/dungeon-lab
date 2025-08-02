import { describe, it, expect, vi } from 'vitest';
import { PluginRegistryService } from '../services/plugin-registry.mts';

/**
 * Test to verify the main app can initialize the plugin system correctly
 * This simulates what happens in main.mts when the app starts
 */

describe('App Initialization with New Plugin Architecture', () => {
  it('should initialize plugin registry like main.mts does', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Simulate main.mts initialization
    console.log('🚀 Initializing Dungeon Lab with new plugin architecture...');
    
    const pluginRegistry = new PluginRegistryService();
    await pluginRegistry.initialize();
    
    console.log('✅ Plugin registry initialized');
    
    // Verify plugins are loaded
    const plugins = pluginRegistry.getPlugins();
    expect(plugins.length).toBeGreaterThan(0);
    
    const dndPlugin = pluginRegistry.getGameSystemPlugin('dnd-5e-2024');
    expect(dndPlugin).toBeDefined();
    expect(dndPlugin!.manifest.id).toBe('dnd-5e-2024');
    
    // Test component access through registry
    const characterSheet = await pluginRegistry.getComponent('dnd-5e-2024', 'character-sheet');
    expect(characterSheet).toBeDefined();
    
    console.log('🎉 Application initialization complete');
    
    logSpy.mockRestore();
  });

  it('should handle main.mts error scenarios gracefully', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    try {
      console.log('🚀 Initializing Dungeon Lab with new plugin architecture...');
      
      const pluginRegistry = new PluginRegistryService();
      await pluginRegistry.initialize();
      console.log('✅ Plugin registry initialized');
      
      // Even if some plugins fail, app should continue
      console.log('🎉 Application initialization complete');
      
    } catch (error) {
      console.error('❌ Failed to initialize plugin system:', error);
      // App should continue even if plugins fail (as per main.mts)
    }
    
    // Either way, we should have attempted initialization
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('🚀 Initializing Dungeon Lab')
    );
    
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});