import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginRegistryService } from '../../services/plugin-registry.mts';

/**
 * Integration tests for the updated PluginRegistryService
 * These tests verify that the new simplified plugin interface works correctly
 */

describe('PluginRegistryService Integration', () => {
  let registry: PluginRegistryService;

  beforeEach(() => {
    registry = new PluginRegistryService();
  });

  it('should initialize plugin registry without errors', async () => {
    await expect(registry.initialize()).resolves.not.toThrow();
  });

  it('should load D&D plugin and access its components', async () => {
    // Initialize the registry (this loads plugins via discovery)
    await registry.initialize();
    
    // Get the D&D plugin
    const plugin = registry.getGameSystemPlugin('dnd-5e-2024');
    expect(plugin).toBeDefined();
    expect(plugin!.manifest.id).toBe('dnd-5e-2024');
    expect(plugin!.manifest.name).toBe('D&D 5th Edition (2024)');
  });

  it('should get character sheet component from D&D plugin', async () => {
    await registry.initialize();
    
    // Request character sheet component
    const component = await registry.getComponent('dnd-5e-2024', 'character-sheet');
    expect(component).toBeDefined();
    
    // Verify it's a Vue component
    expect(component).toHaveProperty('__name', 'character-sheet');
  });

  it('should get character creator component from D&D plugin', async () => {
    await registry.initialize();
    
    const component = await registry.getComponent('dnd-5e-2024', 'character-creator');
    expect(component).toBeDefined();
    
    // Should be a Vue component
    expect(component).toHaveProperty('props');
  });

  it('should handle unknown component types gracefully', async () => {
    await registry.initialize();
    
    const component = await registry.getComponent('dnd-5e-2024', 'unknown-component');
    expect(component).toBeNull();
  });

  it('should handle unknown plugin IDs gracefully', async () => {
    await registry.initialize();
    
    const component = await registry.getComponent('unknown-plugin', 'character-sheet');
    expect(component).toBeNull();
  });

  it('should provide plugin context to plugins during onLoad', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    await registry.initialize();
    
    // Check that context was provided
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[dnd-5e-2024] Plugin context provided - API access available')
    );
    
    logSpy.mockRestore();
  });

  it('should load plugins only once', async () => {
    await registry.initialize();
    
    const plugin1 = registry.getGameSystemPlugin('dnd-5e-2024');
    const plugin2 = registry.getGameSystemPlugin('dnd-5e-2024');
    
    // Should be the same instance
    expect(plugin1).toBe(plugin2);
  });

  it('should handle plugin validation methods', async () => {
    await registry.initialize();
    
    const plugin = registry.getGameSystemPlugin('dnd-5e-2024');
    expect(plugin).toBeDefined();
    
    // Test new validate method
    const result = plugin!.validate('character', { name: 'Test Character' });
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  });

  it('should maintain plugin manifests correctly', async () => {
    await registry.initialize();
    
    const manifest = registry.getPluginManifest('dnd-5e-2024');
    expect(manifest).toBeDefined();
    expect(manifest!.id).toBe('dnd-5e-2024');
    expect(manifest!.enabled).toBe(true);
    expect(manifest!.gameSystem).toBe('dnd-5e-2024');
  });
});