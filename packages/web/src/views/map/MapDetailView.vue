<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { IMap, IAsset } from '@dungeon-lab/shared/index.mjs';
import axios from '../../network/axios.mjs';
import { ArrowLeftIcon } from '@heroicons/vue/24/outline';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const editing = ref(false);
const map = ref<IMap | null>(null);
const formData = ref<Partial<IMap>>({
  name: '',
  description: '',
  gridColumns: 20,
});
const showDebug = ref(false);

// Function to get image URL from map
const getMapImageUrl = (map: IMap | null): string | undefined => {
  if (!map) return undefined;
  
  if (map.imageId) {
    // Handle populated ObjectId reference
    if (typeof map.imageId === 'object') {
      const asset = map.imageId as unknown as IAsset;
      return asset.url;
    }
  }
  // Fallback for legacy data structure
  if ('image' in map && typeof map.image === 'object' && map.image !== null && 'url' in map.image) {
    return map.image.url as string;
  }
  return undefined;
};

// Simple notification function (we can replace this with a proper notification system later)
function showNotification(message: string) {
  alert(message);
}

async function fetchMap() {
  try {
    loading.value = true;
    const response = await axios.get(`/api/maps/${route.params.id}`);
    map.value = response.data;
    console.log('Map data:', map.value);
    if (map.value) {
      formData.value = {
        name: map.value.name,
        description: map.value.description || '',
        gridColumns: map.value.gridColumns,
      };
    }
  } catch (error) {
    showNotification('Failed to fetch map');
    console.error('Error fetching map:', error);
  } finally {
    loading.value = false;
  }
}

async function handleUpdate() {
  try {
    loading.value = true;
    await axios.patch(`/api/maps/${route.params.id}`, formData.value);
    showNotification('Map updated successfully');
    editing.value = false;
    await fetchMap();
  } catch (error) {
    showNotification('Failed to update map');
    console.error('Error updating map:', error);
  } finally {
    loading.value = false;
  }
}

function toggleDebug() {
  showDebug.value = !showDebug.value;
}

onMounted(() => {
  fetchMap();
});
</script>

<template>
  <div class="p-6">
    <div class="flex items-center mb-6">
      <button
        @click="router.back()"
        class="flex items-center px-4 py-2 mr-4 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <ArrowLeftIcon class="w-5 h-5 mr-2" />
        Back
      </button>
      <h1 class="text-2xl font-bold">Map Details</h1>
    </div>

    <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center min-h-[400px]">
        <div
          class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"
        ></div>
      </div>

      <div v-else-if="map" class="p-6">
        <div class="mb-6">
          <img
            v-if="getMapImageUrl(map)"
            :src="getMapImageUrl(map)"
            :alt="map.name"
            class="w-full rounded shadow-lg object-cover"
          />
          <div v-else class="w-full h-64 bg-gray-200 rounded shadow-lg flex items-center justify-center">
            <span class="text-gray-500">No image available</span>
          </div>
        </div>

        <div v-if="!editing" class="space-y-4">
          <div>
            <h2 class="text-xl font-semibold">{{ map.name }}</h2>
            <p class="text-gray-600 mt-2">{{ map.description || 'No description' }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium">Grid Size:</span>
              {{ map.gridColumns }} x {{ map.gridRows }}
            </div>
            <div>
              <span class="font-medium">Aspect Ratio:</span>
              {{ map.aspectRatio.toFixed(2) }}
            </div>
          </div>

          <!-- Debug section -->
          <div class="mt-8 border-t pt-4">
            <button 
              @click="toggleDebug"
              class="text-sm text-gray-500 hover:text-gray-700"
            >
              {{ showDebug ? 'Hide' : 'Show' }} Debug Info
            </button>
            <div v-if="showDebug" class="mt-2 bg-gray-100 p-4 rounded overflow-auto max-h-96">
              <pre class="text-xs">{{ JSON.stringify(map, null, 2) }}</pre>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              @click="editing = true"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Edit Map
            </button>
          </div>
        </div>

        <form v-else @submit.prevent="handleUpdate" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Name <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.name"
              type="text"
              required
              placeholder="Enter map name"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"> Description </label>
            <textarea
              v-model="formData.description"
              rows="4"
              placeholder="Enter map description"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Grid Columns <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.gridColumns"
              type="number"
              required
              min="1"
              max="100"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div class="text-gray-500 text-sm mt-1">
              Number of columns in the grid. Rows will be calculated based on the image aspect
              ratio.
            </div>
          </div>

          <div class="flex justify-end space-x-2">
            <button
              type="button"
              @click="editing = false"
              class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
