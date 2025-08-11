<script setup lang="ts">
// LEGACY FILE: This will be rewritten as part of the new Encounter Implementation
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGameStateStore } from '../../stores/game-state.store.mjs';
import { useGameSessionStore } from '../../stores/game-session.store.mts';
import { IGameSession, IMap, IAsset, IEncounter } from '@dungeon-lab/shared/types/index.mjs';
import { GameSessionsClient, CampaignsClient, MapsClient, EncountersClient } from '@dungeon-lab/client/index.mjs';
import { GameActionClientService } from '../../services/game-action-client.service.mjs';

const gameSessionClient = new GameSessionsClient();
const campaignsClient = new CampaignsClient();
const mapsClient = new MapsClient();
const encountersClient = new EncountersClient();
const gameActionClient = new GameActionClientService();
const route = useRoute();
const router = useRouter();
const gameStateStore = useGameStateStore();
const gameSessionStore = useGameSessionStore();
const loadError = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const campaignName = ref<string>('');
const mapData = ref<IMap | null>(null);
const encounterData = ref<IEncounter | null>(null);

// Function to get thumbnail URL from map
const getThumbnailUrl = (map: IMap): string | undefined => {
  if (map.thumbnailId) {
    // Handle populated ObjectId reference
    if (typeof map.thumbnailId === 'object') {
      const asset = map.thumbnailId as unknown as IAsset;
      return asset.url;
    }
  }
  // Fallback for legacy data structure
  if ('thumbnail' in map && typeof map.thumbnail === 'object' && map.thumbnail !== null && 'url' in map.thumbnail) {
    return map.thumbnail.url as string;
  }
  return undefined;
};

const canStartEncounter = computed(() => {
  const encounterStatus = encounterData.value?.status || gameStateStore.currentEncounter?.status;
  const hasSession = !!gameSessionStore.currentSession;
  return hasSession && encounterStatus === 'stopped';
});

const canStopEncounter = computed(() => {
  const encounterStatus = encounterData.value?.status || gameStateStore.currentEncounter?.status;
  const hasSession = !!gameSessionStore.currentSession;
  return hasSession && encounterStatus === 'in_progress';
});

const isEncounterActive = computed(() => {
  const currentEncounterId = gameStateStore.currentEncounter?.id;
  const thisEncounterId = route.params.id as string;
  return currentEncounterId === thisEncounterId;
});

const canJoinEncounter = computed(() => {
  // Show join button if this encounter is active in game state and user is in a session
  return isEncounterActive.value && !!gameSessionStore.currentSession;
});

/**
 * Get participant name by ID from characters and actors
 */
function getParticipantName(participantId: string): string {
  // Look for the participant in characters first
  const character = gameStateStore.characters.find(c => c.id === participantId);
  if (character) return character.name;
  
  // Then look in actors
  const actor = gameStateStore.actors.find(a => a.id === participantId);
  if (actor) return actor.name;
  
  return 'Unknown Participant';
}

onMounted(async () => {
  console.log('[Debug] Component mounted');
  try {
    loading.value = true;
    const encounterId = route.params.id as string;

    // First fetch the encounter data directly from the API
    console.log('[Debug] Fetching encounter:', { encounterId });
    encounterData.value = await encountersClient.getEncounter(encounterId);
    console.log('[Debug] Encounter data loaded:', encounterData.value);

    // Get campaignId from the encounter data
    const campaignId = encounterData.value.campaignId;
    console.log('[Debug] Campaign ID from encounter:', campaignId);

    // Fetch campaign name
    try {
      const campaign = await campaignsClient.getCampaign(campaignId);
      campaignName.value = campaign.name;
      console.log('[Debug] Campaign name loaded:', campaignName.value);
    } catch (error) {
      console.error('[Debug] Failed to fetch campaign name:', error);
    }

    // Fetch map data if mapId exists
    const mapId = encounterData.value.mapId;
    if (mapId) {
      try {
        const mapIdString = typeof mapId === 'object' ? (mapId as { id: string }).id : mapId;
        const map = await mapsClient.getMap(mapIdString);
        mapData.value = map;
        console.log('[Debug] Map data loaded:', mapData.value?.name);
      } catch (error) {
        console.error('[Debug] Failed to fetch map data:', error);
      }
    }

    // Optionally fetch game session for the campaign (for session management)
    console.log('[Debug] Fetching game session for campaign:', campaignId);
    try {
      const sessions = await gameSessionClient.getGameSessions(campaignId);
      
      // Find an active session for this campaign
      const activeSession = sessions.find((session: IGameSession) => session.status === 'active');
      if (activeSession) {
        console.log('[Debug] Found active session:', activeSession.id);
        // Note: We don't automatically join the session here - that should be user initiated
        // The EncounterDetailView is for viewing encounter details, not automatically running encounters
      } else {
        console.log('[Debug] No active session found for campaign:', campaignId);
      }
    } catch (error) {
      console.error('[Debug] Failed to fetch game sessions:', error);
      // Non-critical error - encounter details can still be shown
    }

  } catch (error) {
    console.error('[Debug] Failed to load encounter:', error);
    loadError.value = error instanceof Error ? error.message : 'Failed to load encounter data';
  } finally {
    loading.value = false;
  }
});


