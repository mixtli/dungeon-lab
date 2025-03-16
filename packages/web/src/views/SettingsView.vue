<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { pluginRegistry } from '@/services/plugin-registry.service.mjs';

const selectedGameSystem = ref<string>(localStorage.getItem('activeGameSystem') || '');
const previousGameSystem = ref<string>('');
const gameSystemPlugins = computed(() => pluginRegistry.getGameSystemPlugins());

onMounted(() => {
  previousGameSystem.value = selectedGameSystem.value;
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
  const newPlugin = pluginRegistry.getGameSystemPlugin(newGameSystemId);
  if (newPlugin?.onLoad) {
    await newPlugin.onLoad();
  }

  // Update localStorage and previous game system reference
  localStorage.setItem('activeGameSystem', newGameSystemId);
  previousGameSystem.value = newGameSystemId;
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-6">Settings</h1>
    
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <div class="border-b pb-4 mb-4">
        <h2 class="text-xl font-semibold">Game System</h2>
      </div>
      
      <div class="game-system-settings">
        <label 
          for="gameSystem" 
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          Active Game System
        </label>
        <select
          id="gameSystem"
          v-model="selectedGameSystem"
          @change="handleGameSystemChange"
          class="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="" disabled>Select a game system</option>
          <option
            v-for="plugin in gameSystemPlugins"
            :key="plugin.config.id"
            :value="plugin.config.id"
          >
            {{ plugin.config.name }}
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