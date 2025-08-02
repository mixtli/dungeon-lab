<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCampaignStore } from '../stores/campaign.store.mjs';
import { pluginRegistry } from '../services/plugin-registry.mts';
import type { ICampaign } from '@dungeon-lab/shared/types/index.mjs';
import CampaignCharacterList from '../components/campaign/CampaignCharacterList.vue';
import CampaignEncounterList from '../components/campaign/CampaignEncounterList.vue';
import CampaignInviteModal from '../components/campaign/CampaignInviteModal.vue';
import GameSessionScheduleModal from '../components/campaign/GameSessionScheduleModal.vue';
import CampaignSessionList from '../components/campaign/CampaignSessionList.vue';
import { CampaignsClient } from '@dungeon-lab/client/index.mjs';

const route = useRoute();
const router = useRouter();
const campaignStore = useCampaignStore();
const campaignClient = new CampaignsClient();
const loading = ref(false);
const error = ref<string | null>(null);
const showDeleteModal = ref(false);
const showInviteModal = ref(false);
const showScheduleModal = ref(false);
const showStatusDropdown = ref(false);
const campaignData = ref<ICampaign | null>(null);

const campaignId = route.params.id as string;

// Fetch campaign data
onMounted(async () => {
  loading.value = true;
  error.value = null;

  try {
    const campaign = await campaignClient.getCampaign(campaignId);
    campaignData.value = campaign;
    
  } catch (err) {
    console.error('Error fetching campaign:', err);
    error.value = 'Failed to load campaign data';
  } finally {
    loading.value = false;
  }
});

const campaign = computed(() => campaignData.value);

// Get the campaign's game system
const gameSystem = computed(() => {
  if (!campaign.value) return null;

  const plugin = pluginRegistry.getGameSystemPlugin(String(campaign.value.pluginId));
  return plugin
    ? {
        name: plugin.manifest.name,
        description: plugin.manifest.description,
      }
    : null;
});

const statusConfig = computed(() => {
  if (!campaign.value) return { text: '', emoji: '', class: '' };

  switch (campaign.value.status) {
    case 'active':
      return { text: 'active', emoji: '🟢', class: 'bg-success-100 text-success-800 border-success-300' };
    case 'paused':
      return { text: 'paused', emoji: '⏸️', class: 'bg-accent-100 text-accent-800 border-accent-300' };
    case 'completed':
      return { text: 'completed', emoji: '📁', class: 'bg-stone-200 text-stone-700 border-stone-300 dark:bg-stone-600 dark:text-stone-200 dark:border-stone-500' };
    case 'archived':
      return { text: 'archived', emoji: '📁', class: 'bg-stone-200 text-stone-700 border-stone-300 dark:bg-stone-600 dark:text-stone-200 dark:border-stone-500' };
    default:
      return { text: campaign.value.status, emoji: '', class: 'bg-stone-200 text-stone-700 border-stone-300' };
  }
});

const statusOptions: { value: ICampaign['status']; label: string; emoji: string }[] = [
  { value: 'active', label: 'Active', emoji: '🟢' },
  { value: 'paused', label: 'Paused', emoji: '⏸️' },
  { value: 'completed', label: 'Completed', emoji: '📁' },
  { value: 'archived', label: 'Archived', emoji: '📁' }
];

// Actions
function editCampaign() {
  router.push({ name: 'campaign-edit', params: { id: campaignId } });
}

async function deleteCampaign() {
  try {
    await campaignClient.deleteCampaign(campaignId);
    
    // Clear the active campaign if it's the one being deleted
    if (campaignStore.currentCampaign?.id === campaignId) {
      campaignStore.setActiveCampaign(null);
    }
    
    showNotification('Campaign deleted successfully');
    router.push({ name: 'campaigns' });
  } catch (err) {
    showNotification('Failed to delete campaign');
    console.error('Error deleting campaign:', err);
  }
}

// Simple notification function (we can replace this with a proper notification system later)
function showNotification(message: string) {
  alert(message);
}

function handleSessionCreated() {
  // Refresh campaign data
  refreshCampaign();
  showNotification('Game session scheduled successfully');
}

async function refreshCampaign() {
  try {
    const campaign = await campaignClient.getCampaign(campaignId);
    campaignData.value = campaign;
    
    // Update active campaign in the store
    campaignStore.setActiveCampaign(campaign);
  } catch (err) {
    console.error('Error refreshing campaign:', err);
  }
}

async function updateStatus(newStatus: ICampaign['status']) {
  if (!campaign.value) return;
  
  try {
    await campaignClient.updateCampaign(campaignId, { status: newStatus });
    campaignData.value = { ...campaign.value, status: newStatus };
    showStatusDropdown.value = false;
    showNotification('Campaign status updated successfully');
  } catch (err) {
    console.error('Error updating campaign status:', err);
    showNotification('Failed to update campaign status');
  }
}

