import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { IGameSystemPlugin, IPlugin } from '@dungeon-lab/shared/index.mjs';
import { pluginRegistry } from '../services/plugin-registry.service.mjs';

export const usePluginStore = defineStore('plugin', () => {
  // State
  const plugins = ref<IPlugin[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const gameSystemPlugins = computed(() => 
    plugins.value.filter(p => p.config.type === 'gameSystem') as IGameSystemPlugin[]
  );

  const extensionPlugins = computed(() => 
    plugins.value.filter(p => p.config.type === 'extension')
  );

  const enabledPlugins = computed(() => 
    plugins.value.filter(p => p.config.enabled)
  );

  const getPluginById = (id: string) => {
    // Try from local state first, then fallback to registry
    const localPlugin = plugins.value.find(p => p.config.id === id);
    if (localPlugin) return localPlugin;
    
    return pluginRegistry.getPlugin(id);
  };

  const getGameSystemById = (id: string) => {
    // Try from local state first, then fallback to registry
    const localGameSystem = gameSystemPlugins.value.find(p => p.config.id === id);
    if (localGameSystem) return localGameSystem;
    
    return pluginRegistry.getGameSystemPlugin(id);
  };

  const getComponentForActorType = (gameSystemId: string, actorType: string): any => {
    return pluginRegistry.getActorComponent(gameSystemId, actorType);
  };

  // Actions
  async function fetchPlugins() {
    loading.value = true;
    error.value = null;

    try {
      // Get plugins directly from the registry instead of making an API call
      plugins.value = pluginRegistry.getAllPlugins();
      return plugins.value;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch plugins';
      console.error('Error fetching plugins:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function getPlugin(id: string) {
    loading.value = true;
    error.value = null;

    try {
      // Get plugin directly from registry instead of making an API call
      const plugin = pluginRegistry.getPlugin(id);
      
      if (!plugin) {
        throw new Error(`Plugin ${id} not found`);
      }

      // Update the plugin in the local state
      const index = plugins.value.findIndex(p => p.config.id === id);
      if (index !== -1) {
        plugins.value[index] = plugin;
      } else {
        plugins.value.push(plugin);
      }
      
      return plugin;
    } catch (err: any) {
      error.value = err.message || `Failed to fetch plugin ${id}`;
      console.error(`Error fetching plugin ${id}:`, err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  // Load plugin components
  function registerComponent(name: string, component: any) {
    pluginRegistry.registerComponent(name, component);
  }

  // Dynamic plugin loading
  async function loadPlugin(pluginEntryPoint: string) {
    try {
      // This would dynamically import the plugin module
      const module = await import(/* @vite-ignore */ pluginEntryPoint);
      
      // Register the plugin's components
      if (module.components) {
        for (const [name, component] of Object.entries(module.components)) {
          registerComponent(name, component);
        }
      }
      
      return true;
    } catch (err) {
      console.error(`Error loading plugin from ${pluginEntryPoint}:`, err);
      error.value = `Failed to load plugin components from ${pluginEntryPoint}`;
      return false;
    }
  }

  // Initialize all plugins when app starts
  async function initializePlugins() {
    loading.value = true;
    error.value = null;
    
    try {
      // Initialize the plugin registry
      await pluginRegistry.initialize();
      
      // Update local state with all plugins from registry
      await fetchPlugins();
    } catch (err: any) {
      console.error('Error initializing plugin registry:', err);
      error.value = 'Failed to initialize plugin registry: ' + err.message;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    plugins,
    loading,
    error,
    
    // Getters
    gameSystemPlugins,
    extensionPlugins,
    enabledPlugins,
    getPluginById,
    getGameSystemById,
    getComponentForActorType,
    
    // Actions
    fetchPlugins,
    getPlugin,
    registerComponent,
    loadPlugin,
    initializePlugins,
  };
}); 