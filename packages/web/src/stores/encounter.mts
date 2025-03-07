import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { IEncounter, IEncounterCreateData } from '@dungeon-lab/shared/src/schemas/encounter.schema.mjs';
import type { IActor } from '@dungeon-lab/shared/src/schemas/actor.schema.mjs';
import { useApi } from '../composables/useApi.js';

export interface IEncounterWithActors extends Omit<IEncounter, 'participants'> {
  participants: IActor[];
}

export const useEncounterStore = defineStore('encounter', () => {
  const currentEncounter = ref<IEncounterWithActors | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const api = useApi();

  async function fetchEncounter(encounterId: string) {
    loading.value = true;
    error.value = null;
    
    try {
      const encounter = await api.get<IEncounter>(`/encounters/${encounterId}`);
      
      // Initialize with empty participants array in case participants don't exist
      let participants: IActor[] = [];
      
      // Only try to fetch participants if the encounter has a participants array
      if (encounter && Array.isArray(encounter.participants) && encounter.participants.length > 0) {
        // Fetch actor details for each participant
        const participantPromises = encounter.participants.map(async (participantId) => {
          if (!participantId) return null;
          try {
            const actor = await api.get<IActor>(`/actors/${participantId}`);
            return actor;
          } catch (error) {
            console.error(`Failed to fetch actor ${participantId}:`, error);
            return null;
          }
        });
        
        // Filter out null values from participants
        const participantResults = await Promise.all(participantPromises);
        participants = participantResults.filter((p): p is IActor => p !== null);
      }
      
      // Set current encounter with participants, ensuring it's never undefined
      currentEncounter.value = {
        ...encounter,
        participants,
      };
    } catch (err: unknown) {
      console.error('Error fetching encounter:', err);
      error.value = err instanceof Error ? err.message : 'Failed to load encounter';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createEncounter(data: Omit<IEncounterCreateData, 'campaignId'>, campaignId: string) {
    loading.value = true;
    error.value = null;
    
    try {
      const encounter = await api.post<IEncounter>(`/campaigns/${campaignId}/encounters`, data);
      
      // Log the full response to inspect its structure
      console.log('Server response:', encounter);
      
      // Check all possible ID properties
      const encounterId = encounter.id || encounter._id || (encounter as any)._doc?.id || (encounter as any)._doc?._id;
      
      console.log('Extracted encounter ID:', encounterId);
      
      if (!encounterId) {
        throw new Error('Server response missing encounter ID');
      }
      
      return encounterId;
    } catch (err: unknown) {
      console.error('Failed to create encounter:', err);
      error.value = 'Failed to create encounter';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getEncounter(id: string): Promise<IEncounter> {
    return api.get<IEncounter>(`/encounters/${id}`);
  }

  async function updateEncounter(id: string, data: Partial<IEncounter>): Promise<IEncounter> {
    return api.patch<IEncounter>(`/encounters/${id}`, data);
  }

  async function deleteEncounter(id: string): Promise<void> {
    await api.delete(`/encounters/${id}`);
  }

  async function addParticipant(encounterId: string, actorId: string) {
    if (!currentEncounter.value) return;
    
    // Ensure we have a valid participants array
    const currentParticipants = currentEncounter.value.participants || [];
    const participants = [...currentParticipants.map(p => p?.id || ''), actorId];
    
    await updateEncounter(encounterId, { participants });
    await fetchEncounter(encounterId);
  }

  async function removeParticipant(encounterId: string, actorId: string) {
    if (!currentEncounter.value) return;
    
    // Ensure we have a valid participants array
    const currentParticipants = currentEncounter.value.participants || [];
    const participants = currentParticipants
      .filter(p => p && (p.id || '') !== actorId)
      .map(p => p?.id || '');
    
    await updateEncounter(encounterId, { participants });
    await fetchEncounter(encounterId);
  }

  return {
    currentEncounter,
    loading,
    error,
    fetchEncounter,
    createEncounter,
    getEncounter,
    updateEncounter,
    deleteEncounter,
    addParticipant,
    removeParticipant,
  };
}); 