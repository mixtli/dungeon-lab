<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEncounterStore } from '../../stores/encounter.mts';
import { useSocketStore } from '../../stores/socket.mjs';
import { useAuthStore } from '../../stores/auth.mjs';
import { useGameSessionStore } from '../../stores/game-session.mjs';

const route = useRoute();
const router = useRouter();
const encounterStore = useEncounterStore();
const socketStore = useSocketStore();
const authStore = useAuthStore();
const gameSessionStore = useGameSessionStore();
const loadError = ref<string | null>(null);

const isGameMaster = computed(() => {
  const result = encounterStore.currentEncounter?.createdBy === authStore.user?.id;
  console.log('[Debug] isGameMaster check:', {
    encounterCreatedBy: encounterStore.currentEncounter?.createdBy,
    currentUserId: authStore.user?.id,
    isGameMaster: result,
  });
  return result;
});

const canStartEncounter = computed(() => {
  const result = isGameMaster.value && encounterStore.currentEncounter?.status === 'ready';
  console.log('[Debug] canStartEncounter check:', {
    isGameMaster: isGameMaster.value,
    encounterStatus: encounterStore.currentEncounter?.status,
    canStart: result,
  });
  return result;
});

const canSetReady = computed(() => {
  const result = isGameMaster.value && encounterStore.currentEncounter?.status === 'draft';
  console.log('[Debug] canSetReady check:', {
    isGameMaster: isGameMaster.value,
    encounterStatus: encounterStore.currentEncounter?.status,
    canSetReady: result,
  });
  return result;
});

const canStopEncounter = computed(() => {
  const result = isGameMaster.value && encounterStore.currentEncounter?.status === 'in_progress';
  console.log('[Debug] canStopEncounter check:', {
    isGameMaster: isGameMaster.value,
    encounterStatus: encounterStore.currentEncounter?.status,
    canStop: result,
  });
  return result;
});

const canRun = computed(() => {
  return encounterStore.currentEncounter?.status === 'in_progress';
});

onMounted(async () => {
  console.log('[Debug] Component mounted');
  try {
    const encounterId = route.params.id as string;
    const campaignId = route.params.campaignId as string;

    // First fetch the encounter to get its data
    console.log('[Debug] Fetching encounter:', { encounterId, campaignId });
    await encounterStore.fetchEncounter(encounterId, campaignId);

    // Then fetch the game session for the campaign
    console.log('[Debug] Fetching game session for campaign:', campaignId);
    const sessions = await gameSessionStore.fetchCampaignSessions(campaignId);

    // Find an active session for this campaign
    const activeSession = sessions.find(session => session.status === 'active');
    if (activeSession) {
      console.log('[Debug] Found active session:', activeSession.id);
      await gameSessionStore.getGameSession(activeSession.id);

      // Join the game session if we have one
      if (gameSessionStore.currentSession) {
        console.log('[Debug] Joining game session:', gameSessionStore.currentSession.id);

        // Set up a one-time listener for join confirmation
        socketStore.socket?.once('user-joined', (data: { userId: string; timestamp: Date }) => {
          console.log('[Debug] Successfully joined session:', data);

          // Set up event listeners after successfully joining
          console.log('[Debug] Setting up socket listeners');
          setupSocketListeners();

          console.log('[Debug] Socket status:', {
            isConnected: socketStore.isConnected,
            hasSocket: !!socketStore.socket,
            currentSession: gameSessionStore.currentSession,
          });
        });

        // Set up error listener
        socketStore.socket?.once('error', (error: { message: string }) => {
          console.error('[Debug] Error joining session:', error);
          loadError.value = 'Failed to join game session';
        });

        // Attempt to join the session
        socketStore.socket?.emit('join-session', gameSessionStore.currentSession.id);
      } else {
        console.warn('[Debug] No game session available to join');
      }
    } else {
      console.warn('[Debug] No active session found for campaign:', campaignId);
    }
  } catch (error) {
    console.error('[Debug] Failed to load encounter:', error);
    loadError.value = 'Failed to load encounter data';
  }
});

function setupSocketListeners() {
  console.log('[Debug] Setting up socket listeners, socket available:', !!socketStore.socket);
  if (!socketStore.socket) return;

  // No need to set up encounter:start listener here as it's handled globally
  console.log('[Debug] Socket listeners set up successfully');
}

async function handleStartEncounter() {
  console.log('[Debug] Start Encounter clicked');

  if (!encounterStore.currentEncounter || !gameSessionStore.currentSession) {
    console.warn('[Debug] Missing required data:', {
      hasEncounter: !!encounterStore.currentEncounter,
      hasSession: !!gameSessionStore.currentSession,
    });
    return;
  }

  const encounterId = route.params.id as string;
  const campaignId = route.params.campaignId as string;

  console.log('[Debug] Preparing to emit socket event:', {
    encounterId,
    campaignId,
    sessionId: gameSessionStore.currentSession.id,
    socketConnected: socketStore.isConnected,
    hasSocket: !!socketStore.socket,
  });

  try {
    // Ensure we're joined to the session
    if (socketStore.socket) {
      // Set up a promise to wait for join confirmation
      const joinPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for session join confirmation'));
        }, 5000);

        socketStore.socket?.once('user-joined', (data: { userId: string; timestamp: Date }) => {
          console.log('[Debug] Join confirmation received:', data);
          clearTimeout(timeout);
          resolve();
        });

        socketStore.socket?.once('error', (error: { message: string }) => {
          console.error('[Debug] Error joining session:', error);
          clearTimeout(timeout);
          reject(new Error(error.message));
        });
      });

      // Attempt to join the session
      console.log('[Debug] Joining session:', gameSessionStore.currentSession.id);
      socketStore.socket.emit('join-session', gameSessionStore.currentSession.id);

      // Wait for join confirmation
      await joinPromise;

      // Now emit the start event
      console.log('[Debug] Emitting encounter:start event');
      socketStore.socket.emit('encounter:start', {
        sessionId: gameSessionStore.currentSession.id,
        encounterId,
        campaignId,
      });
      console.log('[Debug] Event emitted successfully');
    } else {
      console.error('[Debug] Socket not available');
    }

    // Update encounter status to in_progress
    await encounterStore.updateEncounterStatus(encounterId, campaignId, 'in_progress');
  } catch (error) {
    console.error('[Debug] Failed to start encounter:', error);
  }
}

