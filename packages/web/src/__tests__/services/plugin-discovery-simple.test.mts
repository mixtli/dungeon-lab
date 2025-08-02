import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimplePluginDiscoveryService } from '../../services/plugin-discovery-simple.service.mts';

/**
 * Test for SimplePluginDiscoveryService to reproduce browser issues
 */

describe('SimplePluginDiscoveryService', () => {
  let service: SimplePluginDiscoveryService;

  beforeEach(() => {
    service = new SimplePluginDiscoveryService();
  });

  it('should discover manifests correctly', async () => {
    // This should work fine - we know glob imports work for manifests
    const plugins = await service.discoverPlugins();
    
    // Check if any plugins were discovered
    console.log('Discovered plugins:', plugins.length);
    console.log('Plugin IDs:', service.getAvailablePluginIds());
    
    // If this fails with the same workspace alias error, we'll see it here
    expect(Array.isArray(plugins)).toBe(true);
  });

  it('should handle plugin loading errors gracefully', async () => {
    // This test specifically looks for the workspace alias resolution issue
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    try {
      const plugins = await service.discoverPlugins();
      
      // Check if we got the expected error about workspace alias resolution
      const errorCalls = consoleSpy.mock.calls;
      const hasWorkspaceAliasError = errorCalls.some((call: unknown[]) => 
        call.some((arg: unknown) => 
          typeof arg === 'string' && arg.includes('@dungeon-lab/plugin-')
        )
      );
      
      if (hasWorkspaceAliasError) {
        console.log('✅ Reproduced the workspace alias resolution issue');
      }
      
      // Service should continue and return empty array on failure
      expect(Array.isArray(plugins)).toBe(true);
      
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('should show the exact error we see in browser', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    try {
      await service.discoverPlugins();
      
      // Look for the specific error message from the logs
      const errorCalls = consoleSpy.mock.calls;
      const hasModuleSpecifierError = errorCalls.some((call: unknown[]) =>
        call.some((arg: unknown) => 
          typeof arg === 'string' && 
          arg.includes('Failed to resolve module specifier')
        )
      );
      
      if (hasModuleSpecifierError) {
        console.log('✅ Reproduced exact browser error in test');
      } else {
        console.log('❌ Different error or no error - test environment may be different');
      }
      
      console.log('All error calls:', errorCalls);
      
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('should test the problematic dynamic import pattern', async () => {
    // Test the exact pattern that's failing
    try {
      const pluginId = 'dnd-5e-2024';
      const workspaceAlias = `@dungeon-lab/plugin-${pluginId}/index.mjs`;
      
      console.log(`Attempting to import: ${workspaceAlias}`);
      
      // This should fail with the same error as in browser
      const pluginModule = await import(/* @vite-ignore */ workspaceAlias);
      
      // If we get here, the import worked
      console.log('✅ Dynamic import worked:', typeof pluginModule.default);
      expect(pluginModule.default).toBeDefined();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('❌ Dynamic import failed:', errorMessage);
      
      // Check if it's the expected error
      if (errorMessage.includes('Failed to resolve module specifier')) {
        console.log('✅ Reproduced the exact browser error');
      }
      
      // This is expected to fail, so we'll expect the error
      expect(errorMessage).toContain('Failed to resolve module specifier');
    }
  });
});