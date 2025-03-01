import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../plugins/axios';
import { GameSystemPlugin, Plugin } from '@dungeon-lab/shared';

export const usePluginStore = defineStore('plugin', () => {
  // State
  const plugins = ref<Plugin[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const loadedComponents = ref<Map<string, any>>(new Map());

  // Getters
  const gameSystemPlugins = computed(() => 
    plugins.value.filter(p => p.type === 'gameSystem') as GameSystemPlugin[]
  );

  const extensionPlugins = computed(() => 
    plugins.value.filter(p => p.type === 'extension')
  );

  const enabledPlugins = computed(() => 
    plugins.value.filter(p => p.enabled)
  );

  const getPluginById = (id: string) => 
    plugins.value.find(p => p.id === id);

  const getGameSystemById = (gameSystemId: string) => {
    return gameSystemPlugins.value.find(p => {
      // Assuming gameSystemId property exists on the plugin object after backend processing
      return 'gameSystemId' in p && p.gameSystemId === gameSystemId;
    });
  };

  const getComponentForActorType = (gameSystemId: string, actorType: string): any => {
    const gameSystem = getGameSystemById(gameSystemId);
    if (!gameSystem) return null;

    const componentName = gameSystem.getActorSheet(actorType);
    if (!componentName) return null;

    return loadedComponents.value.get(componentName);
  };

  // Actions
  async function fetchPlugins() {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get('/plugins');
      plugins.value = response.data;
      return plugins.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch plugins';
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
      const response = await api.get(`/plugins/${id}`);
      // Update the plugin in the list if it exists
      const index = plugins.value.findIndex(p => p.id === id);
      if (index !== -1) {
        plugins.value[index] = response.data;
      } else {
        plugins.value.push(response.data);
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || `Failed to fetch plugin ${id}`;
      console.error(`Error fetching plugin ${id}:`, err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function registerPlugin(pluginData: Partial<Plugin>) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post('/plugins', pluginData);
      plugins.value.push(response.data);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to register plugin';
      console.error('Error registering plugin:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updatePlugin(id: string, pluginData: Partial<Plugin>) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.put(`/plugins/${id}`, pluginData);
      const index = plugins.value.findIndex(p => p.id === id);
      if (index !== -1) {
        plugins.value[index] = response.data;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || `Failed to update plugin ${id}`;
      console.error(`Error updating plugin ${id}:`, err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function enablePlugin(id: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.put(`/plugins/${id}/enable`);
      const index = plugins.value.findIndex(p => p.id === id);
      if (index !== -1) {
        plugins.value[index] = response.data;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || `Failed to enable plugin ${id}`;
      console.error(`Error enabling plugin ${id}:`, err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function disablePlugin(id: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.put(`/plugins/${id}/disable`);
      const index = plugins.value.findIndex(p => p.id === id);
      if (index !== -1) {
        plugins.value[index] = response.data;
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || `Failed to disable plugin ${id}`;
      console.error(`Error disabling plugin ${id}:`, err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function unregisterPlugin(id: string) {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/plugins/${id}`);
      plugins.value = plugins.value.filter(p => p.id !== id);
      return true;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || `Failed to unregister plugin ${id}`;
      console.error(`Error unregistering plugin ${id}:`, err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Load plugin components
  function registerComponent(name: string, component: any) {
    loadedComponents.value.set(name, component);
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
    await fetchPlugins();
    
    // Load all enabled plugins
    for (const plugin of enabledPlugins.value) {
      if ('entryPoint' in plugin) {
        await loadPlugin(plugin.entryPoint as string);
      }
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
    registerPlugin,
    updatePlugin,
    enablePlugin,
    disablePlugin,
    unregisterPlugin,
    registerComponent,
    loadPlugin,
    initializePlugins,
  };
}); 