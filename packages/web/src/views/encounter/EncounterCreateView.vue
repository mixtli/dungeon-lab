<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEncounterStore } from '../../stores/encounter.mts';
import type { IMap } from '@dungeon-lab/shared/src/schemas/map.schema.mjs';
import type { IEncounterCreateData } from '@dungeon-lab/shared/src/schemas/encounter.schema.mjs';

const route = useRoute();
const router = useRouter();
const encounterStore = useEncounterStore();

const loading = ref(false);
const maps = ref<IMap[]>([]);
const formData = ref({
  name: '',
  description: '',
  mapId: '',
  status: 'draft' as const,
  participants: [] as string[],
  settings: {},
});
const error = ref<string | null>(null);

// Fetch available maps
async function fetchMaps() {
  loading.value = true;
  try {
    const response = await fetch('/api/maps');
    if (!response.ok) throw new Error('Failed to fetch maps');
    const data = await response.json();
    maps.value = data.map((map: any) => ({
      ...map,
      id: String(map.id),
    }));
  } catch (error) {
    console.error('Error fetching maps:', error);
  } finally {
    loading.value = false;
  }
}

// Handle form submission
async function handleSubmit(event: Event) {
  event.preventDefault();
  
  loading.value = true;
  error.value = null;

  try {
    console.log('Creating encounter with data:', formData.value);
    const encounterId = await encounterStore.createEncounter(formData.value, route.params.campaignId as string);
    
    console.log('Successfully created encounter with ID:', encounterId);
    
    if (!encounterId) {
      throw new Error('No encounter ID returned from server');
    }
    
    console.log('Preparing to redirect to:', `/encounter/${encounterId}`);
    // Use immediate redirection instead of setTimeout
    router.push({
      name: 'encounter-detail',
      params: { id: encounterId }
    });
  } catch (err: unknown) {
    console.error('Failed to create encounter:', err);
    error.value = err instanceof Error ? err.message : 'Failed to create encounter';
  } finally {
    loading.value = false;
  }
}

// Fetch maps on component mount
fetchMaps();
</script>

<template>
  <div class="p-4">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold mb-6">Create New Encounter</h1>
      
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            required
            placeholder="Enter encounter name"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            id="description"
            v-model="formData.description"
            rows="3"
            placeholder="Enter encounter description"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          ></textarea>
        </div>
        
        <div>
          <label for="map" class="block text-sm font-medium text-gray-700">Map</label>
          <select
            id="map"
            v-model="formData.mapId"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Select a map</option>
            <option
              v-for="map in maps"
              :key="map.id"
              :value="map.id"
            >
              {{ map.name }}
            </option>
          </select>
        </div>
        
        <div class="flex justify-end space-x-2">
          <button
            type="button"
            @click="router.back()"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              v-if="loading"
              class="w-4 h-4 mr-2 -ml-1 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Create Encounter
          </button>
        </div>
      </form>
    </div>
  </div>
</template> 