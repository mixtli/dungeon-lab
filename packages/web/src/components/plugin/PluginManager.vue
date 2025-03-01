<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { usePluginStore } from '../../stores/plugin';
import { useAuthStore } from '../../stores/auth';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Delete, Edit, Switch } from '@element-plus/icons-vue';

// Stores
const pluginStore = usePluginStore();
const authStore = useAuthStore();

// State
const isAdmin = computed(() => authStore.user?.isAdmin || false);
const loading = ref(false);
const showAddForm = ref(false);
const showEditForm = ref(false);

// Form data
const newPlugin = ref({
  name: '',
  version: '1.0.0',
  description: '',
  author: '',
  website: '',
  type: 'gameSystem' as 'gameSystem' | 'extension' | 'theme',
  entryPoint: '',
  enabled: true,
});

const editPlugin = ref({
  id: '',
  name: '',
  version: '',
  description: '',
  author: '',
  website: '',
  enabled: true,
});

// Methods
async function loadPlugins() {
  loading.value = true;
  try {
    await pluginStore.fetchPlugins();
  } catch (error) {
    ElMessage.error('Failed to load plugins');
    console.error('Error loading plugins:', error);
  } finally {
    loading.value = false;
  }
}

function resetNewPluginForm() {
  newPlugin.value = {
    name: '',
    version: '1.0.0',
    description: '',
    author: '',
    website: '',
    type: 'gameSystem' as 'gameSystem' | 'extension' | 'theme',
    entryPoint: '',
    enabled: true,
  };
  showAddForm.value = false;
}

function prepareEditForm(plugin: any) {
  editPlugin.value = {
    id: plugin.id,
    name: plugin.name,
    version: plugin.version,
    description: plugin.description || '',
    author: plugin.author || '',
    website: plugin.website || '',
    enabled: plugin.enabled,
  };
  showEditForm.value = true;
}

async function addPlugin() {
  try {
    loading.value = true;
    await pluginStore.registerPlugin(newPlugin.value);
    ElMessage.success('Plugin added successfully');
    resetNewPluginForm();
    await loadPlugins();
  } catch (error) {
    ElMessage.error('Failed to add plugin');
    console.error('Error adding plugin:', error);
  } finally {
    loading.value = false;
  }
}

async function updatePlugin() {
  try {
    loading.value = true;
    await pluginStore.updatePlugin(editPlugin.value.id, editPlugin.value);
    ElMessage.success('Plugin updated successfully');
    showEditForm.value = false;
    await loadPlugins();
  } catch (error) {
    ElMessage.error('Failed to update plugin');
    console.error('Error updating plugin:', error);
  } finally {
    loading.value = false;
  }
}

async function togglePluginStatus(plugin: any) {
  try {
    loading.value = true;
    if (plugin.enabled) {
      await pluginStore.disablePlugin(plugin.id);
      ElMessage.success('Plugin disabled');
    } else {
      await pluginStore.enablePlugin(plugin.id);
      ElMessage.success('Plugin enabled');
    }
    await loadPlugins();
  } catch (error) {
    ElMessage.error('Failed to toggle plugin status');
    console.error('Error toggling plugin status:', error);
  } finally {
    loading.value = false;
  }
}

