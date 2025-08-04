<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { pluginRegistry } from '@/services/plugin-registry.mts';

const selectedGameSystem = ref<string>(localStorage.getItem('activeGameSystem') || '');
const previousGameSystem = ref<string>('');
const loading = ref(true);
const gameSystemPluginOptions = ref<{ id: string; name: string }[]>([]);

onMounted(async () => {
  try {
    // Ensure plugin registry is initialized
    await pluginRegistry.initialize();
    
    // Get available plugins from the frontend plugin registry
    const plugins = pluginRegistry.getPlugins();
    gameSystemPluginOptions.value = plugins.map(plugin => ({
      id: plugin.manifest.id,
      name: plugin.manifest.name
    }));
    
    console.log('Available game system plugins:', gameSystemPluginOptions.value);
    previousGameSystem.value = selectedGameSystem.value;
  } catch (error) {
    console.error('Failed to load plugin list:', error);
  } finally {
    loading.value = false;
  }
});

async function handleGameSystemChange(event: Event) {
  const select = event.target as HTMLSelectElement;
  const newGameSystemId = select.value;

  // If there was a previous game system, call its onUnload handler
  if (previousGameSystem.value) {
    const oldPlugin = pluginRegistry.getGameSystemPlugin(previousGameSystem.value);
    if (oldPlugin?.onUnload) {
      await oldPlugin.onUnload();
    }
  }

  // Call onLoad handler for the new game system
  // Only load the selected plugin now
  const newPlugin = await pluginRegistry.loadPlugin(newGameSystemId);
  if (newPlugin?.onLoad) {
    // Mock context for now
    const mockContext = {
      api: { 
        actors: {
          create: async () => ({ id: '', name: '', type: '', gameSystemId: '', data: {}, createdAt: '', updatedAt: '' }),
          get: async () => ({ id: '', name: '', type: '', gameSystemId: '', data: {}, createdAt: '', updatedAt: '' }),
          update: async () => ({ id: '', name: '', type: '', gameSystemId: '', data: {}, createdAt: '', updatedAt: '' }),
          delete: async () => {},
          list: async () => []
        }, 
        items: {
          create: async () => ({ id: '', name: '', type: '', gameSystemId: '', data: {}, createdAt: '', updatedAt: '' }),
          get: async () => ({ id: '', name: '', type: '', gameSystemId: '', data: {}, createdAt: '', updatedAt: '' }),
          update: async () => ({ id: '', name: '', type: '', gameSystemId: '', data: {}, createdAt: '', updatedAt: '' }),
          delete: async () => {},
          list: async () => []
        }, 
        documents: {
          create: async () => ({ id: '', name: '', type: '', content: {}, pluginId: '', createdAt: '', updatedAt: '' }),
          get: async () => ({ id: '', name: '', type: '', content: {}, pluginId: '', createdAt: '', updatedAt: '' }),
          update: async () => ({ id: '', name: '', type: '', content: {}, pluginId: '', createdAt: '', updatedAt: '' }),
          delete: async () => {},
          search: async () => []
        } 
      },
      store: { get: () => undefined, set: () => {}, subscribe: () => () => {} },
      events: { emit: () => {}, on: () => () => {} }
    };
    await newPlugin.onLoad(mockContext);
  }

  // Update localStorage and previous game system reference
  localStorage.setItem('activeGameSystem', newGameSystemId);
  previousGameSystem.value = newGameSystemId;
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-6 text-dragon">Settings</h1>

    <div class="bg-stone dark:bg-stone-700 rounded-lg shadow-xl border border-stone-300 dark:border-stone-600 p-6 mb-6">
      <div class="border-b border-stone-300 dark:border-stone-600 pb-4 mb-4">
        <h2 class="text-xl font-semibold text-dragon dark:text-gold">Game System</h2>
      </div>

      <div class="game-system-settings">
        <label for="gameSystem" class="block text-sm font-medium text-onyx dark:text-parchment mb-2">
          Active Game System
        </label>
        <div v-if="loading" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-dragon"></div>
        </div>
        <select
          v-else
          id="gameSystem"
          v-model="selectedGameSystem"
          @change="handleGameSystemChange"
          class="block w-full px-3 py-2 bg-parchment dark:bg-stone-600 border border-stone-300 dark:border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-dragon focus:border-dragon text-onyx dark:text-parchment"
        >
          <option value="" disabled>Select a game system</option>
          <option
            v-for="plugin in gameSystemPluginOptions"
            :key="plugin.id"
            :value="plugin.id"
          >
            {{ plugin.name }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-container {
  max-width: 800px;
  margin: 0 auto;
}
</style>
