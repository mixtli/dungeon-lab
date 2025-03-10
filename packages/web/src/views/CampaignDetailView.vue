<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCampaignStore } from '../stores/campaign.mjs';
import { pluginRegistry } from '../services/plugin-registry.service.mjs';
import { formatDate } from '../utils/date-utils.mjs';
import type { ICampaign } from '@dungeon-lab/shared/index.mjs';
import CampaignCharacterList from '../components/campaign/CampaignCharacterList.vue';
import CampaignEncounterList from '../components/campaign/CampaignEncounterList.vue';
import CampaignInviteModal from '../components/campaign/CampaignInviteModal.vue';
import GameSessionScheduleModal from '../components/campaign/GameSessionScheduleModal.vue';
import CampaignSessionList from '../components/campaign/CampaignSessionList.vue';

const route = useRoute();
const router = useRouter();
const campaignStore = useCampaignStore();
const loading = ref(false);
const error = ref<string | null>(null);
const showDeleteModal = ref(false);
const showInviteModal = ref(false);
const showScheduleModal = ref(false);

const campaignId = route.params.id as string;

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

const campaign = computed(() => campaignStore.currentCampaign as ICampaign | null);

// Get the campaign's game system
const gameSystem = computed(() => {
  if (!campaign.value) return null;
  
  const plugin = pluginRegistry.getGameSystemPlugin(String(campaign.value.gameSystemId));
  return plugin ? {
    name: plugin.config.name,
    description: plugin.config.description
  } : null;
});

const statusClass = computed(() => {
  if (!campaign.value) return '';
  
  switch (campaign.value.status) {
    case 'active': return 'text-green-500';
    case 'paused': return 'text-yellow-500';
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
    await campaignStore.deleteCampaign(campaignId);
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

function handleSessionCreated(sessionId: string) {
  showNotification('Game session scheduled successfully');
  // Optionally, you could refresh the campaign data here
}
</script>

<template>
  <div class="campaign-detail-view max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Loading Spinner -->
    <div v-if="loading" class="flex justify-center items-center min-h-[400px]">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
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
            <h1 class="text-3xl font-semibold text-gray-900">{{ campaign.name }}</h1>
            <p v-if="campaign.description" class="mt-2 text-gray-500">
              {{ campaign.description }}
            </p>
          </div>
          
          <div class="flex space-x-3">
            <button 
              @click="showScheduleModal = true"
              class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Schedule Session
            </button>
            <button 
              @click="editCampaign"
              class="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Edit
            </button>
            <button 
              @click="showDeleteModal = true"
              class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Delete
            </button>
          </div>
        </div>
        
        <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
            <h3 class="text-sm uppercase text-gray-500 font-medium">Game System</h3>
            <p class="mt-1 text-gray-900">{{ gameSystem?.name || 'Unknown' }}</p>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
            <h3 class="text-sm uppercase text-gray-500 font-medium">Status</h3>
            <p class="mt-1" :class="statusClass">
              {{ campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1) }}
            </p>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
            <h3 class="text-sm uppercase text-gray-500 font-medium">Created</h3>
            <p class="mt-1 text-gray-900">
              {{ (campaign as any).createdAt ? formatDate((campaign as any).createdAt) : '' }}
            </p>
          </div>
        </div>
      </div>
      
      <!-- Campaign Content -->
      <div class="space-y-8">
        <!-- Game Sessions Section -->
        <div class="bg-white rounded-lg shadow-sm overflow-hidden">
          <CampaignSessionList :campaignId="campaignId" />
        </div>

        <!-- Characters Section -->
        <div class="bg-white rounded-lg shadow-sm overflow-hidden">
          <CampaignCharacterList :campaignId="campaignId" />
        </div>

        <!-- Encounters Section -->
        <div class="bg-white rounded-lg shadow-sm overflow-hidden">
          <CampaignEncounterList :campaignId="campaignId" />
        </div>

        <!-- Getting Started Section -->
        <div>
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>
          
          <div class="space-y-4">
            <!-- Invite Players Card -->
            <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-lg font-medium text-gray-900">Invite Players</h3>
                <button 
                  @click="showInviteModal = true"
                  class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Send Invites
                </button>
              </div>
              <div class="px-4 py-3">
                <p class="text-gray-600">
                  Invite players to join your campaign. They will receive an email with a link to join.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    
    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <!-- Background overlay -->
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

        <!-- Modal panel -->
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <!-- Warning icon -->
                <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
              @click="deleteCampaign(); showDeleteModal = false"
            >
              Delete
            </button>
            <button 
              type="button" 
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              @click="showDeleteModal = false"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite Modal -->
    <CampaignInviteModal
      v-if="campaign?.id"
      :campaign-id="campaign.id"
      :show="showInviteModal"
      @close="showInviteModal = false"
      @invited="showNotification('Invite sent successfully')"
    />

    <!-- Schedule Session Modal -->
    <GameSessionScheduleModal
      v-if="campaign?.id"
      :campaign-id="campaign.id"
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