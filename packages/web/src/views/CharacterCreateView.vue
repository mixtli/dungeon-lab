<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import PluginUIContainer from '@/components/plugin/PluginUIContainer.vue';
import { usePluginStore } from '@/stores/plugin.mts';

const router = useRouter();
const pluginStore = usePluginStore();
const activeGameSystemId = ref<string>(localStorage.getItem('activeGameSystem') || '');
const isLoading = ref(true);
const error = ref<string | null>(null);
const initialData = ref<Record<string, any>>({});

onMounted(async () => {
  // Initialize plugin store if needed
  if (pluginStore.plugins.length === 0) {
    await pluginStore.initializePlugins();
  }
  
  // Check if we have an active game system
  if (!activeGameSystemId.value) {
    error.value = 'No active game system selected. Please select a game system in the Settings page.';
    isLoading.value = false;
    return;
  }
  
  // Make sure the plugin is loaded
  try {
    await pluginStore.getPlugin(activeGameSystemId.value);
    isLoading.value = false;
  } catch (err) {
    console.error('Error loading active game system:', err);
    error.value = 'Failed to load the active game system. Please try again.';
    isLoading.value = false;
  }
});

function handleSubmit(characterData: Record<string, any>) {
  // Convert the character data to the format expected by the API
  const formattedData = {
    name: characterData.name,
    type: 'character',
    gameSystem: activeGameSystemId.value,
    data: characterData
  };
  
  // Create the character
  createCharacter(formattedData);
}

function handleCancel() {
  router.push('/characters');
}

function handleError(errorMessage: string) {
  error.value = errorMessage;
}

async function createCharacter(characterData: Record<string, any>) {
  isLoading.value = true;
  error.value = null;
  
  try {
    const response = await fetch('/api/actors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(characterData),
    });

    if (!response.ok) {
      throw new Error('Failed to create character');
    }

    const character = await response.json();
    router.push(`/character/${character.id}`);
  } catch (err) {
    console.error('Error creating character:', err);
    error.value = 'Failed to create character. Please try again.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <div class="bg-white rounded-lg shadow-md p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Create New Character</h1>
      
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center p-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
      
      <!-- Error Message -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700">{{ error }}</p>
          </div>
        </div>
      </div>
      
      <!-- No Active Game System Selected -->
      <div v-else-if="!activeGameSystemId" class="text-center py-6">
        <p class="text-gray-700 mb-4">You need to select an active game system before creating a character.</p>
        <button 
          @click="router.push('/settings')" 
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Go to Settings
        </button>
      </div>
      
      <!-- Plugin UI Container -->
      <div v-else>
        <PluginUIContainer
          :plugin-id="activeGameSystemId"
          context="characterCreation"
          :initial-data="initialData"
          @submit="handleSubmit"
          @cancel="handleCancel"
          @error="handleError"
        />
        
        <div class="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            @click="handleCancel"
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template> 