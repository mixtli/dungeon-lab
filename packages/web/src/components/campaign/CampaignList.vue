<script setup lang="ts">
import { ref, onMounted,  watch } from 'vue';
import { useRouter } from 'vue-router';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/vue/24/outline';
import { pluginRegistry } from '../../services/plugin-registry.service.mjs';
import type { ICampaign } from '@dungeon-lab/shared/types/index.mjs';
import { CampaignsClient } from '@dungeon-lab/client/index.mjs';

// Define emits
const emit = defineEmits<{
  (e: 'update:campaigns', count: number): void
}>();

// Clients and stores
const campaignClient = new CampaignsClient();
const router = useRouter();

// State
const loading = ref(false);
const campaigns = ref<ICampaign[]>([]);
const error = ref<string | null>(null);

// Watch for changes in the campaigns array and emit the count
watch(campaigns, (newCampaigns) => {
  emit('update:campaigns', newCampaigns.length);
}, { immediate: true });

// Load campaigns on mount
onMounted(async () => {
  loading.value = true;
  try {
    campaigns.value = await campaignClient.getCampaigns();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch campaigns';
    console.error('Error loading campaigns:', err);
  } finally {
    loading.value = false;
  }
});

// Format date
function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString();
}

// Get game system name
function getGameSystemName(gameSystemId: string | unknown) {
  let systemId: string;
  if (typeof gameSystemId === 'string') {
    systemId = gameSystemId;
  } else {
    systemId = String(gameSystemId);
  }
  const plugin = pluginRegistry.getGameSystemPlugin(systemId);
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
    await campaignClient.deleteCampaign(campaign.id);
    // Remove from local list after successful deletion
    campaigns.value = campaigns.value.filter(c => c.id !== campaign.id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete campaign';
    console.error('Error deleting campaign:', err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="campaign-list">
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>
    
    <div
      v-if="campaigns.length === 0 && !loading"
      class="mt-4 p-8 bg-white rounded-lg shadow text-center"
    >
      <div class="text-gray-500 mb-4">You don't have any campaigns yet</div>
    </div>

    <div v-else-if="loading" class="flex justify-center items-center p-8">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <div v-else class="bg-white shadow rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Name
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Game System
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Status
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Created
            </th>
            <th
              class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="campaign in campaigns" :key="campaign.id || ''" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div
                class="cursor-pointer hover:text-blue-600 transition-colors"
                @click="viewCampaign(campaign)"
              >
                <div class="font-medium text-gray-900 hover:text-blue-600">{{ campaign.name }}</div>
                <div class="text-sm text-gray-500 hover:text-blue-400" v-if="campaign.description">
                  {{ campaign.description }}
                </div>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
              {{ getGameSystemName(campaign.gameSystemId) }}
            </td>
            <td class="px-6 py-4">
              <span
                :class="{
                  'px-2 py-1 text-xs font-medium rounded-full': true,
                  'bg-green-100 text-green-800': campaign.status === 'active',
                  'bg-yellow-100 text-yellow-800': campaign.status === 'paused',
                  'bg-gray-100 text-gray-800':
                    campaign.status === 'completed' || campaign.status === 'archived',
                }"
              >
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
