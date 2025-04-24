import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { IEncounter } from '@dungeon-lab/shared/index.mjs';
import type { IActor } from '@dungeon-lab/shared/index.mjs';
import * as encounterApi from '../api/encounters.mjs';
import * as actorApi from '../api/actors.mjs';

export interface IEncounterWithActors extends Omit<IEncounter, 'participants'> {
  participants: IActor[];
}

export const useEncounterStore = defineStore('encounter', () => {
  const currentEncounter = ref<IEncounterWithActors | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function updateEncounterStatus(
    encounterId: string,
    campaignId: string,
    status: 'draft' | 'ready' | 'in_progress' | 'completed'
  ) {
    loading.value = true;
    error.value = null;

    try {
      const updatedEncounter = await encounterApi.updateEncounterStatus(
        encounterId,
        campaignId,
        status
      );
      if (currentEncounter.value && currentEncounter.value.id === encounterId) {
        currentEncounter.value = { ...currentEncounter.value, status: updatedEncounter.status };
      }
    } catch (err) {
      console.error('Failed to update encounter status:', err);
      error.value = 'Failed to update encounter status';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchEncounter(encounterId: string, campaignId: string) {
    loading.value = true;
    error.value = null;

    try {
      const encounter = await encounterApi.getEncounter(encounterId, campaignId);

      // Initialize with empty participants array in case participants don't exist
      let participants: IActor[] = [];

      // Only try to fetch participants if the encounter has a participants array
      if (encounter && Array.isArray(encounter.participants) && encounter.participants.length > 0) {
        // Fetch actor details for each participant
        const participantPromises = encounter.participants.map(async (participantId) => {
          if (!participantId) return null;
          try {
            const actor = await actorApi.getActor(participantId);
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

      // Set current encounter with participants
      currentEncounter.value = {
        ...encounter,
        participants
      };
    } catch (err) {
      console.error('Failed to fetch encounter:', err);
      error.value = 'Failed to fetch encounter';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createEncounter(data: Omit<IEncounter, 'campaignId'>, campaignId: string) {
    loading.value = true;
    error.value = null;

    try {
      const encounter = await encounterApi.createEncounter(data, campaignId);
      return encounter.id;
    } catch (err: unknown) {
      console.error('Failed to create encounter:', err);
      error.value = 'Failed to create encounter';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getEncounter(encounterId: string, campaignId: string): Promise<IEncounter> {
    return encounterApi.getEncounter(encounterId, campaignId);
  }

  async function updateEncounter(
    encounterId: string,
    campaignId: string,
    data: Partial<IEncounter>
  ): Promise<IEncounter> {
    return encounterApi.updateEncounter(encounterId, campaignId, data);
  }

  async function deleteEncounter(encounterId: string, campaignId: string): Promise<void> {
    await encounterApi.deleteEncounter(encounterId, campaignId);
  }

  async function addParticipant(encounterId: string, campaignId: string, actorId: string) {
    if (!currentEncounter.value) return;

    // Ensure we have a valid participants array
    const currentParticipants = currentEncounter.value.participants || [];
    const participants = [...currentParticipants.map((p) => p?.id || ''), actorId];

    await updateEncounter(encounterId, campaignId, { participants });
    await fetchEncounter(encounterId, campaignId);
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
