<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { type IActor, type IAsset } from '@dungeon-lab/shared/types/index.mjs';
import { ActorsClient } from '@dungeon-lab/client/index.mjs';
import { PlusIcon, EyeIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { useDeviceAdaptation } from '@/composables/useDeviceAdaptation.mts';
import { transformAssetUrl } from '@/utils/asset-utils.mjs';

const router = useRouter();
const actorClient = new ActorsClient();
const characters = ref<IActor[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const { isMobile } = useDeviceAdaptation();

// Computed property to get the avatar URL for a character
const getAvatarUrl = (character: IActor): string | undefined => {
  if (character.avatar) {
    // Handle populated ObjectId reference
    if (typeof character.avatar === 'object') {
      const asset = character.avatar as unknown as IAsset;
      return transformAssetUrl(asset.url as string);
    }
  }
  return undefined;
};


onMounted(async () => {
  try {
    const actors = await actorClient.getActors();
    // Filter only character document types
    characters.value = actors.filter((actor: IActor) => actor.documentType === 'character');
  } catch (err) {
    console.error('Error loading characters:', err);
    error.value = 'Failed to load characters. Please try again later.';
  } finally {
    isLoading.value = false;
  }
});

async function handleDelete(id: string | undefined) {
  if (!id) return;
  
  try {
    await actorClient.deleteActor(id);
    // Remove the character from the list
    characters.value = characters.value.filter(char => char.id !== id);
  } catch (err) {
    console.error('Error deleting character:', err);
    error.value = 'Failed to delete character. Please try again later.';
  }
}

function handleEdit(id: string | undefined) {
  if (id) {
    router.push(`/character/${id}`);
  }
}

function handleCreate() {
  router.push('/character/create');
}
</script>

<template>
  <div :class="isMobile ? '' : 'p-6'">
    <!-- Mobile header -->
    <div v-if="isMobile" class="text-center py-4 border-b border-gray-200 bg-white">
      <h1 class="text-xl font-semibold">My Characters</h1>
    </div>
    
    <!-- Desktop header -->
    <div v-else class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-900">My Characters</h1>
        <button
          @click="handleCreate"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon class="h-5 w-5 mr-2" />
          Create Character
        </button>
      </div>
    </div>

    <!-- Content Container -->
    <div :class="isMobile ? 'p-4' : 'max-w-7xl mx-auto'">
      <!-- Error State -->
      <div v-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center min-h-[400px]">
        <div
          class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"
        ></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="characters.length === 0" class="text-center py-12">
        <h3 class="text-lg font-medium text-gray-900 mb-2">No Characters Yet</h3>
        <p class="text-gray-500 mb-4">Create your first character to get started</p>
        <button
          @click="handleCreate"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon class="h-5 w-5 mr-2" />
          Create Character
        </button>
      </div>

      <!-- Character Grid -->
      <div v-else :class="isMobile ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'">
        <div
          v-for="character in characters"
          :key="character.id || ''"
          class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
        >
          <div class="aspect-square bg-gray-200 relative">
            <img
              v-if="getAvatarUrl(character)"
              :src="getAvatarUrl(character) || ''"
              :alt="character.name || 'Character'"
              class="w-full h-full object-contain"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          </div>

          <div class="p-4">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-xl font-bold text-gray-900">{{ character.name }}</h3>
                <p v-if="character.pluginData" class="text-gray-600">
                  Level {{ character.pluginData.level }} {{ character.pluginData.race }}
                  {{ character.pluginData.class }}
                </p>
              </div>
              <div class="flex space-x-2">
                <button
                  v-if="character.id"
                  @click="handleEdit(character.id)"
                  class="p-2 text-gray-400 hover:text-blue-500 focus:outline-none"
                  title="View character"
                >
                  <EyeIcon class="h-5 w-5" />
                </button>
                <button
                  v-if="character.id"
                  @click="handleDelete(character.id)"
                  class="p-2 text-gray-400 hover:text-red-500 focus:outline-none"
                  title="Delete character"
                >
                  <TrashIcon class="h-5 w-5" />
                </button>
              </div>
            </div>

            <div v-if="character.pluginData && (character.pluginData as any).hitPoints" class="mt-4 flex items-center justify-between">
              <div class="text-sm font-medium text-gray-500">HP</div>
              <div class="text-sm font-semibold text-gray-900">
                {{ (character.pluginData as any).hitPoints.current }}/{{ (character.pluginData as any).hitPoints.maximum }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
