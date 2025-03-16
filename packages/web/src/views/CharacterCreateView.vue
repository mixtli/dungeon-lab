<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import PluginUIContainer from '@/components/plugin/PluginUIContainer.vue';
import ImageUpload from '@/components/common/ImageUpload.vue';
import { pluginRegistry } from '@/services/plugin-registry.service.mjs';

interface UploadedImage {
  url: string;
  objectKey: string;
  size?: number;
}

// Define the type for the formatted character data
interface CharacterFormData {
  name: string;
  type: string;
  gameSystem: string;
  avatarUrl?: string;
  tokenUrl?: string;
  data: {
    name: string;
    avatarUrl?: string;
    tokenUrl?: string;
    [key: string]: any;
  };
}

const router = useRouter();
const activeGameSystemId = ref<string>(localStorage.getItem('activeGameSystem') || '');
const isLoading = ref(true);
const error = ref<string | null>(null);

// Step management
const currentStep = ref(1);

// Basic info form data
const basicInfo = ref({
  name: '',
  avatarImage: null as UploadedImage | null,
  tokenImage: null as UploadedImage | null
});

// Combined data to pass to plugin
const combinedInitialData = computed(() => {
  return {
    name: basicInfo.value.name,
    avatarUrl: basicInfo.value.avatarImage?.url || null,
    tokenUrl: basicInfo.value.tokenImage?.url || null,
  };
});

// Get the game system plugin
const gameSystemPlugin = computed(() => {
  return activeGameSystemId.value ? pluginRegistry.getGameSystemPlugin(activeGameSystemId.value) : undefined;
});

onMounted(async () => {
  // Check if we have an active game system
  if (!activeGameSystemId.value) {
    error.value = 'No active game system selected. Please select a game system in the Settings page.';
    isLoading.value = false;
    return;
  }
  
  // Make sure the plugin is loaded
  try {
    await pluginRegistry.loadGameSystemPlugin(activeGameSystemId.value);
    isLoading.value = false;
  } catch (err) {
    console.error('Error loading active game system:', err);
    error.value = 'Failed to load the active game system. Please try again.';
    isLoading.value = false;
  }
});

// Proceed to step 2 after validating basic info
function proceedToStep2() {
  if (!basicInfo.value.name.trim()) {
    error.value = 'Character name is required';
    return;
  }
  
  currentStep.value = 2;
  error.value = null;
}

// Handle plugin form submission 
async function handlePluginSubmit(characterData: Record<string, any>) {
  // Combine basic info with plugin data
  const formattedData: CharacterFormData = {
    name: basicInfo.value.name,
    type: 'character',
    gameSystem: activeGameSystemId.value,
    data: {
      ...characterData,
      // Include character core data in the plugin data
      name: basicInfo.value.name
    }
  };
  
  // Add image information if available
  if (basicInfo.value.avatarImage) {
    formattedData.avatarUrl = basicInfo.value.avatarImage.url;
    formattedData.data.avatarUrl = basicInfo.value.avatarImage.url;
  }
  
  if (basicInfo.value.tokenImage) {
    formattedData.tokenUrl = basicInfo.value.tokenImage.url;
    formattedData.data.tokenUrl = basicInfo.value.tokenImage.url;
  }
  
  // Create the character
  createCharacter(formattedData);
}

function handleCancel() {
  router.push('/characters');
}

function handleError(errorMessage: string) {
  error.value = errorMessage;
}

async function createCharacter(characterData: CharacterFormData) {
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
      
      <!-- Loading & Error States -->
      <div v-if="isLoading" class="flex justify-center items-center p-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
      
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
      
      <!-- No Active Game System -->
      <div v-else-if="!activeGameSystemId" class="text-center py-6">
        <p class="text-gray-700 mb-4">You need to select an active game system before creating a character.</p>
        <button 
          @click="router.push('/settings')" 
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Go to Settings
        </button>
      </div>
      
      <!-- Character Creation Steps -->
      <div v-else>
        <!-- Step Indicator -->
        <div class="mb-6">
          <div class="flex items-center">
            <div class="w-8 h-8 rounded-full flex items-center justify-center" 
                :class="currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'">
              1
            </div>
            <div class="flex-1 h-1 mx-2" :class="currentStep === 1 ? 'bg-gray-200' : 'bg-blue-600'"></div>
            <div class="w-8 h-8 rounded-full flex items-center justify-center"
                :class="currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'">
              2
            </div>
          </div>
          <div class="flex justify-between mt-2 text-sm">
            <span>Basic Information</span>
            <span>Character Details</span>
          </div>
        </div>
        
        <!-- Step 1: Basic Info -->
        <div v-if="currentStep === 1">
          <form @submit.prevent="proceedToStep2">
            <!-- Name Field -->
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2" for="name">
                Character Name *
              </label>
              <input 
                id="name" 
                v-model="basicInfo.name" 
                class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                type="text" 
                required
              >
            </div>
            
            <!-- Avatar Upload -->
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">
                Avatar Image
              </label>
              <ImageUpload 
                v-model="basicInfo.avatarImage" 
                type="avatar"
              />
            </div>
            
            <!-- Token Upload -->
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">
                Token Image
              </label>
              <ImageUpload 
                v-model="basicInfo.tokenImage" 
                type="token"
              />
            </div>
            
            <!-- Navigation Buttons -->
            <div class="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                @click="handleCancel"
                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Next
              </button>
            </div>
          </form>
        </div>
        
        <!-- Step 2: Plugin Character Creation -->
        <div v-else-if="currentStep === 2">
          <div class="mb-4">
            <button 
              @click="currentStep = 1"
              class="text-blue-600 hover:text-blue-800 flex items-center"
              type="button"
            >
              <span>← Back to Basic Info</span>
            </button>
          </div>
          
          <div class="mb-4 p-4 bg-gray-50 rounded-md">
            <h3 class="font-medium text-gray-900">Character Summary</h3>
            <p class="text-gray-700">Name: {{ basicInfo.name }}</p>
            
            <div class="mt-2 flex space-x-4">
              <div v-if="basicInfo.avatarImage" class="flex-shrink-0">
                <img :src="basicInfo.avatarImage.url" class="h-16 w-16 object-cover rounded-md" alt="Avatar" />
              </div>
              <div v-if="basicInfo.tokenImage" class="flex-shrink-0">
                <img :src="basicInfo.tokenImage.url" class="h-16 w-16 object-cover rounded-md" alt="Token" />
              </div>
            </div>
          </div>
          
          <PluginUIContainer
            :plugin-id="activeGameSystemId"
            context="characterCreation"
            :initial-data="combinedInitialData"
            @submit="handlePluginSubmit"
            @cancel="handleCancel"
            @error="handleError"
          />
        </div>
      </div>
    </div>
  </div>
</template> 