async function handleStartEncounter() {
  const encounter = encounterData.value || gameStateStore.currentEncounter;
  if (!encounter) {
    error.value = 'No encounter data available';
    return;
  }

  try {
    loading.value = true;
    error.value = null;
    successMessage.value = null;

    console.log('[EncounterDetail] Requesting start encounter:', encounter.id);
    
    const response = await gameActionClient.requestStartEncounter(encounter.id);
    
    if (response.success) {
      successMessage.value = 'Encounter started successfully!';
      console.log('[EncounterDetail] Encounter start request successful');
      
      // Navigate to active encounter after short delay to show success message
      setTimeout(() => {
        router.push({ name: 'active-encounter' });
      }, 1500);
    } else {
      console.error('[EncounterDetail] Encounter start request failed:', response.error);
      error.value = response.error?.message || 'Failed to start encounter';
    }
  } catch (err) {
    console.error('[EncounterDetail] Error requesting start encounter:', err);
    error.value = err instanceof Error ? err.message : 'Failed to start encounter';
  } finally {
    loading.value = false;
  }
}


async function handleStopEncounter() {
  const encounter = encounterData.value || gameStateStore.currentEncounter;
  if (!encounter) {
    error.value = 'No encounter data available';
    return;
  }

  try {
    loading.value = true;
    error.value = null;
    successMessage.value = null;

    console.log('[EncounterDetail] Requesting stop encounter:', encounter.id);
    
    const response = await gameActionClient.requestStopEncounter(encounter.id);
    
    if (response.success) {
      successMessage.value = 'Encounter stopped successfully!';
      console.log('[EncounterDetail] Encounter stop request successful');
      
      // Navigate back to campaign after short delay to show success message
      setTimeout(() => {
        router.push({ name: 'campaign-detail', params: { id: encounter.campaignId } });
      }, 1500);
    } else {
      console.error('[EncounterDetail] Encounter stop request failed:', response.error);
      error.value = response.error?.message || 'Failed to stop encounter';
    }
  } catch (err) {
    console.error('[EncounterDetail] Error requesting stop encounter:', err);
    error.value = err instanceof Error ? err.message : 'Failed to stop encounter';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="p-4">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center">
      <div
        class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"
      ></div>
      <span class="ml-2">Loading...</span>
    </div>

    <!-- Success Message -->
    <div v-if="successMessage && !loading" class="max-w-2xl mx-auto mb-6">
      <div class="bg-green-50 border border-green-200 rounded-md p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800">Success</h3>
            <div class="mt-2 text-sm text-green-700">
              {{ successMessage }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error || loadError" class="max-w-2xl mx-auto">
      <div class="bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error</h3>
            <div class="mt-2 text-sm text-red-700">
              {{ error || loadError }}
            </div>
            <div class="mt-4">
              <button
                @click="error = null; loadError = null"
                class="bg-red-100 px-3 py-1 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Encounter Details -->
    <div v-else-if="encounterData || gameStateStore.currentEncounter" class="max-w-2xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">{{ (encounterData || gameStateStore.currentEncounter)?.name }}</h1>

        <div class="flex gap-2">

          <!-- Start Encounter Button -->
          <button
            v-if="canStartEncounter"
            @click="handleStartEncounter"
            :disabled="loading"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              v-if="!loading"
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clip-rule="evenodd"
              />
            </svg>
            <div
              v-if="loading"
              class="animate-spin rounded-full h-4 w-4 mr-2 border-2 border-white border-t-transparent"
            ></div>
            {{ loading ? 'Starting...' : 'Start Encounter' }}
          </button>

          <!-- Stop Encounter Button -->
          <button
            v-if="canStopEncounter"
            @click="handleStopEncounter"
            :disabled="loading"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              v-if="!loading"
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                clip-rule="evenodd"
              />
            </svg>
            <div
              v-if="loading"
              class="animate-spin rounded-full h-4 w-4 mr-2 border-2 border-white border-t-transparent"
            ></div>
            {{ loading ? 'Stopping...' : 'Stop Encounter' }}
          </button>

          <!-- Join Encounter Button (When encounter is active) -->
          <router-link
            v-if="canJoinEncounter"
            :to="{ name: 'active-encounter' }"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            Join Active Encounter
          </router-link>
        </div>
      </div>

      <!-- Status Badge -->
      <div class="mb-4">
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
          :class="{
            'bg-gray-100 text-gray-800': (encounterData || gameStateStore.currentEncounter)?.status === 'stopped',
            'bg-green-100 text-green-800': (encounterData || gameStateStore.currentEncounter)?.status === 'in_progress',
          }"
        >
          {{ (encounterData || gameStateStore.currentEncounter)?.status?.replace('_', ' ') }}
        </span>
      </div>

      <!-- Description if available -->
      <p v-if="(encounterData || gameStateStore.currentEncounter)?.description" class="mt-4 text-gray-600">
        {{ (encounterData || gameStateStore.currentEncounter)?.description }}
      </p>

      <!-- Campaign link -->
      <div v-if="(encounterData || gameStateStore.currentEncounter)?.campaignId" class="mt-6 bg-stone dark:bg-stone-700 p-4 rounded-lg shadow-sm border border-stone-300 dark:border-stone-600">
        <h3 class="text-sm uppercase text-gold font-bold">⚔️ Campaign</h3>
        <router-link
          :to="{ name: 'campaign-detail', params: { id: (encounterData || gameStateStore.currentEncounter)?.campaignId } }"
          class="mt-1 text-onyx dark:text-parchment font-medium hover:text-gold hover:underline block"
        >
          {{ campaignName || 'View Campaign' }}
        </router-link>
      </div>

      <!-- Map info if available -->
      <div v-if="(encounterData || gameStateStore.currentEncounter)?.mapId" class="mt-6 bg-stone dark:bg-stone-700 rounded-lg shadow-sm border border-stone-300 dark:border-stone-600 overflow-hidden">
        <div class="p-4 border-b border-stone-300 dark:border-stone-600">
          <h3 class="text-sm uppercase text-gold font-bold">🗺️ Map</h3>
          <router-link
            :to="{ name: 'map-edit', params: { id: typeof (encounterData || gameStateStore.currentEncounter)?.mapId === 'object' ? ((encounterData || gameStateStore.currentEncounter)?.mapId as any).id : (encounterData || gameStateStore.currentEncounter)?.mapId } }"
            class="text-onyx dark:text-parchment font-medium hover:text-gold hover:underline"
          >
            {{ mapData?.name || 'Map loaded' }}
          </router-link>
        </div>
        <!-- Full map image -->
        <div class="aspect-w-16 aspect-h-9 bg-stone-200 dark:bg-stone-600">
          <img
            v-if="mapData && getThumbnailUrl(mapData)"
            :src="getThumbnailUrl(mapData)"
            :alt="mapData.name"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <span class="text-ash dark:text-stone-300 text-lg">🗺️ No Image</span>
          </div>
        </div>
      </div>

      <!-- Participants section -->
      <div class="mt-6">
        <h2 class="text-lg font-medium mb-2">Participants</h2>
        <div
          v-if="
            !(encounterData || gameStateStore.currentEncounter)?.participants ||
            (encounterData || gameStateStore.currentEncounter)?.participants.length === 0
          "
          class="text-gray-500"
        >
          No participants added yet
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="participantId in (encounterData || gameStateStore.currentEncounter)?.participants"
            :key="participantId"
            class="p-2 bg-gray-50 rounded flex items-center"
          >
            <span>{{ getParticipantName(participantId) }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Not Found State -->
    <div v-else class="text-center text-gray-500">Encounter not found</div>
  </div>
</template>

<style scoped>
.aspect-w-16 {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 */
}

.aspect-w-16 > * {
  position: absolute;
  height: 100%;
  width: 100%;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}
</style>
