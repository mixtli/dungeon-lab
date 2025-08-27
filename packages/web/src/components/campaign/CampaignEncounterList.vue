<!-- CampaignEncounterList.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { IEncounter } from '@dungeon-lab/shared/types/index.mjs';
import { EncountersClient } from '@dungeon-lab/client/index.mjs';
import { useGameStateStore } from '../../stores/game-state.store.mjs';
import { GameActionClientService } from '../../services/game-action-client.service.mjs';
import { useGameSessionStore } from '../../stores/game-session.store.mjs';

const props = defineProps<{
  campaignId: string;
}>();

const router = useRouter();
const encounters = ref<IEncounter[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const encounterClient = new EncountersClient();
const gameStateStore = useGameStateStore();
const gameActionClient = new GameActionClientService();
const gameSessionStore = useGameSessionStore();

// Computed properties for encounter organization
const currentEncounter = computed(() => gameStateStore.currentEncounter);
const hasGameSession = computed(() => !!gameSessionStore.currentSession);

// Sort encounters: active encounter first, then alphabetically by name
const sortedEncounters = computed(() => {
  if (!currentEncounter.value) {
    // No active encounter - show all sorted alphabetically
    return [...encounters.value].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Active encounter exists - show active first, then others alphabetically
  const active = encounters.value.find(enc => enc.id === currentEncounter.value!.id);
  const others = encounters.value.filter(enc => enc.id !== currentEncounter.value!.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  return active ? [active, ...others] : others;
});

const canStartEncounters = computed(() => !currentEncounter.value && hasGameSession.value);
// Fetch encounters for the campaign
async function fetchEncounters() {
  loading.value = true;
  error.value = null;

  try {
    encounters.value = await encounterClient.getEncountersByCampaign(props.campaignId);
  } catch (err) {
    console.error('Error fetching encounters:', err);
    error.value = 'Failed to load encounters';
  } finally {
    loading.value = false;
  }
}

// Create new encounter
function createEncounter() {
  router.push({
    name: 'encounter-create',
    params: { campaignId: props.campaignId },
  });
}

// Delete encounter
async function deleteEncounter(encounterId: string, encounterName: string) {
  // Prevent deletion of active encounters
  if (currentEncounter.value?.id === encounterId) {
    error.value = 'Cannot delete the currently active encounter. Stop the encounter first.';
    return;
  }

  if (!confirm(`Are you sure you want to delete the encounter "${encounterName}"?`)) {
    return;
  }

  try {
    loading.value = true;
    error.value = null;
    
    await encounterClient.deleteEncounter(encounterId);
    console.log('Encounter deleted successfully:', encounterId);
    
    // Refresh the encounters list
    await fetchEncounters();
  } catch (err) {
    console.error('Error deleting encounter:', err);
    error.value = err instanceof Error ? err.message : 'Failed to delete encounter';
  } finally {
    loading.value = false;
  }
}

// Handle starting an encounter
async function startEncounter(encounter: IEncounter) {
  if (!hasGameSession.value) {
    error.value = 'You must be in a game session to start an encounter';
    return;
  }
  
  if (currentEncounter.value) {
    error.value = 'You must stop the active encounter before starting a new one';
    return;
  }

  try {
    const response = await gameActionClient.requestStartEncounter(encounter.id);
    if (!response.success) {
      error.value = response.error?.message || 'Failed to start encounter';
    }
  } catch (err) {
    console.error('Error starting encounter:', err);
    error.value = 'Failed to start encounter';
  }
}

// Handle stopping the active encounter
async function stopEncounter() {
  if (!currentEncounter.value) {
    error.value = 'No active encounter to stop';
    return;
  }

  try {
    const response = await gameActionClient.requestStopEncounter(currentEncounter.value.id);
    if (!response.success) {
      error.value = response.error?.message || 'Failed to stop encounter';
    }
  } catch (err) {
    console.error('Error stopping encounter:', err);
    error.value = 'Failed to stop encounter';
  }
}

// Check if an encounter is the currently active one
function isActiveEncounter(encounter: IEncounter): boolean {
  return currentEncounter.value?.id === encounter.id;
}

onMounted(() => {
  fetchEncounters();
});
</script>

<template>
  <div class="encounters-section bg-stone dark:bg-stone-700">
    <div class="px-6 py-5 flex justify-between items-center border-b border-stone-300 dark:border-stone-600">
      <div>
        <h3 class="text-xl font-bold text-gold">⚔️ Encounters</h3>
        <p class="mt-1 max-w-2xl text-sm text-ash dark:text-stone-300">Manage your campaign encounters</p>
      </div>
      <button
        @click="createEncounter"
        class="inline-flex items-center p-2 rounded-md text-gold hover:text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900 focus:outline-none transition-all duration-200 shadow-sm"
        title="Create Encounter"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div
        class="animate-spin rounded-full h-8 w-8 border-4 border-dragon border-t-transparent shadow-lg"
      ></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="px-6 py-5 text-center">
      <p class="text-error-700">{{ error }}</p>
      <button @click="fetchEncounters" class="mt-2 text-dragon hover:text-dragon-700 font-medium">
        Try Again
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="encounters.length === 0" class="px-6 py-12 text-center">
      <p class="text-ash dark:text-stone-300 mb-4">⚔️ No encounters created yet</p>
      <button 
        @click="createEncounter" 
        class="inline-flex items-center p-2 rounded-md text-gold hover:text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900 focus:outline-none transition-all duration-200 shadow-sm"
        title="Create your first encounter"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
    </div>

    <!-- Session Status Info -->
    <div v-else-if="!hasGameSession" class="px-6 py-4 bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-yellow-800 dark:text-yellow-200">
            You must be in a game session to start encounters.
          </p>
        </div>
      </div>
    </div>

    <!-- Encounters List -->
    <div v-else class="bg-parchment dark:bg-obsidian divide-y divide-stone-300 dark:divide-stone-600">
      <div
        v-for="encounter in sortedEncounters"
        :key="encounter.id"
        :class="[
          'px-6 py-4 transition-all duration-200',
          isActiveEncounter(encounter) 
            ? 'bg-success-50 dark:bg-success-900 border-l-4 border-success-400' 
            : !canStartEncounters 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-stone-100 dark:hover:bg-stone-600'
        ]"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex items-center space-x-3">
              <h4 class="text-sm font-bold text-onyx dark:text-parchment truncate">
                {{ encounter.name }}
              </h4>
              <!-- Active encounter badge -->
              <span
                v-if="isActiveEncounter(encounter)"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-success-100 text-success-800 border border-success-300"
              >
                ▶️ Active
              </span>
            </div>
            <div class="mt-2">
              <p v-if="encounter.description" class="text-sm text-ash dark:text-stone-300 line-clamp-2">
                {{ encounter.description }}
              </p>
            </div>
          </div>
          <div class="ml-6 flex items-center space-x-2">
            <!-- Stop button for active encounter -->
            <button
              v-if="isActiveEncounter(encounter)"
              @click="stopEncounter"
              class="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              title="Stop encounter"
            >
              ⏹️ Stop
            </button>
            <!-- Start button for inactive encounters -->
            <button
              v-else-if="canStartEncounters"
              @click="startEncounter(encounter)"
              class="inline-flex items-center px-3 py-1.5 border border-success-300 text-sm font-medium rounded-md text-success-700 bg-success-50 hover:bg-success-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-success-500 transition-colors"
              title="Start encounter"
            >
              ▶️ Start
            </button>
            <!-- View/Edit button -->
            <button
              @click="
                router.push({
                  name: 'encounter-detail',
                  params: {
                    id: encounter.id,
                  },
                })
              "
              class="inline-flex items-center p-2 rounded-md text-arcane hover:text-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-900 focus:outline-none transition-all duration-200 shadow-sm"
              title="View encounter"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
            <button
              v-if="encounter.id && !isActiveEncounter(encounter)"
              @click="deleteEncounter(encounter.id, encounter.name || 'Untitled Encounter')"
              class="inline-flex items-center p-2 rounded-md text-dragon hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900 focus:outline-none transition-all duration-200 shadow-sm"
              title="Delete encounter"
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
</template>
