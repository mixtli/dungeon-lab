<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { IMap } from '@dungeon-lab/shared/index.mjs';
import axios from '../../network/axios.mjs';
import MapImage from '../../components/MapImage.vue';

const router = useRouter();
const maps = ref<IMap[]>([]);
const loading = ref(false);
const showDeleteModal = ref(false);
const mapToDelete = ref<string | null>(null);

async function fetchMaps() {
  try {
    loading.value = true;
    const response = await axios.get('/api/maps');
    maps.value = response.data;
  } catch (error) {
    showNotification('Failed to fetch maps');
    console.error('Error fetching maps:', error);
  } finally {
    loading.value = false;
  }
}

async function deleteMap(mapId: string) {
  try {
    await axios.delete(`/api/maps/${mapId}`);
    showNotification('Map deleted successfully');
    await fetchMaps();
  } catch (error) {
    showNotification('Failed to delete map');
    console.error('Error deleting map:', error);
  } finally {
    showDeleteModal.value = false;
    mapToDelete.value = null;
  }
}

function confirmDelete(mapId: string) {
  mapToDelete.value = mapId;
  showDeleteModal.value = true;
}

function showNotification(message: string) {
  alert(message);
}

onMounted(() => {
  fetchMaps();
});
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">My Maps</h1>
      <button 
        @click="router.push({ name: 'map-create' })"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Create New Map
      </button>
    </div>

    <div class="bg-white rounded-lg shadow">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center min-h-[400px]">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="maps.length === 0" class="text-center py-12">
        <p class="text-gray-500 text-lg">No maps found. Create your first map!</p>
      </div>

      <!-- Maps Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        <div
          v-for="map in maps"
          :key="map.id || ''"
          class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 hover:-translate-y-1"
        >
          <div class="aspect-w-16 aspect-h-9">
            <MapImage
              :map-id="map.id || ''"
              :image-url="map.thumbnailUrl"
              :alt="map.name"
              class="object-cover rounded-t-lg"
            />
          </div>
          <div class="p-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ map.name }}</h3>
            <p class="text-gray-600 text-sm mb-4">{{ map.description }}</p>
            <div class="flex justify-end space-x-2">
              <button
                v-if="map.id"
                @click="router.push({ name: 'map-detail', params: { id: map.id } })"
                class="px-3 py-1.5 bg-white border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                View
              </button>
              <button
                v-if="map.id"
                @click="confirmDelete(map.id)"
                class="px-3 py-1.5 bg-white border border-red-600 text-red-600 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <div v-if="showDeleteModal" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">
            <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <!-- Warning icon -->
              <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                Delete Map
              </h3>
              <div class="mt-2">
                <p class="text-sm text-gray-500">
                  Are you sure you want to delete this map? This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <button 
            type="button" 
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            @click="mapToDelete && deleteMap(mapToDelete)"
          >
            Delete
          </button>
          <button 
            type="button" 
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            @click="showDeleteModal = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.aspect-w-16 {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 */
}

.aspect-w-16 > * {
  position: absolute;
  height: 100%;
  width: 100%;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}
</style> 