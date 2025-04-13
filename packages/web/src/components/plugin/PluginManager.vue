<script setup lang="ts">
import { ref, computed } from 'vue';
import { pluginRegistry } from '@/services/plugin-registry.service.mjs';
import { ArrowPathIcon } from '@heroicons/vue/24/outline';
import type { IWebPlugin } from '@dungeon-lab/shared/types/plugin.mjs';

// State
const loading = ref(false);

// Computed
const plugins = computed(() => pluginRegistry.getPlugins());
const gameSystemPlugins = computed(() => pluginRegistry.getGameSystemPlugins());
const extensionPlugins = computed(() =>
  plugins.value.filter((p: IWebPlugin) => p.config.type === 'extension')
);

// Methods
async function refreshPlugins() {
  loading.value = true;
  try {
    await pluginRegistry.initialize();
  } catch (error) {
    console.error('Error refreshing plugins:', error);
  } finally {
    loading.value = false;
  }
}
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

    <!-- Plugin List -->
    <div class="bg-white rounded-lg shadow mb-6 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-medium">Game System Plugins</h2>
      </div>
      <div class="divide-y divide-gray-200">
        <div v-for="plugin in gameSystemPlugins" :key="plugin.config.id" class="px-6 py-4">
          <!-- Plugin content -->
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-medium">Extension Plugins</h2>
      </div>
      <div class="divide-y divide-gray-200">
        <div v-for="plugin in extensionPlugins" :key="plugin.config.id" class="px-6 py-4">
          <!-- Plugin content -->
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