function formatDateOnly(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

// Close dropdown when clicking outside
function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement;
  if (!target.closest('.status-dropdown')) {
    showStatusDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="campaign-detail-view max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Loading Spinner -->
    <div v-if="loading" class="flex justify-center items-center min-h-[400px]">
      <div
        class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"
      ></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-10">
      <p class="text-red-600 mb-4">{{ error }}</p>
      <button
        @click="router.push({ name: 'campaigns' })"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Return to Campaigns
      </button>
    </div>

    <template v-else-if="campaign">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <h1 class="text-3xl font-semibold text-dragon">{{ campaign.name }}</h1>
              <div class="relative status-dropdown">
                <button
                  @click="showStatusDropdown = !showStatusDropdown"
                  :class="[
                    'px-3 py-1 text-xs font-bold rounded-full shadow-sm border cursor-pointer transition-all duration-200 hover:shadow-md',
                    statusConfig.class
                  ]"
                >
                  {{ statusConfig.emoji }} {{ statusConfig.text }}
                </button>
                <div
                  v-if="showStatusDropdown"
                  class="absolute top-full left-0 mt-1 bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-md shadow-lg z-10 min-w-32"
                >
                  <button
                    v-for="option in statusOptions"
                    :key="option.value"
                    @click="updateStatus(option.value)"
                    class="block w-full text-left px-3 py-2 text-sm hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors"
                    :class="{
                      'bg-stone-100 dark:bg-stone-600': campaign.status === option.value
                    }"
                  >
                    {{ option.emoji }} {{ option.label }}
                  </button>
                </div>
              </div>
            </div>
            <p v-if="campaign.description" class="mt-2 text-ash dark:text-stone-300">
              {{ campaign.description }}
            </p>
          </div>

          <div class="flex space-x-3">
            <button
              @click="showInviteModal = true"
              class="btn btn-success shadow-lg"
            >
              👥 Invite Players
            </button>
            <button
              @click="editCampaign"
              class="inline-flex items-center p-2 rounded-md text-gold hover:text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900 focus:outline-none transition-all duration-200 shadow-sm"
              title="Edit Campaign"
            >
              ✏️
            </button>
            <button
              @click="showDeleteModal = true"
              class="inline-flex items-center p-2 rounded-md text-dragon hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900 focus:outline-none transition-all duration-200 shadow-sm"
              title="Delete Campaign"
            >
              🗑️
            </button>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-stone dark:bg-stone-700 p-4 rounded-lg shadow-sm border border-stone-300 dark:border-stone-600">
            <h3 class="text-sm uppercase text-gold font-bold">🎲 Game System</h3>
            <p class="mt-1 text-onyx dark:text-parchment font-medium">{{ gameSystem?.name || 'Unknown' }}</p>
          </div>

          <div class="bg-stone dark:bg-stone-700 p-4 rounded-lg shadow-sm border border-stone-300 dark:border-stone-600">
            <h3 class="text-sm uppercase text-gold font-bold">🎭 Game Master</h3>
            <p class="mt-1 text-onyx dark:text-parchment font-medium">
              {{ (campaign as any).gameMaster?.username || 'Unknown' }}
            </p>
          </div>

          <div class="bg-stone dark:bg-stone-700 p-4 rounded-lg shadow-sm border border-stone-300 dark:border-stone-600">
            <h3 class="text-sm uppercase text-gold font-bold">📅 Created</h3>
            <p class="mt-1 text-onyx dark:text-parchment font-medium">
              {{ (campaign as any).createdAt ? formatDateOnly((campaign as any).createdAt) : '' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Campaign Content -->
      <div class="space-y-8">
        <!-- Game Sessions Section -->
        <div class="bg-obsidian dark:bg-stone-800 rounded-lg shadow-xl overflow-hidden border border-stone-300 dark:border-stone-600">
          <CampaignSessionList :campaignId="campaignId" @schedule-session="showScheduleModal = true" />
        </div>

        <!-- Characters and Encounters Section - Side by Side on Desktop -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Characters Section -->
          <div class="bg-obsidian dark:bg-stone-800 rounded-lg shadow-xl overflow-hidden border border-stone-300 dark:border-stone-600">
            <CampaignCharacterList :campaignId="campaignId" />
          </div>

          <!-- Encounters Section -->
          <div class="bg-obsidian dark:bg-stone-800 rounded-lg shadow-xl overflow-hidden border border-stone-300 dark:border-stone-600">
            <CampaignEncounterList :campaignId="campaignId" />
          </div>
        </div>

      </div>
    </template>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
      >
        <!-- Background overlay -->
        <div
          class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
        ></div>

        <!-- Modal panel -->
        <div
          class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
        >
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div
                class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
              >
                <!-- Heroicon name: outline/exclamation -->
                <svg
                  class="h-6 w-6 text-red-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Delete Campaign
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    Are you sure you want to delete this campaign? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              @click="
                deleteCampaign();
                showDeleteModal = false;
              "
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Delete
            </button>
            <button
              type="button"
              @click="showDeleteModal = false"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite Modal -->
    <CampaignInviteModal
      v-if="showInviteModal"
      :campaign-id="campaignId"
      :show="showInviteModal"
      @close="showInviteModal = false"
      @invited="showNotification('Invite sent successfully')"
    />

    <!-- Schedule Session Modal -->
    <GameSessionScheduleModal
      v-if="showScheduleModal"
      :campaign-id="campaignId"
      :show="showScheduleModal"
      @close="showScheduleModal = false"
      @created="handleSessionCreated"
    />
  </div>
</template>

<style scoped>
.campaign-detail-view {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
