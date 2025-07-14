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
    <div v-if="error" class="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg mb-4 shadow-sm">
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        {{ error }}
      </div>
    </div>
    <div
      v-if="campaigns.length === 0 && !loading"
      class="mt-4 p-8 bg-stone dark:bg-stone-700 rounded-lg shadow-lg text-center border border-stone-300 dark:border-stone-600"
    >
      <div class="text-ash dark:text-stone-300 mb-4">⚔️ No campaigns found</div>
    </div>
    <div v-else-if="loading" class="flex justify-center items-center p-8">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-dragon border-t-transparent shadow-lg"></div>
    </div>
    <div v-else>
      <!-- Mobile: Native iOS-style list -->
      <div v-if="isMobile" class="bg-stone dark:bg-stone-700 rounded-lg shadow-lg border border-stone-300 dark:border-stone-600">
        <CampaignListItemMobile
          v-for="campaign in campaigns"
          :key="campaign.id || ''"
          :campaign="campaign"
          @view="viewCampaign"
          @delete="confirmDeleteCampaign"
        />
      </div>
      <div v-else class="bg-stone dark:bg-stone-700 shadow-xl rounded-lg overflow-hidden border border-stone-300 dark:border-stone-600">
        <table class="min-w-full divide-y divide-stone-300 dark:divide-stone-600">
          <thead class="bg-obsidian dark:bg-stone-800">
            <tr>
              <th class="px-6 py-4 text-left text-xs font-bold text-gold uppercase tracking-wider">⚔️ Campaign Name</th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gold uppercase tracking-wider">🎲 Game System</th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gold uppercase tracking-wider">📊 Status</th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gold uppercase tracking-wider">📅 Created</th>
              <th class="px-6 py-4 text-right text-xs font-bold text-gold uppercase tracking-wider">⚙️ Actions</th>
            </tr>
          </thead>
          <tbody class="bg-stone dark:bg-stone-700 divide-y divide-stone-300 dark:divide-stone-600">
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
