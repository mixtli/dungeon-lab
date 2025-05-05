<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useActorStore } from '../../stores/actor.store.mjs';
import { ActorsClient } from '@dungeon-lab/client/index.mjs';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';
import { useGameSessionStore } from '../../stores/game-session.store.mjs';

const actorStore = useActorStore();
const gameSessionStore = useGameSessionStore();
const actorClient = new ActorsClient();

const characters = ref<IActor[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const selectedCharacterId = computed({
  get: () => actorStore.currentActor?.id || '',
  set: async (value: string) => {
    if (value) {
      await actorStore.setCurrentActor(value);
    }
  }
});

// Get the current campaign ID from the game session store
const campaignId = computed(() => gameSessionStore.currentSession?.campaignId || '');

async function loadCharacters() {
  if (!campaignId.value) return;
  
  loading.value = true;
  error.value = null;
  
  try {
    characters.value = await actorClient.getUserCharacters(campaignId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load characters';
    console.error('Error loading characters:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadCharacters();
});

// Watch for campaign changes and reload characters if needed
watch(campaignId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    await loadCharacters();
  }
}, { immediate: true });
</script>

<template>
  <div class="character-selector relative">
    <label for="character-select" class="sr-only">Select Character</label>
    
    <div v-if="loading" class="flex items-center space-x-2 text-sm text-gray-500">
      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Loading characters...</span>
    </div>
    
    <select
      v-else
      id="character-select"
      v-model="selectedCharacterId"
      class="block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm bg-white dark:bg-gray-700 dark:text-white"
      :disabled="characters.length === 0"
    >
      <option value="" disabled>{{ characters.length ? 'Select Character' : 'No Characters' }}</option>
      <option 
        v-for="character in characters" 
        :key="character.id" 
        :value="character.id"
      >
        {{ character.name }}
      </option>
    </select>
    
    <div v-if="error" class="mt-1 text-xs text-red-500">
      {{ error }}
    </div>
  </div>
</template> 