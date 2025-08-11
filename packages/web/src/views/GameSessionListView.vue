<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { formatDate } from '../utils/date-utils.mjs';
import { CalendarIcon, ClockIcon } from '@heroicons/vue/24/outline';
import { useGameSessionStore } from '../stores/game-session.store.mjs';
import router from '@/router/index.mjs';
import { GameSessionsClient } from '@dungeon-lab/client/index.mjs';
import type { IGameSession } from '@dungeon-lab/shared/types/index.mjs';

const gameSessionClient = new GameSessionsClient();

const loading = ref(false);
const error = ref<string | null>(null);
const allSessions = ref<IGameSession[]>([]);
const gameSessionStore = useGameSessionStore();

// Add state for character selector
const showCharacterSelector = ref(false);
const selectedSessionId = ref('');
const selectedCampaignId = ref('');

// Fetch sessions on mount
onMounted(async () => {
  loading.value = true;
  try {
    allSessions.value = await gameSessionClient.getGameSessions();
  } catch (err) {
    if (err instanceof Error) {
      console.error('Error loading sessions:', err);
      error.value = 'Failed to load sessions';
    }
  } finally {
    loading.value = false;
  }
});

// Computed properties for active and future sessions
const activeSessions = computed(
  () => allSessions.value.filter(session => session.status === 'active') || []
);

const futureSessions = computed(() =>
  (allSessions.value || [])
    .filter(
      session =>
        session.status === 'paused' &&
        session.settings?.scheduledStart &&
        new Date(session.settings.scheduledStart as string) > new Date()
    )
    .sort((a, b) => {
      const dateA = new Date(a.settings?.scheduledStart as string);
      const dateB = new Date(b.settings?.scheduledStart as string);
      return dateA.getTime() - dateB.getTime();
    })
);

function joinSession(sessionId: string, campaignId: string) {
  // Store session and campaign ID
  selectedSessionId.value = sessionId;
  selectedCampaignId.value = campaignId;
  // Show character selector
  showCharacterSelector.value = true;
}

function onCharacterSelected() {
  showCharacterSelector.value = false;
  router.push({ name: 'chat' });
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div class="game-session-list max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="sm:flex sm:items-center">
      <div class="sm:flex-auto">
        <h1 class="text-2xl font-semibold text-gray-900">Game Sessions</h1>
        <p class="mt-2 text-sm text-gray-700">View and join your active game sessions.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-[400px]">
      <div
        class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"
      ></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-10">
      <p class="text-red-600 mb-4">{{ error }}</p>
    </div>

    <div v-else class="mt-8 space-y-8">
      <!-- Active Sessions -->
      <div v-if="activeSessions.length > 0">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Active Sessions</h2>
        <div class="space-y-3">
          <div
            v-for="session in activeSessions"
            :key="session.id"
            class="bg-white shadow-sm rounded-lg border border-green-200 p-4"
          >
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-lg font-medium text-gray-900">{{ session.name }}</h3>
                <p v-if="session.description" class="text-sm text-gray-500 mt-1">
                  {{ session.description }}
                </p>
              </div>
              <!-- Conditional Join/Leave Button -->
              <button
                v-if="session.id !== gameSessionStore.currentSession?.id"
                @click="joinSession(session.id, session.campaignId)"
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Join Session
              </button>
              <button
                v-else
                @click="gameSessionStore.leaveSession()"
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Leave Session
              </button>
              <!-- End Conditional Button -->
            </div>
          </div>
        </div>
      </div>

      <!-- Future Sessions -->
      <div v-if="futureSessions.length > 0">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Scheduled Sessions</h2>
        <div class="space-y-3">
          <div
            v-for="session in futureSessions"
            :key="session.id"
            class="bg-white shadow-sm rounded-lg border border-gray-200 p-4"
          >
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-lg font-medium text-gray-900">{{ session.name }}</h3>
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
            </div>
          </div>
        </div>
      </div>

      <!-- No Sessions State -->
      <div
        v-if="activeSessions.length === 0 && futureSessions.length === 0"
        class="text-center py-10"
      >
        <p class="text-gray-500 mb-4">You don't have any active game sessions.</p>
        <p class="text-gray-500">Go to a campaign page to schedule or start a new session.</p>
      </div>
    </div>

    <!-- Character Selector Modal -->
    <CharacterSelector
      v-if="showCharacterSelector"
      :show="showCharacterSelector"
      :campaign-id="selectedCampaignId"
      :session-id="selectedSessionId"
      @close="showCharacterSelector = false"
      @character-selected="onCharacterSelected"
    />
  </div>
</template>
