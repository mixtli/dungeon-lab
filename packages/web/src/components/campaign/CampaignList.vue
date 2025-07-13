<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { ICampaign } from '@dungeon-lab/shared/types/index.mjs';
import { CampaignsClient } from '@dungeon-lab/client/index.mjs';
import { useDeviceAdaptation } from '@/composables/useDeviceAdaptation.mts';
import CampaignListItemMobile from './CampaignListItemMobile.vue';
import CampaignListItem from './CampaignListItem.vue';

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

const { isMobile } = useDeviceAdaptation();

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
  <div class="campaign-list overflow-x-hidden relative">
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
    <div v-else>
      <!-- Mobile: Native iOS-style list -->
      <div v-if="isMobile" class="bg-white">
        <CampaignListItemMobile
          v-for="campaign in campaigns"
          :key="campaign.id || ''"
          :campaign="campaign"
          @view="viewCampaign"
          @delete="confirmDeleteCampaign"
        />
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
            <CampaignListItem
              v-for="campaign in campaigns"
              :key="campaign.id || ''"
              :campaign="campaign"
              @view="viewCampaign"
              @edit="id => router.push({ name: 'campaign-edit', params: { id } })"
              @delete="confirmDeleteCampaign"
            />
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Import the swipeable row component
</script>

<style scoped>
</style>
