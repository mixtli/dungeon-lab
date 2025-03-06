<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePluginStore } from '../../stores/plugin.mjs';
import { ArrowPathIcon } from '@heroicons/vue/24/outline';

// Store
const pluginStore = usePluginStore();

// State
const loading = ref(false);

// Methods
async function loadPlugins() {
  loading.value = true;
  try {
    await pluginStore.fetchPlugins();
  } catch (error) {
    console.error('Error loading plugins:', error);
  } finally {
    loading.value = false;
  }
}

// Initialize
onMounted(async () => {
  await loadPlugins();
});
</script>

<template>
  <div class="w-full max-w-7xl mx-auto p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">Installed Plugins</h1>
      <button 
        @click="loadPlugins"
        :disabled="loading"
        class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowPathIcon 
          class="w-4 h-4 mr-2"
          :class="{ 'animate-spin': loading }"
        />
        Refresh
      </button>
    </div>

    <!-- Plugin List -->
    <div class="bg-white rounded-lg shadow mb-6 overflow-hidden">
      <!-- Card Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <span class="font-medium">Available Plugins</span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      </div>

      <!-- Plugin Table -->
      <div v-else-if="pluginStore.plugins.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Version</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Status</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="plugin in pluginStore.plugins" :key="plugin.config.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ plugin.config.name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ plugin.config.version }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ plugin.config.type }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ plugin.config.description }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="plugin.config.enabled ? 
                    'bg-green-100 text-green-800' : 
                    'bg-red-100 text-red-800'"
                >
                  {{ plugin.config.enabled ? 'Enabled' : 'Disabled' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12 text-gray-500">
        No plugins installed.
      </div>
    </div>
  </div>
</template>

<style scoped>
.plugin-manager {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}
</style> 