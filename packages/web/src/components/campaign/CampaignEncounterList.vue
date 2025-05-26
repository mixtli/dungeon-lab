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
  draft: 'bg-gray-100 text-gray-800',
  ready: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-green-100 text-green-800',
  completed: 'bg-purple-100 text-purple-800',
} as const;
</script>

<template>
  <div class="encounters-section">
    <div class="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
      <div>
        <h3 class="text-lg leading-6 font-medium text-gray-900">Encounters</h3>
        <p class="mt-1 max-w-2xl text-sm text-gray-500">Manage your campaign encounters</p>
      </div>
      <button
        @click="createEncounter"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Create Encounter
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div
        class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"
      ></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="px-4 py-5 sm:px-6 text-center">
      <p class="text-red-600">{{ error }}</p>
      <button @click="fetchEncounters" class="mt-2 text-blue-600 hover:text-blue-500">
        Try Again
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="encounters.length === 0" class="px-4 py-12 sm:px-6 text-center">
      <p class="text-gray-500">No encounters created yet</p>
      <button @click="createEncounter" class="mt-2 text-blue-600 hover:text-blue-500">
        Create your first encounter
      </button>
    </div>

    <!-- Encounters List -->
    <div v-else class="divide-y divide-gray-200">
      <div
        v-for="encounter in encounters"
        :key="encounter.id"
        class="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors duration-150 ease-in-out"
      >
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex items-center space-x-3">
              <h4 class="text-sm font-medium text-gray-900 truncate">
                {{ encounter.name }}
              </h4>
              <span
                :class="[
                  statusColors[encounter.status],
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                ]"
              >
                {{ encounter.status.replace('_', ' ') }}
              </span>
            </div>
            <div class="mt-2">
              <p v-if="encounter.description" class="text-sm text-gray-500 line-clamp-2">
                {{ encounter.description }}
              </p>
            </div>
          </div>
          <div class="ml-6 flex items-center space-x-4">
            <button
              @click="
                router.push({
                  name: 'encounter-detail',
                  params: {
                    id: encounter.id,
                  },
                })
              "
              class="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
              class="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