async function handleSetReady() {
  if (!encounterStore.currentEncounter) return;

  const encounterId = route.params.id as string;
  const campaignId = route.params.campaignId as string;

  try {
    await encounterStore.updateEncounterStatus(encounterId, campaignId, 'ready');
  } catch (error) {
    console.error('Failed to set encounter ready:', error);
  }
}

async function handleStopEncounter() {
  console.log('[Debug] Stop Encounter clicked');

  if (!encounterStore.currentEncounter || !gameSessionStore.currentSession) {
    console.warn('[Debug] Missing required data:', {
      hasEncounter: !!encounterStore.currentEncounter,
      hasSession: !!gameSessionStore.currentSession,
    });
    return;
  }

  const encounterId = route.params.id as string;
  const campaignId = route.params.campaignId as string;

  console.log('[Debug] Preparing to emit socket event:', {
    encounterId,
    campaignId,
    sessionId: gameSessionStore.currentSession.id,
    socketConnected: socketStore.isConnected,
    hasSocket: !!socketStore.socket,
  });

  try {
    // Emit socket event to notify all clients
    if (socketStore.socket) {
      console.log('[Debug] Emitting encounter:stop event');
      socketStore.socket.emit('encounter:stop', {
        sessionId: gameSessionStore.currentSession.id,
        encounterId,
        campaignId,
      });
      console.log('[Debug] Event emitted successfully');
    } else {
      console.error('[Debug] Socket not available');
    }

    // Update encounter status back to ready
    await encounterStore.updateEncounterStatus(encounterId, campaignId, 'ready');
  } catch (error) {
    console.error('[Debug] Failed to stop encounter:', error);
  }
}
</script>

<template>
  <div class="p-4">
    <!-- Loading State -->
    <div v-if="encounterStore.loading" class="flex justify-center items-center">
      <div
        class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"
      ></div>
      <span class="ml-2">Loading...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="encounterStore.error || loadError" class="text-red-500 text-center">
      {{ encounterStore.error || loadError }}
    </div>

    <!-- Encounter Details -->
    <div v-else-if="encounterStore.currentEncounter" class="max-w-2xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">{{ encounterStore.currentEncounter.name }}</h1>

        <div class="flex gap-2">
          <!-- Set Ready Button (Game Master Only, Draft Status) -->
          <button
            v-if="canSetReady"
            @click="handleSetReady"
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
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            Set Ready
          </button>

          <!-- Start Encounter Button (Game Master Only, Ready Status) -->
          <button
            v-if="canStartEncounter"
            @click="handleStartEncounter"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg
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
            Start Encounter
          </button>

          <!-- Run Encounter Button (Game Master Only, In Progress Status) -->
          <button
            v-if="canRun"
            @click="
              router.push({
                name: 'encounter-run',
                params: { id: route.params.id, campaignId: route.params.campaignId },
              })
            "
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <svg
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
            Run Encounter
          </button>

          <!-- Stop Encounter Button (Game Master Only, In Progress Status) -->
          <button
            v-if="canStopEncounter"
            @click="handleStopEncounter"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg
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
            Stop Encounter
          </button>
        </div>
      </div>

      <!-- Status Badge -->
      <div class="mb-4">
        <span
          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
          :class="{
            'bg-gray-100 text-gray-800': encounterStore.currentEncounter.status === 'draft',
            'bg-blue-100 text-blue-800': encounterStore.currentEncounter.status === 'ready',
            'bg-green-100 text-green-800': encounterStore.currentEncounter.status === 'in_progress',
            'bg-purple-100 text-purple-800': encounterStore.currentEncounter.status === 'completed',
          }"
        >
          {{ encounterStore.currentEncounter.status.replace('_', ' ') }}
        </span>
      </div>

      <!-- Description if available -->
      <p v-if="encounterStore.currentEncounter.description" class="mt-4 text-gray-600">
        {{ encounterStore.currentEncounter.description }}
      </p>

      <!-- Map info if available -->
      <div v-if="encounterStore.currentEncounter.mapId" class="mt-6 p-4 bg-gray-50 rounded-lg">
        <h2 class="text-lg font-medium">Map</h2>
        <p>
          {{
            typeof encounterStore.currentEncounter.mapId === 'object' &&
            'name' in (encounterStore.currentEncounter.mapId as any)
              ? (encounterStore.currentEncounter.mapId as any).name
              : 'Map loaded'
          }}
        </p>
      </div>

      <!-- Participants section -->
      <div class="mt-6">
        <h2 class="text-lg font-medium mb-2">Participants</h2>
        <div
          v-if="
            !encounterStore.currentEncounter.participants ||
            encounterStore.currentEncounter.participants.length === 0
          "
          class="text-gray-500"
        >
          No participants added yet
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="participant in encounterStore.currentEncounter.participants"
            :key="participant?.id || Math.random()"
            class="p-2 bg-gray-50 rounded flex items-center"
          >
            <span>{{ participant?.name || 'Unknown Actor' }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Not Found State -->
    <div v-else class="text-center text-gray-500">Encounter not found</div>
  </div>
</template>
