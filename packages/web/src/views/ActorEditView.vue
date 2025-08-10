# Create a new file for editing basic actor data
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import ImageUpload from '../components/common/ImageUpload.vue';
import { ActorsClient } from '@dungeon-lab/client/index.mjs';
import { type IAsset } from '@dungeon-lab/shared/types/index.mjs';

const actorClient = new ActorsClient();

interface UploadedImage {
  url: string;
  objectKey?: string;
  path?: string;
  size?: number;
  type?: string;
}

const router = useRouter();
const route = useRoute();
const isLoading = ref(true);
const error = ref<string | null>(null);
const isSubmitting = ref(false);
const isGeneratingToken = ref(false);

// Basic info form data (actors only have tokens, not avatars)
const basicInfo = ref({
  name: '',
  description: '',
  tokenImage: null as File | UploadedImage | null,
});

onMounted(async () => {
  try {
    const actorId = route.params.id as string;
    if (!actorId) {
      error.value = 'No actor ID provided';
      return;
    }

    // Fetch actor data
    const actor = await actorClient.getActor(actorId);
    if (!actor) {
      error.value = 'Actor not found';
      return;
    }

    // Set form data (actors only have token images)
    basicInfo.value = {
      name: actor.name || '',
      description: actor.description || '',
      tokenImage: actor.tokenImageId
        ? {
            url: (actor.tokenImageId as unknown as IAsset).url,
            path: (actor.tokenImageId as unknown as IAsset).path,
            size: (actor.tokenImageId as unknown as IAsset).size,
            type: (actor.tokenImageId as unknown as IAsset).type,
          }
        : null,
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

// Generate new token image using AI (actors only support tokens, not avatars)
async function generateNewTokenImage() {
  const actorId = route.params.id as string;
  isGeneratingToken.value = true;
  
  try {
    error.value = null;
    
    const updatedActor = await actorClient.generateActorToken(actorId);
    if (updatedActor && updatedActor.tokenImageId) {
      basicInfo.value.tokenImage = {
        url: (updatedActor.tokenImageId as unknown as IAsset).url,
        path: (updatedActor.tokenImageId as unknown as IAsset).path,
        size: (updatedActor.tokenImageId as unknown as IAsset).size,
        type: (updatedActor.tokenImageId as unknown as IAsset).type,
      };
    }
  } catch (err) {
    console.error('Failed to generate token:', err);
    if (err instanceof Error) {
      error.value = `Error generating token: ${err.message}`;
    } else {
      error.value = 'An unknown error occurred while generating token';
    }
  } finally {
    isGeneratingToken.value = false;
  }
}

// Handle form submission
async function handleSubmit(event: Event) {
  try {
    event.preventDefault();
    isSubmitting.value = true;
    const actorId = route.params.id as string;

    // Prepare the update request (actors only support tokens, not avatars)
    const updateData = {
      name: basicInfo.value.name,
      description: basicInfo.value.description,
      tokenImage: basicInfo.value.tokenImage instanceof File ? basicInfo.value.tokenImage : undefined,
      // Add required fields from the existing actor
      userData: {},
      pluginId: 'dnd-5e-2024', // Hardcode for now - ideally would get from the actual actor
      pluginData: {},
      itemState: {}, // Required property
      documentType: 'actor' as const,
      pluginDocumentType: 'character',
    };

    // Send the request
    await actorClient.putActor(actorId, updateData);

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
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Edit Actor</h1>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center p-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg
              class="h-5 w-5 text-red-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
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
          <label for="name" class="block text-sm font-medium text-gray-700">Actor Name</label>
          <input
            type="text"
            id="name"
            v-model="basicInfo.name"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <!-- Description -->
        <div class="form-group">
          <label for="description" class="block text-sm font-medium text-gray-700"
            >Description</label
          >
          <textarea
            id="description"
            v-model="basicInfo.description"
            rows="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          ></textarea>
        </div>

        <!-- Token Image (Actors only support tokens, not avatars) -->
        <div class="space-y-4">
          <h3 class="text-lg font-medium text-gray-900">Actor Token</h3>
          
          <div class="form-group space-y-4">
            <label class="block text-sm font-medium text-gray-700">Token Image</label>
            <ImageUpload v-model="basicInfo.tokenImage" type="token" />
            <div class="flex flex-col space-y-2">
              <div v-if="basicInfo.tokenImage" class="text-xs text-gray-500">
                {{
                  typeof basicInfo.tokenImage === 'object' &&
                  'lastModified' in basicInfo.tokenImage
                    ? 'New file selected'
                    : 'Current image'
                }}
              </div>
              <button
                type="button"
                @click="generateNewTokenImage"
                :disabled="isGeneratingToken"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <svg
                  v-if="isGeneratingToken"
                  class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <svg
                  v-else
                  class="-ml-1 mr-2 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                  />
                </svg>
                {{ isGeneratingToken ? 'Generating Token...' : 'Generate New Token with AI' }}
              </button>
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
