import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../plugins/axios.mjs';
import type { IGameSession, IGameSessionCreateData } from '@dungeon-lab/shared/index.mjs';

// Extend IGameSession to include id for frontend use
interface GameSessionWithId extends IGameSession {
  id: string;
}

export const useGameSessionStore = defineStore('gameSession', () => {
  // State
  const currentSession = ref<GameSessionWithId | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

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
      return currentSession.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || `Failed to fetch game session ${id}`;
      console.error(`Error fetching game session ${id}:`, err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    currentSession,
    loading,
    error,
    createGameSession,
    getGameSession
  };
}); 