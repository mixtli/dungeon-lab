<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useGameSessionStore } from '../../stores/game-session.mjs';
import { useAuthStore } from '../../stores/auth.mjs';
import { formatDate } from '../../utils/date-utils.mjs';
import { CalendarIcon, ClockIcon } from '@heroicons/vue/24/outline';
import { GameSessionStatus } from '@dungeon-lab/shared/src/schemas/game-session.schema.mjs';
import type { z } from 'zod';

type SessionStatus = z.infer<typeof GameSessionStatus>;

const props = defineProps<{
  campaignId: string;
}>();

const router = useRouter();
const gameSessionStore = useGameSessionStore();
const authStore = useAuthStore();

const loading = ref(false);
const error = ref<string | null>(null);

// Fetch sessions on mount
onMounted(async () => {
  loading.value = true;
  try {
    console.log('Fetching sessions for campaign:', props.campaignId);
    await gameSessionStore.fetchCampaignSessions(props.campaignId);
    console.log('Fetched sessions:', gameSessionStore.campaignSessions);
    console.log('Active sessions:', activeSessions.value);
    console.log('Scheduled sessions:', scheduledSessions.value);
    console.log('Paused sessions:', pausedSessions.value);
  } catch (err) {
    if (err instanceof Error) {
      console.error('Error loading sessions:', err);
      error.value = 'Failed to load sessions';
    }
  } finally {
    loading.value = false;
  }
});

// Computed properties for sessions by status
const activeSessions = computed(
  () =>
    gameSessionStore.campaignSessions?.filter(
      session => session.status === ('active' as SessionStatus)
    ) || []
);

const scheduledSessions = computed(() =>
  (gameSessionStore.campaignSessions || [])
    .filter(session => session.status === ('scheduled' as SessionStatus))
    .sort((a, b) => {
      const dateA = new Date(a.settings?.scheduledStart as string);
      const dateB = new Date(b.settings?.scheduledStart as string);
      return dateA.getTime() - dateB.getTime();
    })
);

const pausedSessions = computed(
  () =>
    gameSessionStore.campaignSessions?.filter(
      session => session.status === ('paused' as SessionStatus)
    ) || []
);

function joinSession(sessionId: string) {
  router.push({
    name: 'game-session',
    params: {
      campaignId: props.campaignId,
      id: sessionId,
    },
  });
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Check if user is game master
function isGameMaster(session: any) {
  return session.gameMasterId === authStore.user?.id;
}

// Delete session
async function deleteSession(sessionId: string, sessionName: string) {
  if (!confirm(`Are you sure you want to delete the game session "${sessionName}"?`)) {
    return;
  }

  try {
    await gameSessionStore.deleteGameSession(sessionId);
    // The store will automatically update the lists
  } catch (err) {
    error.value = 'Failed to delete game session';
  }
}

// Update session status
async function updateSessionStatus(sessionId: string, status: SessionStatus) {
  try {
    await gameSessionStore.updateSessionStatus(sessionId, status);
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to update session status';
  }
}
</script>

<template>
  <div class="campaign-session-list">
    <div class="border-b border-gray-200 pb-5 mb-5">
      <h3 class="text-lg font-medium leading-6 text-gray-900">Game Sessions</h3>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-4">
      <div
        class="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"
      ></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-4">
      <p class="text-red-600">{{ error }}</p>
    </div>

    <div v-else>
      <!-- Active Sessions -->
      <div v-if="activeSessions.length > 0" class="mb-8">
        <h4 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          Active Sessions
        </h4>
        <div class="space-y-3">
          <div
            v-for="session in activeSessions"
            :key="session.id"
            class="bg-white shadow-sm rounded-lg border border-green-200 p-4"
          >
            <div class="flex justify-between items-start">
              <div>
                <h5 class="text-lg font-medium text-gray-900">{{ session.name }}</h5>
                <p v-if="session.description" class="text-sm text-gray-500 mt-1">
                  {{ session.description }}
                </p>
              </div>
              <div class="flex space-x-2">
                <button
                  @click="joinSession(session.id)"
                  class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Join Session
                </button>
                <button
                  v-if="isGameMaster(session)"
                  @click="updateSessionStatus(session.id, 'paused')"
                  class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Pause
                </button>
                <button
                  v-if="isGameMaster(session)"
                  @click="updateSessionStatus(session.id, 'ended')"
                  class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  End
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Scheduled Sessions -->
      <div v-if="scheduledSessions.length > 0" class="mb-8">
        <h4 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          Scheduled Sessions
        </h4>
        <div class="space-y-3">
          <div
            v-for="session in scheduledSessions"
            :key="session.id"
            class="bg-white shadow-sm rounded-lg border border-gray-200 p-4"
          >
            <div class="flex justify-between items-start">
              <div>
                <h5 class="text-lg font-medium text-gray-900">{{ session.name }}</h5>
                <p v-if="session.description" class="text-sm text-gray-500 mt-1">
                  {{ session.description }}
                </p>
                <div class="flex items-center space-x-4 mt-2">
                  <div class="flex items-center text-sm text-gray-500">
                    <CalendarIcon class="h-4 w-4 mr-1" />
                    {{ formatDate(session.settings?.scheduledStart as string) }}
                  </div>
                  <div class="flex items-center text-sm text-gray-500">
                    <ClockIcon class="h-4 w-4 mr-1" />
                    {{ formatTime(session.settings?.scheduledStart as string) }}
                  </div>
                </div>
              </div>
              <div class="flex space-x-2">
                <button
                  v-if="isGameMaster(session) && !activeSessions.length"
                  @click="updateSessionStatus(session.id, 'active')"
                  class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Start Session
                </button>
                <button
                  v-if="isGameMaster(session)"
                  @click="deleteSession(session.id, session.name)"
                  class="inline-flex items-center px-2 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  title="Delete session"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Paused Sessions -->
      <div v-if="pausedSessions.length > 0" class="mb-8">
        <h4 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          Paused Sessions
        </h4>
        <div class="space-y-3">
          <div
            v-for="session in pausedSessions"
            :key="session.id"
            class="bg-white shadow-sm rounded-lg border border-yellow-200 p-4"
          >
            <div class="flex justify-between items-start">
              <div>
                <h5 class="text-lg font-medium text-gray-900">{{ session.name }}</h5>
                <p v-if="session.description" class="text-sm text-gray-500 mt-1">
                  {{ session.description }}
                </p>
              </div>
              <div class="flex space-x-2">
                <button
                  v-if="isGameMaster(session) && !activeSessions.length"
                  @click="updateSessionStatus(session.id, 'active')"
                  class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Resume Session
                </button>
                <button
                  v-if="isGameMaster(session)"
                  @click="updateSessionStatus(session.id, 'ended')"
                  class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  End
                </button>
                <button
                  v-if="isGameMaster(session)"
                  @click="deleteSession(session.id, session.name)"
                  class="inline-flex items-center px-2 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  title="Delete session"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Sessions State -->
      <div
        v-if="
          activeSessions.length === 0 &&
          scheduledSessions.length === 0 &&
          pausedSessions.length === 0
        "
        class="text-center py-8 bg-gray-50 rounded-lg"
      >
        <p class="text-gray-500">No active or scheduled sessions</p>
      </div>
    </div>
  </div>
</template>
