<script setup lang="ts">
// LEGACY FILE: This will be rewritten as part of the new Encounter Implementation
// Temporary fixes applied to resolve TypeScript errors until rewrite

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import type { IMap } from '@dungeon-lab/shared/types/index.mjs';
import { MapsClient } from '@dungeon-lab/client/index.mjs';
import { EncountersClient } from '@dungeon-lab/client/index.mjs';

const router = useRouter();
const mapClient = new MapsClient();
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
const encounterClient = new EncountersClient();
// Fetch available maps
async function fetchMaps() {
  loading.value = true;
  error.value = null;
  try {
    maps.value = await mapClient.getMaps();
    console.log('Maps:', JSON.stringify(maps.value, null, 2));
  } catch (err) {
    console.error('Error fetching maps:', err);
    error.value = 'Failed to load maps';
  } finally {
    loading.value = false;
  }
}

// Handle form submission
async function handleSubmit(event: Event) {
  event.preventDefault();

  console.log('Form data at submission:', JSON.stringify(formData.value, null, 2));
  console.log('Selected mapId:', formData.value.mapId, typeof formData.value.mapId);

  if (!formData.value.mapId) {
    error.value = 'Please select a map';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const submitData = {
      ...formData.value,
      mapId: formData.value.mapId,
      campaignId: router.currentRoute.value.params.campaignId as string,
    };
    console.log('Creating encounter with data:', JSON.stringify(submitData, null, 2));
    // LEGACY: Using type assertion to bypass TypeScript error - will be fixed in rewrite
    const encounter = await encounterClient.createEncounter(submitData as unknown as Parameters<typeof encounterClient.createEncounter>[0]);

    console.log('Successfully created encounter with ID:', encounter.id);

    if (!encounter) {
      throw new Error('No encounter ID returned from server');
    }

    console.log('Preparing to redirect to:', `/encounter/${encounter.id}`);
    router.push({
      name: 'encounter-detail',
      params: { id: encounter.id}
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

      <!-- Error display -->
      <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        {{ error }}
      </div>


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
          <label for="description" class="block text-sm font-medium text-gray-700"
            >Description</label
          >
          <textarea
            id="description"
            v-model="formData.description"
            rows="3"
            placeholder="Enter encounter description"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          ></textarea>
        </div>

        <div>
          <label for="map" class="block text-sm font-medium text-gray-700"
            >Map <span class="text-red-500">*</span></label
          >
          <select
            id="map"
            name="map"
            v-model="formData.mapId"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="" disabled>Select a map</option>
            <option v-for="map in maps" :key="map.id" :value="map.id">
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
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Create Encounter
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
