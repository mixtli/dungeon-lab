<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { IEncounter } from '@dungeon-lab/shared/schemas/encounter.schema.mjs';
import * as encounterApi from '../../api/encounters.client.mjs';

interface IEncounterWithDates extends IEncounter {
  createdAt?: string;
  updatedAt?: string;
}

const encounters = ref<IEncounterWithDates[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  await fetchEncounters();
});

async function fetchEncounters() {
  loading.value = true;
  try {
    encounters.value = await encounterApi.getEncounters();
  } catch (err) {
    console.error('Error fetching encounters:', err);
    error.value = 'Failed to load encounters';
  } finally {
    loading.value = false;
  }
}

function formatDate(dateString: string | Date | undefined) {
  if (!dateString) return 'Unknown date';
  return new Date(dateString).toLocaleDateString();
}
</script>

<template>
  <div class="p-4">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold">Encounters</h1>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-8">
        <div
          class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"
        ></div>
        <span class="ml-2">Loading...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        {{ error }}
      </div>

      <!-- Empty State -->
      <div v-else-if="encounters.length === 0" class="text-center py-12 bg-gray-50 rounded-lg">
        <h3 class="text-lg font-medium text-gray-500">No encounters found</h3>
        <p class="mt-2 text-sm text-gray-400">Create an encounter from a campaign page</p>
      </div>

      <!-- Encounters List -->
      <div v-else class="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" class="divide-y divide-gray-200">
          <li v-for="encounter in encounters" :key="encounter.id" class="hover:bg-gray-50">
            <div class="block">
              <div class="px-4 py-4 sm:px-6">
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <p class="text-sm font-medium text-blue-600 truncate">
                      <router-link :to="`/encounter/${encounter.id}`" class="hover:underline">
                        {{ encounter.name }}
                      </router-link>
                    </p>
                    <p
                      class="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800"
                    >
                      {{ encounter.status }}
                    </p>
                  </div>
                  <div class="flex-shrink-0 flex">
                    <router-link
                      :to="`/encounter/${encounter.id}`"
                      class="ml-2 px-3 py-1 text-sm text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View
                    </router-link>
                  </div>
                </div>
                <div class="mt-2 sm:flex sm:justify-between">
                  <div class="sm:flex">
                    <p class="flex items-center text-sm text-gray-500">
                      {{ encounter.description || 'No description' }}
                    </p>
                  </div>
                  <div class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <p>Created {{ formatDate(encounter?.createdAt || new Date()) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
