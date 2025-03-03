<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCampaignStore } from '../stores/campaign';
import { pluginRegistry } from '../services/plugin-registry.service';
import { ElButton, ElMessage, ElMessageBox } from 'element-plus';
import { formatDate } from '../utils/date-utils';

const route = useRoute();
const router = useRouter();
const campaignStore = useCampaignStore();

const campaignId = route.params.id as string;
const loading = ref(true);
const error = ref<string | null>(null);

// Fetch campaign data
onMounted(async () => {
  loading.value = true;
  error.value = null;
  
  try {
    await campaignStore.fetchCampaign(campaignId);
    if (!campaignStore.currentCampaign) {
      error.value = 'Campaign not found';
    }
  } catch (err) {
    console.error('Error fetching campaign:', err);
    error.value = 'Failed to load campaign data';
  } finally {
    loading.value = false;
  }
});

// Computed properties
const campaign = computed(() => campaignStore.currentCampaign);

const gameSystem = computed(() => {
  if (!campaign.value?.gameSystemId) return null;
  return pluginRegistry.getPlugin(campaign.value.gameSystemId);
});

const statusClass = computed(() => {
  if (!campaign.value) return '';
  
  switch (campaign.value.status) {
    case 'planning': return 'text-blue-500';
    case 'active': return 'text-green-500';
    case 'completed': return 'text-purple-500';
    case 'archived': return 'text-gray-500';
    default: return '';
  }
});

// Actions
function editCampaign() {
  router.push({ name: 'campaign-edit', params: { id: campaignId } });
}

async function deleteCampaign() {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to delete this campaign? This action cannot be undone.',
      'Delete Campaign',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    );
    
    await campaignStore.deleteCampaign(campaignId);
    ElMessage.success('Campaign deleted successfully');
    router.push({ name: 'campaigns' });
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('Failed to delete campaign');
      console.error('Error deleting campaign:', err);
    }
  }
}
</script>

<template>
  <div class="campaign-detail-view" v-loading="loading">
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
      <el-button @click="router.push({ name: 'campaigns' })">
        Return to Campaigns
      </el-button>
    </div>
    
    <template v-else-if="campaign">
      <!-- Header -->
      <div class="header mb-8">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-3xl font-semibold">{{ campaign.name }}</h1>
            <p class="text-gray-500 mt-2" v-if="campaign.description">
              {{ campaign.description }}
            </p>
          </div>
          
          <div class="flex space-x-3">
            <el-button @click="editCampaign">
              Edit
            </el-button>
            <el-button type="danger" @click="deleteCampaign">
              Delete
            </el-button>
          </div>
        </div>
        
        <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="info-card">
            <h3 class="text-sm uppercase text-gray-500 font-medium">Game System</h3>
            <p>{{ gameSystem?.name || 'Unknown' }}</p>
          </div>
          
          <div class="info-card">
            <h3 class="text-sm uppercase text-gray-500 font-medium">Status</h3>
            <p :class="statusClass">{{ campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1) }}</p>
          </div>
          
          <div class="info-card">
            <h3 class="text-sm uppercase text-gray-500 font-medium">Created</h3>
            <p>{{ formatDate(campaign.createdAt) }}</p>
          </div>
        </div>
      </div>
      
      <!-- Campaign Content -->
      <div class="campaign-content">
        <div class="mb-8">
          <h2 class="text-xl font-semibold mb-4">Getting Started</h2>
          
          <el-card class="mb-4">
            <template #header>
              <div class="flex justify-between items-center">
                <span>Invite Players</span>
                <el-button type="primary" size="small">
                  Send Invites
                </el-button>
              </div>
            </template>
            <p class="text-gray-600">
              Invite players to join your campaign. They will receive an email with a link to join.
            </p>
          </el-card>
          
          <el-card>
            <template #header>
              <div class="flex justify-between items-center">
                <span>Create Game Session</span>
                <el-button type="primary" size="small">
                  Schedule Session
                </el-button>
              </div>
            </template>
            <p class="text-gray-600">
              Schedule your first game session. Players will be notified and can RSVP.
            </p>
          </el-card>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.campaign-detail-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.error-message {
  text-align: center;
  padding: 40px 0;
}

.info-card {
  background-color: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.info-card p {
  color: #374151;  /* Dark gray text for better contrast */
}

.info-card h3 {
  color: #6B7280;  /* Medium gray for labels */
}
</style> 