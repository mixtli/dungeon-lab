<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEncounterStore } from '../../stores/encounter.mjs';
import { useGameSessionStore } from '../../stores/game-session.mjs';
import { useSocketStore } from '../../stores/socket.mjs';
import MapGrid from '../../components/encounter/MapGrid.vue';

const route = useRoute();
const router = useRouter();
const encounterStore = useEncounterStore();
const gameSessionStore = useGameSessionStore();
const socketStore = useSocketStore();
const loadError = ref<string | null>(null);

onMounted(async () => {
  const campaignId = route.params.campaignId as string;
  const encounterId = route.params.id as string;
  
  try {
    // First fetch the encounter
    await encounterStore.fetchEncounter(encounterId, campaignId);
    
    // Then fetch the game session for the campaign
    const sessions = await gameSessionStore.fetchCampaignSessions(campaignId);
    
    // Find an active session for this campaign
    const activeSession = sessions.find(session => session.status === 'active');
    if (activeSession) {
      await gameSessionStore.getGameSession(activeSession.id);
      
      // Join the game session if we have one
      if (socketStore.socket && gameSessionStore.currentSession) {
        // Set up a one-time listener for join confirmation
        socketStore.socket.once('user-joined', (data: { userId: string; timestamp: Date }) => {
          console.log('[Debug] Successfully joined session:', data);
        });
        
        // Set up error listener
        socketStore.socket.once('error', (error: { message: string }) => {
          console.error('[Debug] Error joining session:', error);
          loadError.value = 'Failed to join game session';
        });
        
        // Attempt to join the session
        socketStore.socket.emit('join-session', gameSessionStore.currentSession.id);
      }
    }
  } catch (error) {
    console.error('Failed to load encounter:', error);
    loadError.value = 'Failed to load encounter data';
  }
});
</script>

<template>
  <div class="p-4">
    <!-- Loading State -->
    <div v-if="encounterStore.loading" class="flex justify-center items-center">
      <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      <span class="ml-2">Loading...</span>
    </div>
    
    <!-- Error State -->
    <div v-else-if="encounterStore.error || loadError" class="text-red-500 text-center">
      {{ encounterStore.error || loadError }}
    </div>
    
    <!-- Encounter Run View -->
    <div v-else-if="encounterStore.currentEncounter" class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Running: {{ encounterStore.currentEncounter.name }}</h1>
        
        <div class="flex gap-2">
          <!-- Back to Details Button -->
          <button
            @click="router.push({ 
              name: 'encounter-detail', 
              params: { 
                id: route.params.id,
                campaignId: route.params.campaignId 
              } 
            })"
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
            </svg>
            Back to Details
          </button>
        </div>
      </div>
      
      <!-- Main Content Area -->
      <div class="bg-white rounded-lg shadow-sm p-4">
        <div class="aspect-video bg-gray-100 rounded-lg">
          <MapGrid :encounter-id="route.params.id as string" />
        </div>
      </div>
    </div>
    
    <!-- Not Found State -->
    <div v-else class="text-center text-gray-500">
      Encounter not found
    </div>
  </div>
</template> 