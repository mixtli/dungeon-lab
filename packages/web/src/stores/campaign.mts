import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { type ICampaign, type IInvite } from '@dungeon-lab/shared/index.mjs';
import * as campaignApi from '../api/campaigns.mjs';

export const useCampaignStore = defineStore('campaign', () => {
  // State
  const campaigns = ref<ICampaign[]>([]);
  const currentCampaign = ref<ICampaign | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const myCampaigns = computed(() => campaigns.value);
  const getCampaignById = (id: string) => campaigns.value.find((c) => c.id === id);

  // Actions
  async function fetchCampaigns() {
    loading.value = true;
    error.value = null;

    try {
      campaigns.value = await campaignApi.getCampaigns();
      return campaigns.value;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch campaigns';
      console.error('Error fetching campaigns:', err);
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchCampaign(id: string) {
    loading.value = true;
    error.value = null;

    try {
      const campaign = await campaignApi.getCampaign(id);
      currentCampaign.value = campaign;

      // Also update in the campaigns list if it exists
      const index = campaigns.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        campaigns.value[index] = campaign;
      }

      return currentCampaign.value;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : `Failed to fetch campaign ${id}`;
      console.error(`Error fetching campaign ${id}:`, err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createCampaign(campaignData: Omit<ICampaign, 'id'>) {
    loading.value = true;
    error.value = null;

    try {
      const newCampaign = await campaignApi.createCampaign(campaignData);
      campaigns.value.push(newCampaign);
      currentCampaign.value = newCampaign;
      return newCampaign;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to create campaign';
      console.error('Error creating campaign:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateCampaign(id: string, campaignData: Partial<ICampaign>) {
    loading.value = true;
    error.value = null;

    try {
      const updatedCampaign = await campaignApi.updateCampaign(id, campaignData);

      // Update in campaigns list
      const index = campaigns.value.findIndex((c) => c.id === id);
      if (index !== -1) {
        campaigns.value[index] = updatedCampaign;
      }

      // Update current campaign if it's the one being edited
      if (currentCampaign.value?.id === id) {
        currentCampaign.value = updatedCampaign;
      }

      return updatedCampaign;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : `Failed to update campaign ${id}`;
      console.error(`Error updating campaign ${id}:`, err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteCampaign(id: string) {
    loading.value = true;
    error.value = null;

    try {
      await campaignApi.deleteCampaign(id);

      // Remove from campaigns list
      campaigns.value = campaigns.value.filter((c) => c.id !== id);

      // Clear current campaign if it's the one being deleted
      if (currentCampaign.value?.id === id) {
        currentCampaign.value = null;
      }

      return true;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : `Failed to delete campaign ${id}`;
      console.error(`Error deleting campaign ${id}:`, err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function sendInvite(inviteData: IInvite) {
    loading.value = true;
    error.value = null;

    try {
      return await campaignApi.sendInvite(inviteData);
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to send invite';
      console.error('Error sending invite:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    campaigns,
    currentCampaign,
    loading,
    error,

    // Getters
    myCampaigns,
    getCampaignById,

    // Actions
    fetchCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendInvite
  };
});
