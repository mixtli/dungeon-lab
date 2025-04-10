# Create a new file for editing basic actor data
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useActorStore } from '../stores/actor.mts';
import ImageUpload from '../components/common/ImageUpload.vue';
import axios from '../network/axios.mjs';

interface UploadedImage {
  url: string;
  objectKey?: string;
  path?: string;
  size?: number;
  type?: string;
}

const router = useRouter();
const route = useRoute();
const actorStore = useActorStore();
const isLoading = ref(true);
const error = ref<string | null>(null);
const isSubmitting = ref(false);
const isGeneratingAvatar = ref(false);
const isGeneratingToken = ref(false);

// Basic info form data
const basicInfo = ref({
  name: '',
  description: '',
  avatarImage: null as File | UploadedImage | null,
  tokenImage: null as File | UploadedImage | null
});

// Get a url from either a File or UploadedImage
function getUrlFromImageObject(imageObj: File | UploadedImage | null): string | null {
  if (!imageObj) return null;
  
  if (imageObj instanceof File) {
    return null;
  } else if ('url' in imageObj) {
    return imageObj.url;
  }
  
  return null;
}

onMounted(async () => {
  try {
    const actorId = route.params.id as string;
    if (!actorId) {
      error.value = 'No actor ID provided';
      return;
    }

    // Fetch actor data
    const response = await axios.get(`/api/actors/${actorId}`);
    const actor = response.data;

    // Set form data
    basicInfo.value = {
      name: actor.name || '',
      description: actor.description || '',
      avatarImage: actor.avatar ? { 
        url: actor.avatar.url,
        path: actor.avatar.path,
        size: actor.avatar.size,
        type: actor.avatar.type
      } : null,
      tokenImage: actor.token ? {
        url: actor.token.url,
        path: actor.token.path,
        size: actor.token.size,
        type: actor.token.type
      } : null
    };
  } catch (err) {
    console.error('Failed to fetch actor:', err);
    if (err instanceof Error) {
      error.value = `Error loading actor: ${err.message}`;
    } else {
      error.value = 'An unknown error occurred while loading the actor';
    }
  } finally {
    isLoading.value = false;
  }
});

// Generate new image using AI
async function generateNewImage(type: 'avatar' | 'token') {
  const isGenerating = type === 'avatar' ? isGeneratingAvatar : isGeneratingToken;
  try {
    isGenerating.value = true;
    error.value = null;
    const actorId = route.params.id as string;

    // Call the API endpoint to generate image with a longer timeout
    const response = await axios.post(`/api/actors/${actorId}/generate-images/${type}`, {}, {
      timeout: 120000 // 2 minutes timeout
    });

    // Update the form with new image
    if (type === 'avatar') {
      basicInfo.value.avatarImage = response.data;
    } else {
      basicInfo.value.tokenImage = response.data;
    }

  } catch (err) {
    console.error('Failed to generate image:', err);
    if (err instanceof Error) {
      error.value = `Error generating ${type}: ${err.message}`;
    } else {
      error.value = `An unknown error occurred while generating ${type}`;
    }
  } finally {
    isGenerating.value = false;
  }
}

// Handle form submission
async function handleSubmit(event: Event) {
  try {
    event.preventDefault();
    isSubmitting.value = true;
    const actorId = route.params.id as string;

    // Prepare a FormData object for submission
    const formData = new FormData();
    
    // Add basic actor data
    formData.append('name', basicInfo.value.name);
    
    if (basicInfo.value.description) {
      formData.append('description', basicInfo.value.description);
    }
    
    // Add avatar and token files if they are new File objects
    if (basicInfo.value.avatarImage instanceof File) {
      formData.append('avatar', basicInfo.value.avatarImage);
    }
    
    if (basicInfo.value.tokenImage instanceof File) {
      formData.append('token', basicInfo.value.tokenImage);
    }
    
    // Send the request
    await axios.patch(`/api/actors/${actorId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    // Navigate back to the character sheet
    router.push({ name: 'character-sheet', params: { id: actorId } });
  } catch (err) {
    console.error('Failed to update actor:', err);
    if (err instanceof Error) {
      error.value = `Error updating actor: ${err.message}`;
    } else {
      error.value = 'An unknown error occurred while updating the actor';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <div class="bg-white rounded-lg shadow-md p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Edit Character</h1>
      
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center p-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
      
      <!-- Error State -->
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
      
      <!-- Edit Form -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-6" enctype="multipart/form-data">
        <!-- Name -->
        <div class="form-group">
          <label for="name" class="block text-sm font-medium text-gray-700">Character Name</label>
          <input 
            type="text" 
            id="name" 
            v-model="basicInfo.name" 
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
        </div>

        <!-- Description -->
        <div class="form-group">
          <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
          <textarea 
            id="description" 
            v-model="basicInfo.description" 
            rows="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          ></textarea>
        </div>

        <!-- Images -->
        <div class="space-y-4">
          <h3 class="text-lg font-medium text-gray-900">Character Images</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="form-group space-y-4">
              <label class="block text-sm font-medium text-gray-700">Avatar</label>
              <ImageUpload
                v-model="basicInfo.avatarImage"
                type="avatar"
              />
              <div class="flex flex-col space-y-2">
                <div v-if="basicInfo.avatarImage" class="text-xs text-gray-500">
                  {{ typeof basicInfo.avatarImage === 'object' && 'lastModified' in basicInfo.avatarImage ? 'New file selected' : 'Current image' }}
                </div>
                <button
                  type="button"
                  @click="generateNewImage('avatar')"
                  :disabled="isGeneratingAvatar"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <svg v-if="isGeneratingAvatar" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <svg v-else class="-ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                  {{ isGeneratingAvatar ? 'Generating Avatar...' : 'Generate New Avatar with AI' }}
                </button>
              </div>
            </div>
            
            <div class="form-group space-y-4">
              <label class="block text-sm font-medium text-gray-700">Token</label>
              <ImageUpload
                v-model="basicInfo.tokenImage"
                type="token"
              />
              <div class="flex flex-col space-y-2">
                <div v-if="basicInfo.tokenImage" class="text-xs text-gray-500">
                  {{ typeof basicInfo.tokenImage === 'object' && 'lastModified' in basicInfo.tokenImage ? 'New file selected' : 'Current image' }}
                </div>
                <button
                  type="button"
                  @click="generateNewImage('token')"
                  :disabled="isGeneratingToken"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <svg v-if="isGeneratingToken" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <svg v-else class="-ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                  {{ isGeneratingToken ? 'Generating Token...' : 'Generate New Token with AI' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            @click="router.back()"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-group {
  margin-bottom: 1.5rem;
}
</style> 