async function confirmDeletePlugin(plugin: any) {
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to delete the plugin "${plugin.name}"? This action cannot be undone.`,
      'Delete Plugin',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    );
    
    loading.value = true;
    await pluginStore.unregisterPlugin(plugin.id);
    ElMessage.success('Plugin deleted successfully');
    await loadPlugins();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('Failed to delete plugin');
      console.error('Error deleting plugin:', error);
    }
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
      <h1 class="text-2xl font-semibold">Plugin Management</h1>
      <el-button 
        v-if="isAdmin" 
        type="primary" 
        @click="showAddForm = true"
        :icon="Plus"
      >
        Add Plugin
      </el-button>
    </div>

    <!-- Plugin List -->
    <el-card v-loading="loading" class="mb-6">
      <template #header>
        <div class="flex justify-between items-center">
          <span>Available Plugins</span>
          <el-button 
            size="small"
            @click="loadPlugins"
            :loading="loading"
          >
            Refresh
          </el-button>
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
        <el-table-column label="Status" width="120">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'danger'">
              {{ row.enabled ? 'Enabled' : 'Disabled' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="200" v-if="isAdmin">
          <template #default="{ row }">
            <div class="flex space-x-2">
              <el-tooltip content="Toggle status">
                <el-button
                  size="small"
                  circle
                  :type="row.enabled ? 'warning' : 'success'"
                  @click="togglePluginStatus(row)"
                  :icon="Switch"
                />
              </el-tooltip>
              <el-tooltip content="Edit">
                <el-button
                  size="small"
                  circle
                  type="primary"
                  @click="prepareEditForm(row)"
                  :icon="Edit"
                />
              </el-tooltip>
              <el-tooltip content="Delete">
                <el-button
                  size="small"
                  circle
                  type="danger"
                  @click="confirmDeletePlugin(row)"
                  :icon="Delete"
                />
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-else class="text-center py-6 text-gray-500">
        No plugins available. Click "Add Plugin" to add your first plugin.
      </div>
    </el-card>

    <!-- Add Plugin Dialog -->
    <el-dialog
      v-model="showAddForm"
      title="Add New Plugin"
      width="500px"
    >
      <el-form
        :model="newPlugin"
        label-position="top"
      >
        <el-form-item label="Name" required>
          <el-input v-model="newPlugin.name" />
        </el-form-item>
        
        <el-form-item label="Version" required>
          <el-input v-model="newPlugin.version" />
        </el-form-item>
        
        <el-form-item label="Type" required>
          <el-select v-model="newPlugin.type" style="width: 100%">
            <el-option label="Game System" value="gameSystem" />
            <el-option label="Extension" value="extension" />
            <el-option label="Theme" value="theme" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="Entry Point" required>
          <el-input v-model="newPlugin.entryPoint" placeholder="Path to plugin entry file" />
        </el-form-item>
        
        <el-form-item label="Description">
          <el-input
            v-model="newPlugin.description"
            type="textarea"
            rows="3"
          />
        </el-form-item>
        
        <el-form-item label="Author">
          <el-input v-model="newPlugin.author" />
        </el-form-item>
        
        <el-form-item label="Website">
          <el-input v-model="newPlugin.website" />
        </el-form-item>
        
        <el-form-item label="Status">
          <el-switch
            v-model="newPlugin.enabled"
            active-text="Enabled"
            inactive-text="Disabled"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetNewPluginForm">Cancel</el-button>
          <el-button type="primary" @click="addPlugin" :loading="loading">
            Add Plugin
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Edit Plugin Dialog -->
    <el-dialog
      v-model="showEditForm"
      title="Edit Plugin"
      width="500px"
    >
      <el-form
        :model="editPlugin"
        label-position="top"
      >
        <el-form-item label="Name" required>
          <el-input v-model="editPlugin.name" />
        </el-form-item>
        
        <el-form-item label="Version" required>
          <el-input v-model="editPlugin.version" />
        </el-form-item>
        
        <el-form-item label="Description">
          <el-input
            v-model="editPlugin.description"
            type="textarea"
            rows="3"
          />
        </el-form-item>
        
        <el-form-item label="Author">
          <el-input v-model="editPlugin.author" />
        </el-form-item>
        
        <el-form-item label="Website">
          <el-input v-model="editPlugin.website" />
        </el-form-item>
        
        <el-form-item label="Status">
          <el-switch
            v-model="editPlugin.enabled"
            active-text="Enabled"
            inactive-text="Disabled"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showEditForm = false">Cancel</el-button>
          <el-button type="primary" @click="updatePlugin" :loading="loading">
            Save Changes
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.plugin-manager {
  padding: 20px;
}
</style> 