<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';
import { ActorsClient } from '@dungeon-lab/client/index.mjs';
import { useGameSessionStore } from '../../stores/game-session.store.mts';
import { useAuthStore } from '../../stores/auth.store.mts';
import { GameSessionsClient } from '@dungeon-lab/client/game-sessions.client.mts';
import { useAssetUrl } from '../../composables/useAssetUrl.mts';

const props = defineProps<{
  campaignId: string;
  sessionId: string;
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'characterSelected', actor: IActor): void;
}>();

const actorsClient = new ActorsClient();
const gameSessionStore = useGameSessionStore();
const authStore = useAuthStore();
const gameSessionsClient = new GameSessionsClient();
const { transformAssetUrl } = useAssetUrl();

const loading = ref(false);
const error = ref<string | null>(null);
const characters = ref<IActor[]>([]);
const sessionGameMasterId = ref<string | null>(null);

// Fetch characters for this campaign
onMounted(async () => {
  if (props.show && props.campaignId) {
    await fetchCharacters();
  }
  if (props.sessionId) {
    await fetchSessionGameMaster();
  }
});

watch(() => props.sessionId, async (newSessionId) => {
  if (newSessionId) {
    await fetchSessionGameMaster();
  }
});

async function fetchSessionGameMaster() {
  try {
    const session = await gameSessionsClient.getGameSession(props.sessionId);
    sessionGameMasterId.value = session.gameMasterId;
  } catch {
    sessionGameMasterId.value = null;
    // Optionally log error
  }
}

async function fetchCharacters() {
  loading.value = true;
  error.value = null;

  try {
    characters.value = await actorsClient.getUserCharacters(props.campaignId);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load characters';
    console.error('Error fetching characters:', err);
  } finally {
    loading.value = false;
  }
}

function selectCharacter(actor: IActor) {
  gameSessionStore.joinSession(props.sessionId, actor.id);
  emit('characterSelected', actor);
  emit('close');
}

function close() {
  emit('close');
}

function joinWithoutCharacter() {
  gameSessionStore.joinSession(props.sessionId);
  emit('close');
}

const isGameMasterForSession = computed(() => {
  return sessionGameMasterId.value && authStore.user?.id && sessionGameMasterId.value === authStore.user.id;
});
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-parchment dark:bg-obsidian rounded-lg shadow-xl p-6 w-full max-w-md border border-stone-300 dark:border-stone-600">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-onyx dark:text-parchment">🎭 Select Your Character</h2>
        <button @click="close" class="text-ash dark:text-stone-300 hover:text-onyx dark:hover:text-parchment transition-colors">
          <span class="sr-only">Close</span>
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div v-if="loading" class="py-4 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-4 border-dragon border-t-transparent mx-auto"></div>
        <p class="mt-2 text-ash dark:text-stone-300">Loading characters...</p>
      </div>

      <div v-else-if="error" class="py-4 text-center text-error-700 dark:text-error-400">
        <p>{{ error }}</p>
        <button @click="fetchCharacters" class="mt-2 btn btn-primary">
          Retry
        </button>
      </div>

      <div v-else-if="characters.length === 0" class="py-4 text-center">
        <p class="mb-2 text-onyx dark:text-parchment">You don't have any characters in this campaign.</p>
        <p class="text-sm text-ash dark:text-stone-300">Please create a character before joining the session.</p>
        <button @click="close" class="mt-4 btn btn-primary">
          Close
        </button>
      </div>

      <div v-else class="space-y-2 max-h-60 overflow-y-auto">
        <div
          v-for="actor in characters"
          :key="actor.id"
          @click="selectCharacter(actor)"
          class="p-3 border border-stone-300 dark:border-stone-600 rounded-lg flex items-center hover:bg-stone-100 dark:hover:bg-stone-700 cursor-pointer transition-colors bg-stone-50 dark:bg-stone-800"
        >
          <img
            v-if="actor.avatar"
            :src="transformAssetUrl(actor.avatar.url)"
            :alt="actor.name"
            class="w-12 h-12 rounded-full object-cover mr-3"
          />
          <div v-else class="w-12 h-12 rounded-full bg-stone-300 dark:bg-stone-600 mr-3 flex items-center justify-center">
            <span class="text-lg font-bold text-stone-600 dark:text-stone-300">{{ actor.name.charAt(0) }}</span>
          </div>
          <div>
            <h3 class="font-medium text-onyx dark:text-parchment">{{ actor.name }}</h3>
            <p class="text-sm text-ash dark:text-stone-300">{{ actor.type }}</p>
          </div>
        </div>
      </div>

      <div class="mt-4 flex justify-end space-x-2">
        <button
          @click="close"
          class="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          v-if="isGameMasterForSession"
          @click="joinWithoutCharacter"
          class="btn btn-primary"
        >
          🎲 Join as Game Master
        </button>
      </div>
    </div>
  </div>
</template> 