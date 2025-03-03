<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useCampaignStore } from '../../stores/campaign';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Delete, Edit, View } from '@element-plus/icons-vue';
import { pluginRegistry } from '../../services/plugin-registry.service';
import { Campaign } from '@dungeon-lab/shared';

// Stores
const campaignStore = useCampaignStore();
const router = useRouter();

// State
const loading = ref(false);

// Load campaigns on mount
onMounted(async () => {
  loading.value = true;
  try {
    await campaignStore.fetchCampaigns();
  } catch (error) {
    ElMessage.error('Failed to load campaigns');
    console.error('Error loading campaigns:', error);
  } finally {
    loading.value = false;
  }
});

// Computed
const myCampaigns = computed(() => campaignStore.myCampaigns);

// Format date
function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString();
}

// Get game system name
function getGameSystemName(gameSystemId: string) {
  const gameSystem = pluginRegistry.getPlugin(gameSystemId);
  return gameSystem?.name || 'Unknown Game System';
}

// View campaign
function viewCampaign(campaign: Campaign) {
  router.push({ name: 'campaign-detail', params: { id: campaign.id } });
}

// Delete campaign
async function confirmDeleteCampaign(campaign: Campaign) {
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to delete the campaign "${campaign.name}"?`,
      'Delete Campaign',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    );
    
    loading.value = true;
    await campaignStore.deleteCampaign(campaign.id);
    ElMessage.success('Campaign deleted successfully');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('Failed to delete campaign');
      console.error('Error deleting campaign:', error);
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="campaign-list">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">My Campaigns</h1>
      <el-button 
        type="primary" 
        @click="router.push({ name: 'campaign-create' })"
        :icon="Plus"
      >
        Create Campaign
      </el-button>
    </div>

    <el-card v-if="myCampaigns.length === 0 && !loading" class="empty-state">
      <div class="text-center py-8">
        <div class="text-gray-500 mb-4">You don't have any campaigns yet</div>
        <el-button 
          type="primary" 
          @click="router.push({ name: 'campaign-create' })"
        >
          Create Your First Campaign
        </el-button>
      </div>
    </el-card>

    <el-table
      v-else
      :data="myCampaigns"
      v-loading="loading"
      style="width: 100%"
    >
      <el-table-column label="Name" prop="name" min-width="120">
        <template #default="{ row }">
          <div class="font-semibold">{{ row.name }}</div>
          <div class="text-xs text-gray-500 truncate" v-if="row.description">
            {{ row.description }}
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="Game System" min-width="120">
        <template #default="{ row }">
          {{ getGameSystemName(row.gameSystemId) }}
        </template>
      </el-table-column>
      
      <el-table-column label="Status" prop="status" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : row.status === 'planning' ? 'info' : 'default'">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="Created" width="110">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      
      <el-table-column label="Actions" width="140" fixed="right">
        <template #default="{ row }">
          <div class="flex space-x-2">
            <el-button
              type="primary"
              size="small"
              circle
              @click="viewCampaign(row)"
              :icon="View"
            />
            <el-button
              type="info"
              size="small"
              circle
              @click="router.push({ name: 'campaign-edit', params: { id: row.id } })"
              :icon="Edit"
            />
            <el-button
              type="danger"
              size="small"
              circle
              @click="confirmDeleteCampaign(row)"
              :icon="Delete"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.campaign-list {
  padding: 20px;
}

.empty-state {
  margin-top: 20px;
}
</style> 