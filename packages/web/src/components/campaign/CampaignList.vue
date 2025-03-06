<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useCampaignStore } from '../../stores/campaign.mjs';
import { useRouter } from 'vue-router';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/vue/24/outline';
import { pluginRegistry } from '../../services/plugin-registry.service.mjs';
import type { ICampaign } from '@dungeon-lab/shared/index.mjs';

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
    if (error instanceof Error) {
      console.error('Error loading campaigns:', error);
    }
  } finally {
    loading.value = false;
  }
});

// Computed
const myCampaigns = computed(() => campaignStore.myCampaigns as ICampaign[]);

// Format date
function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString();
}

// Get game system name
function getGameSystemName(gameSystemId: string | any) {
  const systemId = typeof gameSystemId === 'object' ? String(gameSystemId) : gameSystemId;
  const plugin = pluginRegistry.getPlugin(systemId);
  return plugin?.config?.name || 'Unknown Game System';
}

// View campaign
function viewCampaign(campaign: ICampaign) {
  if (campaign.id) {
    router.push({ name: 'campaign-detail', params: { id: campaign.id } });
  }
}

// Delete campaign
async function confirmDeleteCampaign(campaign: ICampaign) {
  if (!campaign.name || !campaign.id) return;
  
  if (!confirm(`Are you sure you want to delete the campaign "${campaign.name}"?`)) {
    return;
  }
  
  loading.value = true;
  try {
    await campaignStore.deleteCampaign(campaign.id);
  } catch (error) {
    if (error instanceof Error) {
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
      <button 
        class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        @click="router.push({ name: 'campaign-create' })"
      >
        <PlusIcon class="w-5 h-5 mr-2" />
        Create Campaign
      </button>
    </div>

    <div v-if="myCampaigns.length === 0 && !loading" 
      class="mt-4 p-8 bg-white rounded-lg shadow text-center">
      <div class="text-gray-500 mb-4">You don't have any campaigns yet</div>
      <button 
        class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        @click="router.push({ name: 'campaign-create' })"
      >
        Create Your First Campaign
      </button>
    </div>

    <div v-else class="bg-white shadow rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Game System</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="campaign in myCampaigns" :key="campaign.id || ''" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="font-medium text-gray-900">{{ campaign.name }}</div>
              <div class="text-sm text-gray-500" v-if="campaign.description">{{ campaign.description }}</div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
              {{ getGameSystemName(campaign.gameSystemId) }}
            </td>
            <td class="px-6 py-4">
              <span :class="{
                'px-2 py-1 text-xs font-medium rounded-full': true,
                'bg-green-100 text-green-800': campaign.status === 'active',
                'bg-blue-100 text-blue-800': campaign.status === 'planning',
                'bg-gray-100 text-gray-800': campaign.status === 'completed' || campaign.status === 'archived'
              }">
                {{ campaign.status }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
              {{ (campaign as any).createdAt ? formatDate((campaign as any).createdAt) : '' }}
            </td>
            <td class="px-6 py-4 text-right space-x-2">
              <button
                v-if="campaign.id"
                class="inline-flex items-center p-2 text-blue-600 hover:text-blue-900 focus:outline-none"
                @click="viewCampaign(campaign)"
                title="View Campaign"
              >
                <EyeIcon class="w-5 h-5" />
              </button>
              <button
                v-if="campaign.id"
                class="inline-flex items-center p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                @click="router.push({ name: 'campaign-edit', params: { id: campaign.id } })"
                title="Edit Campaign"
              >
                <PencilIcon class="w-5 h-5" />
              </button>
              <button
                v-if="campaign.id"
                class="inline-flex items-center p-2 text-red-600 hover:text-red-900 focus:outline-none"
                @click="confirmDeleteCampaign(campaign)"
                title="Delete Campaign"
              >
                <TrashIcon class="w-5 h-5" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.campaign-list {
  padding: 20px;
}
</style> 