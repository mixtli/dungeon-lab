import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ICampaign, IInvite } from '@dungeon-lab/shared/types/index.mjs';
import { CampaignsClient } from '@dungeon-lab/client/index.mjs';
import { ICampaignCreateData, ICampaignPatchData } from '@dungeon-lab/shared/types/index.mjs';

const campaignClient = new CampaignsClient();

export const useCampaignStore = defineStore('campaign', () => {
  // State
  const currentCampaign = ref<ICampaign | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Actions
  function setActiveCampaign(campaign: ICampaign | null) {
    currentCampaign.value = campaign;
  }

  async function fetchCampaign(id: string) {
    loading.value = true;
    error.value = null;

    try {
      const campaign = await campaignClient.getCampaign(id);
      currentCampaign.value = campaign;
      return currentCampaign.value;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : `Failed to fetch campaign ${id}`;
      console.error(`Error fetching campaign ${id}:`, err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function createCampaign(campaignData: ICampaignCreateData) {
    loading.value = true;
    error.value = null;

    try {
      const newCampaign = await campaignClient.createCampaign(campaignData);
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

  async function updateCampaign(id: string, campaignData: ICampaignPatchData) {
    loading.value = true;
    error.value = null;

    try {
      const updatedCampaign = await campaignClient.updateCampaign(id, campaignData);

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
      await campaignClient.deleteCampaign(id);

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

  async function sendInvite(inviteData: Omit<IInvite, 'id'>) {
    loading.value = true;
    error.value = null;

    try {
      return await campaignClient.sendInvite(inviteData);
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
    currentCampaign,
    loading,
    error,

    // Actions
    setActiveCampaign,
    fetchCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendInvite
  };
});
