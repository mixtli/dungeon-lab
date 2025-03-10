import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../plugins/axios.mjs';
import type { IGameSession, IGameSessionCreateData } from '@dungeon-lab/shared/index.mjs';
import { GameSessionStatus } from '@dungeon-lab/shared/src/schemas/game-session.schema.mjs';
import type { IActor } from '@dungeon-lab/shared/src/schemas/actor.schema.mjs';
import type { ICampaign } from '@dungeon-lab/shared/src/schemas/campaign.schema.mjs';
import type { z } from 'zod';
import { useAuthStore } from './auth.mjs';
import { ActorModel } from '../models/actor.model.mjs';

// Extend IGameSession to include id for frontend use
interface GameSessionWithId extends IGameSession {
  id: string;
}

export const useGameSessionStore = defineStore('gameSession', () => {
  const authStore = useAuthStore();

  // State
  const currentSession = ref<GameSessionWithId | null>(null);
  const currentCampaign = ref<ICampaign | null>(null);
  const currentCharacter = ref<IActor | null>(null);
  const campaignSessions = ref<GameSessionWithId[]>([]);
  const allSessions = ref<GameSessionWithId[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const isGameMaster = computed(() => {
    return currentSession.value?.gameMasterId === authStore.user?.id;
  });

  // Actions
  async function createGameSession(data: Omit<IGameSessionCreateData, 'participants'>) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post('/api/game-sessions', {
        ...data,
        participants: [] // Server will add the creator as the first participant
      });
      currentSession.value = response.data;
      return currentSession.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to create game session';
      console.error('Error creating game session:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getGameSession(id: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(`/api/game-sessions/${id}`);
      currentSession.value = response.data;

      if (!currentSession.value?.campaignId) {
        throw new Error('Game session has no campaign ID');
      }

      // Get the campaign and character information
      const campaignResponse = await api.get(`/api/campaigns/${currentSession.value.campaignId}`);
      currentCampaign.value = campaignResponse.data;

      if (!currentCampaign.value) {
        throw new Error('Failed to fetch campaign data');
      }

      // Find the current user's character in the campaign by checking each actor
      let foundCharacter = null;
      for (const actorId of currentCampaign.value.members) {
        try {
          const actorResponse = await api.get(`/api/actors/${actorId}`);
          if (actorResponse.data.createdBy === authStore.user?.id) {
            foundCharacter = actorResponse.data;
            break;
          }
        } catch (err) {
          console.warn(`Failed to fetch actor ${actorId}:`, err);
        }
      }

      if (foundCharacter) {
        currentCharacter.value = foundCharacter;
      } else if (!isGameMaster.value) {
        error.value = 'No character found in this campaign';
        throw new Error('No character found in this campaign');
      }

      return currentSession.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || `Failed to fetch game session ${id}`;
      console.error(`Error fetching game session ${id}:`, err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCampaignSessions(campaignId: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(`/api/game-sessions/campaign/${campaignId}`);
      campaignSessions.value = response.data;
      return campaignSessions.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || `Failed to fetch sessions for campaign ${campaignId}`;
      console.error(`Error fetching campaign sessions:`, err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchAllSessions() {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get('/api/game-sessions');
      allSessions.value = response.data;
      return allSessions.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch game sessions';
      console.error('Error fetching game sessions:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteGameSession(id: string) {
    loading.value = true;
    error.value = null;

    try {
      await api.delete(`/api/game-sessions/${id}`);
      
      // Remove from all relevant lists
      if (currentSession.value?.id === id) {
        currentSession.value = null;
      }
      campaignSessions.value = campaignSessions.value.filter(session => session.id !== id);
      allSessions.value = allSessions.value.filter(session => session.id !== id);
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to delete game session';
      console.error('Error deleting game session:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateSessionStatus(id: string, status: z.infer<typeof GameSessionStatus>) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.patch(`/api/game-sessions/${id}/status`, { status });
      
      // Update in all relevant lists
      if (currentSession.value?.id === id) {
        currentSession.value = response.data;
      }
      
      const updateSessionInList = (list: GameSessionWithId[]) => {
        const index = list.findIndex(s => s.id === id);
        if (index !== -1) {
          list[index] = response.data;
        }
      };

      updateSessionInList(campaignSessions.value);
      updateSessionInList(allSessions.value);

      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to update session status';
      console.error('Error updating session status:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearSession() {
    currentSession.value = null;
    currentCampaign.value = null;
    currentCharacter.value = null;
    error.value = null;
  }

  return {
    currentSession,
    currentCampaign,
    currentCharacter,
    campaignSessions,
    allSessions,
    loading,
    error,
    isGameMaster,
    createGameSession,
    getGameSession,
    fetchCampaignSessions,
    fetchAllSessions,
    deleteGameSession,
    updateSessionStatus,
    clearSession
  };
}); 