<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGameSessionStore } from '../stores/game-session.mjs';
import { useSocketStore } from '../stores/socket.mjs';
import { useAuthStore } from '../stores/auth.mjs';
import EncounterSelectModal from '../components/encounter/EncounterSelectModal.vue';

const route = useRoute();
const router = useRouter();
const gameSessionStore = useGameSessionStore();
const socketStore = useSocketStore();
const authStore = useAuthStore();
const loading = ref(false);
const error = ref<string | null>(null);
const showEncounterModal = ref(false);

const sessionId = route.params.id as string;
const isGameMaster = computed(() => {
  return gameSessionStore.currentSession?.gameMasterId === authStore.user?.id;
});

// Fetch session data
onMounted(async () => {
  loading.value = true;
  error.value = null;

  try {
    await gameSessionStore.getGameSession(sessionId);
    setupSocketListeners();
  } catch (err) {
    console.error('Error fetching game session:', err);
    error.value = 'Failed to load game session';
  } finally {
    loading.value = false;
  }
});

function setupSocketListeners() {
  if (!socketStore.socket) return;

  // Listen for encounter start events
  socketStore.socket.on('encounter:start', (data: { encounterId: string }) => {
    router.push(`/encounter/${data.encounterId}`);
  });
}

function goToChat() {
  router.push({ name: 'game-session-chat', params: { id: sessionId } });
}

function handleStartEncounter() {
  showEncounterModal.value = true;
}

function handleEncounterSelect(encounterId: string) {
  showEncounterModal.value = false;

  // Emit socket event to start encounter
  if (socketStore.socket) {
    socketStore.socket.emit('encounter:start', {
      sessionId,
      encounterId,
    });
  }

  // Navigate to encounter page
  router.push(`/encounter/${encounterId}`);
}
</script>

<template>
  <div class="game-session-view max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Loading Spinner -->
    <div v-if="loading" class="flex justify-center items-center min-h-[400px]">
      <div
        class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"
      ></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-10">
      <p class="text-red-600 mb-4">{{ error }}</p>
    </div>

    <template v-else-if="gameSessionStore.currentSession">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-3xl font-semibold text-gray-900">
              {{ gameSessionStore.currentSession.name }}
            </h1>
            <p v-if="gameSessionStore.currentSession.description" class="mt-2 text-gray-500">
              {{ gameSessionStore.currentSession.description }}
            </p>
          </div>
          <div class="flex gap-4">
            <button
              v-if="isGameMaster"
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
            <button
              @click="goToChat"
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
                  d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                  clip-rule="evenodd"
                />
              </svg>
              Open Chat
            </button>
          </div>
        </div>
      </div>

      <!-- Game Session Content -->
      <div class="space-y-8">
        <!-- TODO: Add game session components (dice roller, map, etc.) -->
        <p class="text-gray-600">Game session interface coming soon...</p>
      </div>
    </template>

    <!-- Encounter Selection Modal -->
    <EncounterSelectModal
      v-if="gameSessionStore.currentSession"
      :show="showEncounterModal"
      :campaign-id="gameSessionStore.currentSession.campaignId.toString()"
      @close="showEncounterModal = false"
      @select="handleEncounterSelect"
    />
  </div>
</template>

<style scoped>
.game-session-view {
  min-height: calc(100vh - 64px);
}
</style>
