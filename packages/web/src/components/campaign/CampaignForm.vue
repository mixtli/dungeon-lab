<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCampaignStore } from '../../stores/campaign.store.mjs';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store.mjs';
import { pluginRegistry } from '../../services/plugin-registry.service.mjs';
import { CampaignsClient } from '@dungeon-lab/client/index.mjs';
import type { ICampaign } from '@dungeon-lab/shared/types/index.mjs';

const props = defineProps<{
  campaignId?: string;
  isEdit?: boolean;
}>();

// Stores, clients, and router
const campaignStore = useCampaignStore();
const campaignClient = new CampaignsClient();
const authStore = useAuthStore();
const router = useRouter();

// State
const loading = ref(false);
const error = ref<string | null>(null);

// Computed
const isEditMode = computed(() => props.isEdit || false);
const formTitle = computed(() => (isEditMode.value ? 'Edit Campaign' : 'Create New Campaign'));
const submitButtonText = computed(() => (isEditMode.value ? 'Save Changes' : 'Create Campaign'));

const formData = ref<{
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'archived' | 'planning';
  setting: string | undefined;
}>({
  name: '',
  description: '',
  status: 'active',
  setting: undefined
});

const gameSystemId = ref('');

const isCreateForm = computed(() => !isEditMode.value);

// Get game systems
const gameSystems = computed(() => {
  return pluginRegistry
    .getPlugins()
    .filter(plugin => plugin.config.type === 'gameSystem' && !!plugin.config.enabled)
    .map(plugin => ({
      id: plugin.config.id,
      name: plugin.config.name,
      description: plugin.config.description || '',
    }));
});

// Load campaign data if in edit mode
onMounted(async () => {
  if (isEditMode.value && props.campaignId) {
    loading.value = true;
    try {
      const campaign = await campaignClient.getCampaign(props.campaignId);
      if (campaign) {
        formData.value = {
          name: campaign.name,
          description: campaign.description || '',
          status: campaign.status,
          setting: campaign.setting
        };
        gameSystemId.value = String(campaign.gameSystemId);
      } else {
        error.value = 'Campaign not found';
        router.push({ name: 'campaigns' });
      }
    } catch (err) {
      error.value = 'Failed to load campaign data';
      console.error('Error loading campaign:', err);
    } finally {
      loading.value = false;
    }
  }
});

// Submit form
async function submitForm() {
  error.value = null;
  loading.value = true;

  try {
    let updatedCampaign: ICampaign;
    
    if (isEditMode.value && props.campaignId) {
      // Update existing campaign
      const updateData = {
        ...formData.value
      };
      updatedCampaign = await campaignClient.updateCampaign(props.campaignId, updateData);
      
      // Update the active campaign in the store if this is the active one
      if (campaignStore.currentCampaign?.id === props.campaignId) {
        campaignStore.setActiveCampaign(updatedCampaign);
      }
      
      router.push({ name: 'campaign-detail', params: { id: props.campaignId } });
    } else {
      // Create new campaign
      if (!formData.value.name) {
        error.value = 'Name is required';
        return;
      }

      if (!authStore.user?.id) {
        error.value = 'You must be logged in to create a campaign';
        return;
      }

      const createData = {
        name: formData.value.name,
        description: formData.value.description || '',
        status: formData.value.status,
        setting: formData.value.setting,
        gameSystemId: gameSystemId.value,
        gameMasterId: authStore.user.id,
        startDate: new Date().toISOString(),
        characterIds: []
      };

      if (!createData.gameSystemId) {
        error.value = 'Please select a game system';
        return;
      }

      updatedCampaign = await campaignClient.createCampaign(createData);
      
      // Set as active campaign
      campaignStore.setActiveCampaign(updatedCampaign);
      
      router.push({ name: 'campaign-detail', params: { id: updatedCampaign.id } });
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
    console.error('Form submission error:', err);
  } finally {
    loading.value = false;
  }
}

// Cancel form
function cancelForm() {
  if (isEditMode.value && props.campaignId) {
    router.push({ name: 'campaign-detail', params: { id: props.campaignId } });
  } else {
    router.push({ name: 'campaigns' });
  }
}
</script>

<template>
  <div class="campaign-form">
    <h1 class="text-2xl font-semibold mb-6">{{ formTitle }}</h1>

    <form @submit.prevent="submitForm" class="space-y-6">
      <div
        v-if="error"
        class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        {{ error }}
      </div>

      <div>
        <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="Enter campaign name"
        />
      </div>

      <div>
        <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="description"
          v-model="formData.description"
          rows="3"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="Enter campaign description"
        ></textarea>
      </div>

      <div v-if="isCreateForm">
        <label for="gameSystem" class="block text-sm font-medium text-gray-700">Game System</label>
        <select
          id="gameSystem"
          v-model="gameSystemId"
          required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="" disabled>Select game system</option>
          <option v-for="system in gameSystems" :key="system.id" :value="system.id">
            {{ system.name }}
            <span v-if="system.description" class="text-gray-500"> - {{ system.description }}</span>
          </option>
        </select>
        <p v-if="!gameSystems.length" class="mt-2 text-sm text-gray-500">
          No game system plugins are available. Please install a game system plugin.
        </p>
      </div>

      <div>
        <label for="status" class="block text-sm font-medium text-gray-700">Status</label>
        <select
          id="status"
          v-model="formData.status"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div class="flex justify-end space-x-3">
        <button
          type="button"
          @click="cancelForm"
          class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="!formData.name || (!gameSystemId && isCreateForm) || loading"
          class="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            v-if="loading"
            class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          {{ submitButtonText }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.campaign-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
</style>
