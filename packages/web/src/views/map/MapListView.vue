<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { IMap, IAsset } from '@dungeon-lab/shared/types/index.mjs';
import { MapsClient } from '@dungeon-lab/client/index.mjs';
import { transformAssetUrl } from '@/utils/asset-utils.mjs';

const router = useRouter();
const maps = ref<IMap[]>([]);
const loading = ref(true);
const showDeleteModal = ref(false);
const mapToDelete = ref<string | null>(null);
const mapClient = new MapsClient();


// Function to get thumbnail URL from map
const getThumbnailUrl = (map: IMap): string | undefined => {
  if (map.thumbnailId) {
    // Handle populated ObjectId reference
    if (typeof map.thumbnailId === 'object') {
      const asset = map.thumbnailId as unknown as IAsset;
      return transformAssetUrl(asset.url);
    }
  }
  // Fallback for legacy data structure
  if ('thumbnail' in map && typeof map.thumbnail === 'object' && map.thumbnail !== null && 'url' in map.thumbnail) {
    return transformAssetUrl(map.thumbnail.url as string);
  }
  return undefined;
};

async function fetchMaps() {
  try {
    loading.value = true;
    maps.value = await mapClient.getMaps();
  } catch (error) {
    showNotification('Failed to fetch maps');
    console.error('Error fetching maps:', error);
  } finally {
    loading.value = false;
  }
}

async function deleteMap(mapId: string) {
  try {
    await mapClient.deleteMap(mapId);
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
  <div class="min-h-screen bg-parchment dark:bg-obsidian p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-dragon">🗺️ My Maps</h1>
      <div class="flex space-x-3">
        <button
          @click="router.push({ name: 'map-builder' })"
          class="btn btn-secondary shadow-lg flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5v1.5H5a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-10a1 1 0 00-1-1h-.5V5.5A4.5 4.5 0 0010 1zm3 6v-.5a3 3 0 10-6 0V7h6zm-6 2h6v8H7V9z" clip-rule="evenodd" />
          </svg>
          🤖 AI Map Builder
        </button>
        <button
          @click="router.push({ name: 'map-create' })"
          class="btn btn-success shadow-lg"
        >
          ➕ Create New Map
        </button>
      </div>
    </div>

    <div class="bg-stone dark:bg-stone-700 rounded-lg shadow-xl border border-stone-300 dark:border-stone-600">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center min-h-[400px]">
        <div
          class="animate-spin rounded-full h-12 w-12 border-4 border-dragon border-t-transparent shadow-lg"
        ></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="maps.length === 0" class="text-center py-12">
        <h3 class="text-xl font-bold text-dragon mb-4">🗺️ No Maps Found</h3>
        <p class="text-ash dark:text-stone-300 text-lg mb-6">Create your first map to begin your adventure!</p>
        <button
          @click="router.push({ name: 'map-create' })"
          class="btn btn-success shadow-lg"
        >
          ➕ Create Your First Map
        </button>
      </div>

      <!-- Maps Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        <div
          v-for="map in maps"
          :key="map.id || ''"
          class="bg-parchment dark:bg-obsidian rounded-lg shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1 border border-stone-300 dark:border-stone-600 flex flex-col h-full"
        >
          <!-- Map Name at Top -->
          <div class="px-4 pt-4">
            <h3 class="text-lg font-bold text-onyx dark:text-parchment mb-2 text-center truncate">{{ map.name }}</h3>
          </div>
          <!-- Map Image in Middle -->
          <div class="aspect-w-16 aspect-h-9 relative flex-1 flex items-center justify-center">
            <img
              v-if="getThumbnailUrl(map)"
              :src="getThumbnailUrl(map)"
              :alt="map.name"
              class="object-cover rounded-lg w-full h-full border-b border-stone-300 dark:border-stone-600"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-stone-200 dark:bg-stone-600 rounded-lg border-b border-stone-300 dark:border-stone-600">
              <span class="text-ash dark:text-stone-300 font-medium">🗺️ No Image</span>
            </div>
          </div>
          <!-- Action Icons at Bottom -->
          <div class="p-4 flex justify-between items-center">
            <div class="flex space-x-2 mx-auto">
              <button
                v-if="map.id"
                @click="router.push({ name: 'map-detail', params: { id: map.id } })"
                class="inline-flex items-center p-2 rounded-md text-arcane hover:text-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-900 focus:outline-none transition-all duration-200 shadow-sm"
                title="View Map"
              >
                👁️
              </button>
              <button
                v-if="map.id"
                @click="router.push({ name: 'map-edit', params: { id: map.id } })"
                class="inline-flex items-center p-2 rounded-md text-gold hover:text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900 focus:outline-none transition-all duration-200 shadow-sm"
                title="Edit Map"
              >
                ✏️
              </button>
              <button
                v-if="map.id"
                @click="confirmDelete(map.id)"
                class="inline-flex items-center p-2 rounded-md text-dragon hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900 focus:outline-none transition-all duration-200 shadow-sm"
                title="Delete Map"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <div
    v-if="showDeleteModal"
    class="fixed inset-0 z-50 overflow-y-auto"
    aria-labelledby="modal-title"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
    >
      <!-- Background overlay -->
      <div
        class="fixed inset-0 bg-obsidian bg-opacity-75 transition-opacity"
        aria-hidden="true"
      ></div>

      <!-- Modal panel -->
      <div
        class="inline-block align-bottom bg-stone dark:bg-stone-700 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-stone-300 dark:border-stone-600"
      >
        <div class="bg-stone dark:bg-stone-700 px-6 pt-6 pb-4">
          <div class="sm:flex sm:items-start">
            <div
              class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-error-100 border border-error-300 sm:mx-0 sm:h-10 sm:w-10"
            >
              <!-- Warning icon -->
              <svg
                class="h-6 w-6 text-error-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 class="text-lg leading-6 font-bold text-dragon" id="modal-title">
                🗑️ Delete Map
              </h3>
              <div class="mt-2">
                <p class="text-sm text-ash dark:text-stone-300">
                  Are you sure you want to delete this map? This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="bg-parchment dark:bg-obsidian px-6 py-4 border-t border-stone-300 dark:border-stone-600 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            class="btn btn-error shadow-lg sm:ml-3"
            @click="mapToDelete && deleteMap(mapToDelete)"
          >
            🗑️ Delete
          </button>
          <button
            type="button"
            class="btn btn-outline shadow-lg mt-3 sm:mt-0"
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
