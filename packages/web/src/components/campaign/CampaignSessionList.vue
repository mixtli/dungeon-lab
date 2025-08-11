<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../../stores/auth.store.mjs';
import { useGameSessionStore } from '../../stores/game-session.store.mjs';
import { formatDate } from '../../utils/date-utils.mjs';
import { CalendarIcon, ClockIcon } from '@heroicons/vue/24/outline';
import { GameSessionStatus } from '@dungeon-lab/shared/schemas/index.mjs';
import type { z } from 'zod';
import type { IGameSession } from '@dungeon-lab/shared/types/index.mjs';
import { GameSessionsClient } from '@dungeon-lab/client/index.mjs';

type SessionStatus = z.infer<typeof GameSessionStatus>;

const props = defineProps<{
  campaignId: string;
}>();

const authStore = useAuthStore();
const gameSessionStore = useGameSessionStore();

const loading = ref(false);
const error = ref<string | null>(null);
const sessions = ref<IGameSession[]>([]);

const gameSessionClient = new GameSessionsClient();

// Add new refs
const showCharacterSelector = ref(false);
const selectedSessionId = ref('');

// Fetch sessions on mount
onMounted(async () => {
  loading.value = true;
  try {
    console.log('Fetching sessions for campaign:', props.campaignId);
    sessions.value = await gameSessionClient.getGameSessions(props.campaignId);
    console.log('Fetched sessions:', sessions.value);
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
  () => sessions.value.filter(session => session.status === ('active' as SessionStatus)) || []
);

const scheduledSessions = computed(() =>
  (sessions.value || [])
    .filter(session => session.status === ('scheduled' as SessionStatus))
    .sort((a, b) => {
      const dateA = new Date(a.settings?.scheduledStart as string);
      const dateB = new Date(b.settings?.scheduledStart as string);
      return dateA.getTime() - dateB.getTime();
    })
);

const pausedSessions = computed(
  () => sessions.value.filter(session => session.status === ('paused' as SessionStatus)) || []
);

function joinSession(sessionId: string) {
  // Show character selector modal instead of joining immediately
  selectedSessionId.value = sessionId;
  showCharacterSelector.value = true;
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Check if user is game master
function isGameMaster(session: IGameSession) {
  return session.gameMasterId === authStore.user?.id;
}

// Delete session
async function handleDeleteSession(sessionId: string, sessionName: string) {
  if (!confirm(`Are you sure you want to delete the game session "${sessionName}"?`)) {
    return;
  }

  try {
    loading.value = true;
    await gameSessionClient.deleteGameSession(sessionId);
    // Update the sessions list after deletion
    sessions.value = sessions.value.filter(session => session.id !== sessionId);
  } catch {
    error.value = 'Failed to delete game session';
  } finally {
    loading.value = false;
  }
}

// Start session
async function handleStartSession(sessionId: string) {
  try {
    loading.value = true;
    const updatedSession = await gameSessionClient.startGameSession(sessionId);
    
    // Update the session in the array
    const index = sessions.value.findIndex(s => s.id === sessionId);
    if (index !== -1 && updatedSession) {
      sessions.value[index] = updatedSession;
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to start session';
  } finally {
    loading.value = false;
  }
}

// Pause session
async function handlePauseSession(sessionId: string) {
  try {
    loading.value = true;
    const updatedSession = await gameSessionClient.pauseGameSession(sessionId);
    
    // Update the session in the array
    const index = sessions.value.findIndex(s => s.id === sessionId);
    if (index !== -1 && updatedSession) {
      sessions.value[index] = updatedSession;
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to pause session';
  } finally {
    loading.value = false;
  }
}

// Resume session
async function handleResumeSession(sessionId: string) {
  try {
    loading.value = true;
    const updatedSession = await gameSessionClient.resumeGameSession(sessionId);
    
    // Update the session in the array
    const index = sessions.value.findIndex(s => s.id === sessionId);
    if (index !== -1 && updatedSession) {
      sessions.value[index] = updatedSession;
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to resume session';
  } finally {
    loading.value = false;
  }
}

// End session
async function handleEndSession(sessionId: string) {
  try {
    loading.value = true;
    const updatedSession = await gameSessionClient.endGameSession(sessionId);
    
    // Update the session in the array
    const index = sessions.value.findIndex(s => s.id === sessionId);
    if (index !== -1 && updatedSession) {
      sessions.value[index] = updatedSession;
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to end session';
  } finally {
    loading.value = false;
  }
}

// Refresh sessions list
async function refreshSessions() {
  loading.value = true;
  error.value = null;
  
  try {
    console.log('Refreshing sessions for campaign:', props.campaignId);
    sessions.value = await gameSessionClient.getGameSessions(props.campaignId);
    console.log('Refreshed sessions:', sessions.value);
  } catch (err) {
    if (err instanceof Error) {
      console.error('Error refreshing sessions:', err);
      error.value = 'Failed to refresh sessions';
    }
  } finally {
    loading.value = false;
  }
}

// Expose methods to parent component
defineExpose({
  refreshSessions
});
</script>

<template>
  <div class="campaign-session-list bg-stone dark:bg-stone-700 p-6">
    <div class="border-b border-stone-300 dark:border-stone-600 pb-5 mb-6 flex justify-between items-center">
      <h3 class="text-xl font-bold text-gold">🎲 Game Sessions</h3>
      <button
        @click="$emit('schedule-session')"
        class="btn btn-success shadow-lg"
      >
        🎯 Schedule Session
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <div
        class="animate-spin rounded-full h-12 w-12 border-4 border-dragon border-t-transparent shadow-lg"
      ></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <p class="text-error-700 font-medium">{{ error }}</p>
    </div>

    <div v-else>
      <!-- Active Sessions -->
      <div v-if="activeSessions.length > 0" class="mb-8">
        <h4 class="text-sm font-bold text-gold uppercase tracking-wider mb-4">
          🟢 Active Sessions
        </h4>
        <div class="space-y-3">
          <div
            v-for="session in activeSessions"
            :key="session.id"
            class="bg-parchment dark:bg-obsidian shadow-xl rounded-lg border border-success-300 p-6 transition-all duration-200 hover:shadow-2xl"
          >
            <div class="flex justify-between items-start">
              <div>
                <h5 class="text-lg font-bold text-onyx dark:text-parchment">{{ session.name }}</h5>
              </div>
              <div class="flex space-x-2">
                <button
                  v-if="session.id !== gameSessionStore.currentSession?.id"
                  @click="joinSession(session.id!)"
                  class="btn btn-success text-sm shadow-lg"
                >
                  🎮 Join Session
                </button>
                <button
                  v-else
                  @click="gameSessionStore.leaveSession()"
                  class="btn btn-error text-sm shadow-lg"
                >
                  🚪 Leave Session
                </button>
                <button
                  v-if="isGameMaster(session)"
                  @click="handlePauseSession(session.id!)"
                  class="inline-flex items-center p-2 rounded-md shadow-sm text-accent-700 hover:bg-accent-100 focus:outline-none transition-all duration-200"
                  title="Pause Session"
                >
                  ⏸️
                </button>
                <button
                  v-if="isGameMaster(session)"
                  @click="handleEndSession(session.id!)"
                  class="inline-flex items-center p-2 rounded-md shadow-sm text-error-700 hover:bg-error-100 focus:outline-none transition-all duration-200"
                  title="End Session"
                >
                  🛑
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Scheduled Sessions -->
      <div v-if="scheduledSessions.length > 0" class="mb-8">
        <h4 class="text-sm font-bold text-gold uppercase tracking-wider mb-4">
          📅 Scheduled Sessions
        </h4>
        <div class="space-y-3">
          <div
            v-for="session in scheduledSessions"
            :key="session.id"
            class="bg-parchment dark:bg-obsidian shadow-xl rounded-lg border border-stone-300 dark:border-stone-600 p-6 transition-all duration-200 hover:shadow-2xl"
          >
            <div class="flex justify-between items-start">
              <div>
                <h5 class="text-lg font-bold text-onyx dark:text-parchment">{{ session.name }}</h5>
                <p v-if="session.description" class="text-sm text-ash dark:text-stone-300 mt-1">
                  {{ session.description }}
                </p>
                <div class="flex items-center space-x-4 mt-2">
                  <div class="flex items-center text-sm text-ash dark:text-stone-300">
                    <CalendarIcon class="h-4 w-4 mr-1 text-gold" />
                    {{ formatDate(session.settings?.scheduledStart as string) }}
                  </div>
                  <div class="flex items-center text-sm text-ash dark:text-stone-300">
                    <ClockIcon class="h-4 w-4 mr-1 text-gold" />
                    {{ formatTime(session.settings?.scheduledStart as string) }}
                  </div>
                </div>
              </div>
              <div class="flex space-x-2">
                <button
                  v-if="isGameMaster(session) && !activeSessions.length"
                  @click="handleStartSession(session.id!)"
                  class="btn btn-success text-sm shadow-lg"
                >
                  🚀 Start Session
                </button>
                <button
                  v-if="isGameMaster(session)"
                  @click="handleDeleteSession(session.id!, session.name)"
                  class="inline-flex items-center p-2 rounded-md text-dragon hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900 focus:outline-none transition-all duration-200 shadow-sm"
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
        <h4 class="text-sm font-bold text-gold uppercase tracking-wider mb-4">
          ⏸️ Paused Sessions
        </h4>
        <div class="space-y-3">
          <div
            v-for="session in pausedSessions"
            :key="session.id"
            class="bg-parchment dark:bg-obsidian shadow-xl rounded-lg border border-accent-300 p-6 transition-all duration-200 hover:shadow-2xl"
          >
            <div class="flex justify-between items-start">
              <div>
                <h5 class="text-lg font-bold text-onyx dark:text-parchment">{{ session.name }}</h5>
                <p v-if="session.description" class="text-sm text-ash dark:text-stone-300 mt-1">
                  {{ session.description }}
                </p>
              </div>
              <div class="flex space-x-2">
                <button
                  v-if="isGameMaster(session) && !activeSessions.length"
                  @click="handleResumeSession(session.id!)"
                  class="btn btn-success text-sm shadow-lg"
                >
                  ▶️ Resume Session
                </button>
                <button
                  v-if="isGameMaster(session)"
                  @click="handleEndSession(session.id!)"
                  class="inline-flex items-center p-2 rounded-md shadow-sm text-error-700 hover:bg-error-100 focus:outline-none transition-all duration-200"
                  title="End Session"
                >
                  🛑
                </button>
                <button
                  v-if="isGameMaster(session)"
                  @click="handleDeleteSession(session.id!, session.name)"
                  class="inline-flex items-center p-2 rounded-md text-dragon hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900 focus:outline-none transition-all duration-200 shadow-sm"
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
        class="text-center py-12 bg-parchment dark:bg-obsidian rounded-lg border border-stone-300 dark:border-stone-600"
      >
        <p class="text-ash dark:text-stone-300 text-lg">🎲 No active or scheduled sessions</p>
        <p class="text-ash dark:text-stone-300 text-sm mt-2">Create a session to begin your adventure!</p>
      </div>
    </div>

    <!-- Character Selector Modal -->
    <CharacterSelector
      v-if="showCharacterSelector"
      :show="showCharacterSelector"
      :campaign-id="props.campaignId"
      :session-id="selectedSessionId"
      @close="showCharacterSelector = false"
      @character-selected="showCharacterSelector = false"
    />
  </div>
</template>
