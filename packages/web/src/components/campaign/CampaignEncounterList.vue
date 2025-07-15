<!-- CampaignEncounterList.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useEncounterStore } from '../../stores/encounter.store.mjs';
import type { IEncounter } from '@dungeon-lab/shared/types/index.mjs';
import { EncountersClient } from '@dungeon-lab/client/index.mjs';

const props = defineProps<{
  campaignId: string;
}>();

const router = useRouter();
const encounterStore = useEncounterStore();
const encounters = ref<IEncounter[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const encounterClient = new EncountersClient();
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
  if (!confirm(`Are you sure you want to delete the encounter "${encounterName}"?`)) {
    return;
  }

  try {
    await encounterStore.deleteEncounter(encounterId);
    await fetchEncounters(); // Refresh the list
  } catch (err) {
    console.error('Error deleting encounter:', err);
    error.value = 'Failed to delete encounter';
  }
}

onMounted(() => {
  fetchEncounters();
});

// Status badge color mapping
const statusColors = {
  draft: 'bg-stone-200 text-stone-700 border-stone-300 dark:bg-stone-600 dark:text-stone-200 dark:border-stone-500',
  ready: 'bg-arcane-100 text-arcane-800 border-arcane-300 dark:bg-arcane-900 dark:text-arcane-200',
  in_progress: 'bg-success-100 text-success-800 border-success-300',
  paused: 'bg-accent-100 text-accent-800 border-accent-300',
  completed: 'bg-nature-100 text-nature-800 border-nature-300',
} as const;
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

    <!-- Encounters List -->
    <div v-else class="bg-parchment dark:bg-obsidian divide-y divide-stone-300 dark:divide-stone-600">
      <div
        v-for="encounter in encounters"
        :key="encounter.id"
        class="px-6 py-4 hover:bg-stone-100 dark:hover:bg-stone-600 transition-all duration-200"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex items-center space-x-3">
              <h4 class="text-sm font-bold text-onyx dark:text-parchment truncate">
                {{ encounter.name }}
              </h4>
              <span
                :class="[
                  statusColors[encounter.status],
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border',
                ]"
              >
                {{ encounter.status.replace('_', ' ') }}
              </span>
            </div>
            <div class="mt-2">
              <p v-if="encounter.description" class="text-sm text-ash dark:text-stone-300 line-clamp-2">
                {{ encounter.description }}
              </p>
            </div>
          </div>
          <div class="ml-6 flex items-center space-x-2">
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
              v-if="encounter.id"
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
