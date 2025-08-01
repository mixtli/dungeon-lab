<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import type { IMap, IAsset, IMapUpdateData } from '@dungeon-lab/shared/types/index.mjs';
import { MapsClient } from '@dungeon-lab/client/index.mjs';
import { transformAssetUrl } from '@/utils/asset-utils.mjs';

const route = useRoute();
const loading = ref(false);
const editing = ref(false);
const map = ref<IMap | null>(null);
const formData = ref<IMapUpdateData>({
  name: '',
  description: '',
  uvtt: {
    resolution: {
      map_size: {
        x: 0,
        y: 0
      }
    }
  }
});

const mapClient = new MapsClient();

// Function to get image URL from map
const getMapImageUrl = (map: IMap | null): string | undefined => {
  if (!map) return undefined;
  
  if (map.imageId) {
    // Handle populated ObjectId reference
    if (typeof map.imageId === 'object') {
      const asset = map.imageId as unknown as IAsset;
      return transformAssetUrl(asset.url);
    }
  }
  // Fallback for legacy data structure
  if ('image' in map && typeof map.image === 'object' && map.image !== null && 'url' in map.image) {
    return transformAssetUrl(map.image.url as string);
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
    const mapData = await mapClient.getMap(route.params.id as string);
    map.value = mapData || null;
    console.log('Map data:', map.value);
    if (map.value) {
      formData.value = {
        name: map.value.name,
        description: map.value.description || '',
        uvtt: {
          resolution: {
            map_size: {
              x: map.value.uvtt?.resolution?.map_size?.x || 0,
              y: map.value.uvtt?.resolution?.map_size?.y || 0
            }
          }
        }
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
    await mapClient.updateMap(route.params.id as string, formData.value);
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


onMounted(() => {
  fetchMap();
});
</script>

<template>
  <div class="min-h-screen bg-parchment dark:bg-obsidian p-6">
    <div class="max-w-4xl mx-auto">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center min-h-[400px]">
        <div
          class="animate-spin rounded-full h-12 w-12 border-4 border-dragon border-t-transparent shadow-lg"
        ></div>
      </div>

      <div v-else-if="map">
        <!-- Map Name - Centered -->
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-dragon">{{ map.name }}</h1>
        </div>

        <!-- Map Image -->
        <div class="mb-8 bg-stone dark:bg-stone-700 rounded-lg shadow-xl overflow-hidden border border-stone-300 dark:border-stone-600">
          <img
            v-if="getMapImageUrl(map)"
            :src="getMapImageUrl(map)"
            :alt="map.name"
            class="w-full object-cover"
          />
          <div v-else class="w-full h-64 bg-stone-200 dark:bg-stone-600 flex items-center justify-center">
            <span class="text-ash dark:text-stone-300 text-lg">🗺️ No image available</span>
          </div>
        </div>

        <!-- Details Box -->
        <div class="bg-stone dark:bg-stone-700 rounded-lg shadow-xl border border-stone-300 dark:border-stone-600 p-6">
          <h2 class="text-2xl font-bold text-dragon mb-4">📋 Map Details</h2>
          
          <div class="space-y-4">
            <!-- Description -->
            <div>
              <h3 class="text-sm uppercase text-gold font-bold mb-2">📝 Description</h3>
              <p class="text-onyx dark:text-parchment">{{ map.description || 'No description provided' }}</p>
            </div>

            <!-- Grid and Aspect Ratio -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-parchment dark:bg-obsidian p-4 rounded-lg border border-stone-300 dark:border-stone-600">
                <h3 class="text-sm uppercase text-gold font-bold mb-2">📐 Grid Size</h3>
                <p class="text-onyx dark:text-parchment font-medium">
                  {{ map.uvtt?.resolution?.map_size?.x || 0 }} x {{ map.uvtt?.resolution?.map_size?.y || 0 }}
                </p>
              </div>

              <div class="bg-parchment dark:bg-obsidian p-4 rounded-lg border border-stone-300 dark:border-stone-600">
                <h3 class="text-sm uppercase text-gold font-bold mb-2">📏 Aspect Ratio</h3>
                <p class="text-onyx dark:text-parchment font-medium">
                  {{ map.aspectRatio?.toFixed(2) || 'Unknown' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Edit Button -->
          <div class="flex justify-end mt-6">
            <button
              @click="editing = true"
              class="btn btn-success shadow-lg"
            >
              ✏️ Edit Map
            </button>
          </div>
        </div>

        <!-- Edit Form -->
        <div v-if="editing" class="mt-8 bg-stone dark:bg-stone-700 rounded-lg shadow-xl border border-stone-300 dark:border-stone-600 p-6">
          <h2 class="text-2xl font-bold text-dragon mb-6">✏️ Edit Map</h2>
          
            <form @submit.prevent="handleUpdate" class="space-y-6">
              <div>
                <label class="block text-sm uppercase text-gold font-bold mb-2">
                  📝 Name <span class="text-dragon">*</span>
                </label>
                <input
                  v-model="formData.name"
                  type="text"
                  required
                  placeholder="Enter map name"
                  class="w-full px-4 py-3 bg-parchment dark:bg-obsidian border border-stone-300 dark:border-stone-600 rounded-lg text-onyx dark:text-parchment focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                />
              </div>

              <div>
                <label class="block text-sm uppercase text-gold font-bold mb-2">📖 Description</label>
                <textarea
                  v-model="formData.description"
                  rows="4"
                  placeholder="Enter map description"
                  class="w-full px-4 py-3 bg-parchment dark:bg-obsidian border border-stone-300 dark:border-stone-600 rounded-lg text-onyx dark:text-parchment focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                ></textarea>
              </div>

              <div>
                <label class="block text-sm uppercase text-gold font-bold mb-2">
                  📐 Grid Columns <span class="text-dragon">*</span>
                </label>
                <input
                  v-model="formData!.uvtt!.resolution!.map_size!.x"
                  type="number"
                  required
                  min="1"
                  max="100"
                  class="w-full px-4 py-3 bg-parchment dark:bg-obsidian border border-stone-300 dark:border-stone-600 rounded-lg text-onyx dark:text-parchment focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
                />
                <div class="text-ash dark:text-stone-300 text-sm mt-1">
                  Number of columns in the grid. Rows will be calculated based on the image aspect ratio.
                </div>
              </div>

              <div class="flex justify-end space-x-3">
                <button
                  type="button"
                  @click="editing = false"
                  class="btn btn-outline shadow-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn btn-success shadow-lg"
                >
                  💾 Save Changes
                </button>
              </div>
            </form>
          </div>
      </div>
    </div>
  </div>
</template>
