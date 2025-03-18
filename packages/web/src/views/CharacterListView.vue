<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline';

interface Character {
  id: string;
  name: string;
  type: string;
  avatar?: string;
  data: {
    race: string;
    class: string;
    level: number;
    hitPoints: {
      current: number;
      maximum: number;
    };
  };
}

const router = useRouter();
const characters = ref<Character[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const response = await fetch('/api/actors');
    if (!response.ok) {
      throw new Error('Failed to fetch characters');
    }
    const actors = await response.json();
    // Filter only character type actors
    characters.value = actors.filter((actor: Character) => actor.type === 'character');
  } catch (err) {
    console.error('Error loading characters:', err);
    error.value = 'Failed to load characters. Please try again later.';
  } finally {
    isLoading.value = false;
  }
});

async function handleDelete(id: string) {
  try {
    const response = await fetch(`/api/actors/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete character');
    }
    
    // Remove the character from the list
    characters.value = characters.value.filter(char => char.id !== id);
  } catch (err) {
    console.error('Error deleting character:', err);
    error.value = 'Failed to delete character. Please try again later.';
  }
}

function handleEdit(id: string) {
  router.push(`/character/${id}`);
}

function handleCreate() {
  router.push('/character/create');
}
</script>

<template>
  <div class="p-6">
    <div class="max-w-7xl mx-auto">
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

      <!-- Error State -->
      <div v-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-700">{{ error }}</p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center min-h-[400px]">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
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
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="character in characters"
          :key="character.id"
          class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
        >
          <div class="aspect-[4/3] bg-gray-200 relative">
            <img
              v-if="character.avatar"
              :src="character.avatar"
              :alt="character.name"
              class="w-full h-full object-cover"
            >
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          </div>

          <div class="p-4">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-xl font-bold text-gray-900">{{ character.name }}</h3>
                <p class="text-gray-600">Level {{ character.data.level }} {{ character.data.race }} {{ character.data.class }}</p>
              </div>
              <div class="flex space-x-2">
                <button
                  @click="handleEdit(character.id)"
                  class="p-2 text-gray-400 hover:text-blue-500 focus:outline-none"
                  title="Edit character"
                >
                  <PencilIcon class="h-5 w-5" />
                </button>
                <button
                  @click="handleDelete(character.id)"
                  class="p-2 text-gray-400 hover:text-red-500 focus:outline-none"
                  title="Delete character"
                >
                  <TrashIcon class="h-5 w-5" />
                </button>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between">
              <div class="text-sm font-medium text-gray-500">HP</div>
              <div class="text-sm font-semibold text-gray-900">
                {{ character.data.hitPoints?.current }}/{{ character.data.hitPoints?.maximum }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 