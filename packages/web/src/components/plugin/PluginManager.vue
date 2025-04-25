<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { pluginRegistry } from '@/services/plugin-registry.service.mjs';
import { ArrowPathIcon } from '@heroicons/vue/24/outline';
import type { IWebPlugin } from '@dungeon-lab/shared/types/plugin.mjs';

// State
const loading = ref(true);
const error = ref<string | null>(null);

// Computed
const plugins = computed(() => pluginRegistry.getPlugins());
const gameSystemPlugins = computed(() => pluginRegistry.getGameSystemPlugins());
const extensionPlugins = computed(() =>
  plugins.value.filter((p: IWebPlugin) => p.config.type === 'extension')
);

// Methods
async function refreshPlugins() {
  loading.value = true;
  error.value = null;
  try {
    await pluginRegistry.initialize();
  } catch (err) {
    console.error('Error refreshing plugins:', err);
    error.value = err instanceof Error ? err.message : 'Failed to load plugins';
  } finally {
    loading.value = false;
  }
}

// Lifecycle
onMounted(async () => {
  await refreshPlugins();
});
</script>

<template>
  <div class="w-full max-w-7xl mx-auto p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">Installed Plugins</h1>
      <button
        @click="refreshPlugins"
        :disabled="loading"
        class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowPathIcon class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" />
        Refresh
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
      {{ error }}
    </div>

    <!-- Loading Indicator -->
    <div v-if="loading" class="text-center py-10">
      <div class="animate-spin h-10 w-10 rounded-full border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p class="text-gray-500">Loading plugins...</p>
    </div>

    <div v-else>
      <!-- Game System Plugins -->
      <div class="bg-white rounded-lg shadow mb-6 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium">Game System Plugins</h2>
        </div>
        <div v-if="gameSystemPlugins.length === 0" class="px-6 py-8 text-center text-gray-500">
          No game system plugins installed
        </div>
        <div v-else class="divide-y divide-gray-200">
          <div v-for="plugin in gameSystemPlugins" :key="plugin.config.id" class="px-6 py-4">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-lg font-medium text-gray-900">{{ plugin.config.name }}</h3>
                <p v-if="plugin.config.description" class="mt-1 text-sm text-gray-500">
                  {{ plugin.config.description }}
                </p>
                <div class="mt-2 flex items-center text-sm text-gray-500">
                  <span class="mr-4">v{{ plugin.config.version }}</span>
                  <span v-if="plugin.config.author">by {{ plugin.config.author }}</span>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Extension Plugins -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium">Extension Plugins</h2>
        </div>
        <div v-if="extensionPlugins.length === 0" class="px-6 py-8 text-center text-gray-500">
          No extension plugins installed
        </div>
        <div v-else class="divide-y divide-gray-200">
          <div v-for="plugin in extensionPlugins" :key="plugin.config.id" class="px-6 py-4">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-lg font-medium text-gray-900">{{ plugin.config.name }}</h3>
                <p v-if="plugin.config.description" class="mt-1 text-sm text-gray-500">
                  {{ plugin.config.description }}
                </p>
                <div class="mt-2 flex items-center text-sm text-gray-500">
                  <span class="mr-4">v{{ plugin.config.version }}</span>
                  <span v-if="plugin.config.author">by {{ plugin.config.author }}</span>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
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
