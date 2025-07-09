<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';
import { ActorsClient } from '@dungeon-lab/client/index.mjs';
import { useGameSessionStore } from '../../stores/game-session.store.mjs';

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

const loading = ref(false);
const error = ref<string | null>(null);
const characters = ref<IActor[]>([]);

// Fetch characters for this campaign
onMounted(async () => {
  if (props.show && props.campaignId) {
    await fetchCharacters();
  }
});

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
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Select Your Character</h2>
        <button @click="close" class="text-gray-500 hover:text-gray-700">
          <span class="sr-only">Close</span>
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div v-if="loading" class="py-4 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mx-auto"></div>
        <p class="mt-2">Loading characters...</p>
      </div>

      <div v-else-if="error" class="py-4 text-center text-red-600">
        <p>{{ error }}</p>
        <button @click="fetchCharacters" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Retry
        </button>
      </div>

      <div v-else-if="characters.length === 0" class="py-4 text-center">
        <p class="mb-2">You don't have any characters in this campaign.</p>
        <p class="text-sm text-gray-500">Please create a character before joining the session.</p>
        <button @click="close" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Close
        </button>
      </div>

      <div v-else class="space-y-2 max-h-60 overflow-y-auto">
        <div
          v-for="actor in characters"
          :key="actor.id"
          @click="selectCharacter(actor)"
          class="p-3 border rounded-lg flex items-center hover:bg-gray-100 cursor-pointer"
        >
          <img
            v-if="actor.avatar"
            :src="actor.avatar.url"
            :alt="actor.name"
            class="w-12 h-12 rounded-full object-cover mr-3"
          />
          <div v-else class="w-12 h-12 rounded-full bg-gray-300 mr-3 flex items-center justify-center">
            <span class="text-lg font-bold text-gray-600">{{ actor.name.charAt(0) }}</span>
          </div>
          <div>
            <h3 class="font-medium">{{ actor.name }}</h3>
            <p class="text-sm text-gray-600">{{ actor.type }}</p>
          </div>
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        <button
          @click="close"
          class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 mr-2"
        >
          Cancel
        </button>
        <button
          @click="joinWithoutCharacter"
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Join Without Character
        </button>
      </div>
    </div>
  </div>
</template> 