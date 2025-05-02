import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { IEncounter } from '@dungeon-lab/shared/types/index.mjs';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';
import { EncountersClient } from '@dungeon-lab/client/index.mjs';
import { ActorsClient } from '@dungeon-lab/client/index.mjs';

const encounterClient = new EncountersClient();
const actorClient = new ActorsClient();

export interface IEncounterWithActors extends Omit<IEncounter, 'participants'> {
  participants: IActor[];
}

export const useEncounterStore = defineStore('encounter', () => {
  const currentEncounter = ref<IEncounterWithActors | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function updateEncounterStatus(
    encounterId: string,
    status: 'draft' | 'ready' | 'in_progress' | 'completed'
  ) {
    loading.value = true;
    error.value = null;

    try {
      const updatedEncounter = await encounterClient.updateEncounterStatus(encounterId, status);
      if (currentEncounter.value && currentEncounter.value.id === encounterId) {
        currentEncounter.value = { ...currentEncounter.value, status: updatedEncounter.status };
      }
    } catch (err) {
      console.error('Failed to update encounter status:', err);
      error.value = err instanceof Error ? err.message : 'Failed to update encounter status';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchEncounter(encounterId: string) {
    loading.value = true;
    error.value = null;

    try {
      const encounter = await encounterClient.getEncounter(encounterId);

      // Initialize with empty participants array in case participants don't exist
      let participants: IActor[] = [];

      // Only try to fetch participants if the encounter has a participants array
      if (encounter && Array.isArray(encounter.participants) && encounter.participants.length > 0) {
        // Fetch actor details for each participant
        const participantPromises = encounter.participants.map(async (participantId: string) => {
          if (!participantId) return null;
          try {
            const actor = await actorClient.getActor(participantId);
            return actor;
          } catch (error) {
            console.error(`Failed to fetch actor ${participantId}:`, error);
            return null;
          }
        });

        // Filter out null values from participants
        const participantResults = await Promise.all(participantPromises);
        participants = participantResults.filter((p) => p !== null && p !== undefined);
      }

      // Set current encounter with participants
      currentEncounter.value = {
        ...encounter,
        participants
      };
    } catch (err) {
      console.error('Failed to fetch encounter:', err);
      error.value = err instanceof Error ? err.message : 'Failed to fetch encounter';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createEncounter(data: Omit<IEncounter, 'id'>) {
    loading.value = true;
    error.value = null;

    try {
      const encounter = await encounterClient.createEncounter(data);
      return encounter.id;
    } catch (err: unknown) {
      console.error('Failed to create encounter:', err);
      error.value = err instanceof Error ? err.message : 'Failed to create encounter';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getEncounter(encounterId: string): Promise<IEncounter> {
    return encounterClient.getEncounter(encounterId);
  }

  async function updateEncounter(
    encounterId: string,
    data: Partial<IEncounter>
  ): Promise<IEncounter> {
    return encounterClient.updateEncounter(encounterId, data);
  }

  async function deleteEncounter(encounterId: string): Promise<void> {
    await encounterClient.deleteEncounter(encounterId);
  }

  async function addParticipant(encounterId: string, actorId: string) {
    if (!currentEncounter.value) return;

    // Ensure we have a valid participants array
    const currentParticipants = currentEncounter.value.participants || [];
    const participants = [...currentParticipants.map((p: IActor | null) => p?.id || ''), actorId];

    await updateEncounter(encounterId, { participants });
    await fetchEncounter(encounterId);
  }

  return {
    currentEncounter,
    loading,
    error,
    createEncounter,
    getEncounter,
    updateEncounter,
    deleteEncounter,
    addParticipant,
    fetchEncounter,
    updateEncounterStatus
  };
});
