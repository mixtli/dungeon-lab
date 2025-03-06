<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePluginStore } from '../../stores/plugin.mjs';

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
  <div class="plugin-manager">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">Installed Plugins</h1>
      <el-button 
        size="small"
        @click="loadPlugins"
        :loading="loading"
      >
        Refresh
      </el-button>
    </div>

    <!-- Plugin List -->
    <el-card v-loading="loading" class="mb-6">
      <template #header>
        <div class="flex justify-between items-center">
          <span>Available Plugins</span>
        </div>
      </template>

      <el-table
        :data="pluginStore.plugins"
        style="width: 100%"
        v-if="pluginStore.plugins.length > 0"
      >
        <el-table-column prop="name" label="Name" />
        <el-table-column prop="version" label="Version" width="100" />
        <el-table-column prop="type" label="Type" width="120" />
        <el-table-column prop="description" label="Description" />
        <el-table-column label="Status" width="120">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'danger'">
              {{ row.enabled ? 'Enabled' : 'Disabled' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div v-else class="text-center py-6 text-gray-500">
        No plugins installed.
      </div>
    </el-card>
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