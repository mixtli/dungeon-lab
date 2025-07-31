<script setup lang="ts">
import { ref, computed, onMounted, watch, markRaw } from 'vue';
import { useRouter } from 'vue-router';
import { useActorStore } from '../stores/actor.store.mjs';
import { pluginRegistry } from '@/services/plugin-registry.mts';
import ImageUpload from '../components/common/ImageUpload.vue';
import type { GameSystemPlugin } from '@dungeon-lab/shared/types/plugin.mjs';
import { DocumentsClient, AssetsClient } from '@dungeon-lab/client/index.mjs';
import { CreateDocumentRequest } from '@dungeon-lab/shared/types/api/index.mjs';

interface UploadedImage {
  url: string;
  objectKey?: string;
  path?: string;
  size?: number;
  type?: string;
}

const documentsClient = new DocumentsClient();
const assetsClient = new AssetsClient();
const router = useRouter();
const actorStore = useActorStore();
const activeGameSystemId = ref<string>(localStorage.getItem('activeGameSystem') || '');
const isLoading = ref(true);
const error = ref<string | null>(null);
const plugin = ref<GameSystemPlugin | null>(null);
// Step management
const currentStep = ref(1);
const isSubmitting = ref(false);

// Plugin component loading
const pluginComponent = ref<any>(null);
const pluginComponentError = ref<string | null>(null);
const pluginData = ref<any>(null);

// Basic info form data - can now handle both File objects and UploadedImage objects
const basicInfo = ref({
  name: '',
  description: '',
  avatarImage: null as File | UploadedImage | null,
  tokenImage: null as File | UploadedImage | null,
});

// Watch for changes to avatar and token images
watch(
  () => basicInfo.value.avatarImage,
  newValue => {
    console.log('Avatar image changed:', newValue);
    if (newValue instanceof File) {
      console.log('Avatar is a File object');
    } else if (newValue && typeof newValue === 'object' && 'url' in newValue) {
      console.log('Avatar is an UploadedImage object with URL:', newValue.url);
    }
  },
  { deep: true }
);

watch(
  () => basicInfo.value.tokenImage,
  newValue => {
    console.log('Token image changed:', newValue);
    if (newValue instanceof File) {
      console.log('Token is a File object');
    } else if (newValue && typeof newValue === 'object' && 'url' in newValue) {
      console.log('Token is an UploadedImage object with URL:', newValue.url);
    }
  },
  { deep: true }
);

// Get a url from either a File or UploadedImage
// function getUrlFromImageObject(imageObj: File | UploadedImage | null): string | null {
//   if (!imageObj) return null;

//   if (imageObj instanceof File) {
//     // No need to return a URL - when we submit we'll upload the file
//     return null;
//   } else if ('url' in imageObj) {
//     // It's an UploadedImage - use its URL
//     return imageObj.url;
//   }

//   return null;
// }

// Combined data to pass to plugin
// Removed unused combinedInitialData computed

const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return basicInfo.value.name.trim() !== '';
  }
  return true;
});

onMounted(async () => {
  // Debug information
  console.log('Character Create View mounted');
  console.log('Active game system ID:', activeGameSystemId.value);

  // Check if we have an active game system
  if (!activeGameSystemId.value) {
    error.value =
      'No active game system selected. Please select a game system in the Settings page.';
    isLoading.value = false;
    return;
  }

  try {
    // Try to get the plugin from the registry first
    plugin.value = pluginRegistry.getGameSystemPlugin(activeGameSystemId.value) as GameSystemPlugin;
    
    if (!plugin.value) {
      console.log('Plugin not found in registry, attempting to load it...');
      // Initialize plugin registry and load the plugin if it's not already loaded
      await pluginRegistry.initialize();
      plugin.value = await pluginRegistry.loadGameSystemPlugin(activeGameSystemId.value) as GameSystemPlugin;
    }

    if (!plugin.value) {
      error.value = `Plugin ${activeGameSystemId.value} not found`;
      isLoading.value = false;
      return;
    }

    console.log('Plugin loaded successfully:', plugin.value.name);
    
    // Load the character creator component
    await loadCharacterCreatorComponent();
  } catch (err) {
    console.error('Failed to load plugin:', err);
    error.value = `Failed to load plugin ${activeGameSystemId.value}`;
  } finally {
    isLoading.value = false;
  }
});

// Load the character creator component from the plugin
async function loadCharacterCreatorComponent() {
  try {
    if (!activeGameSystemId.value) {
      pluginComponentError.value = 'No active game system selected';
      return;
    }

    console.log('Loading character creator component for:', activeGameSystemId.value);
    
    // Get the character creator component from the plugin registry
    const component = await pluginRegistry.getComponent(
      activeGameSystemId.value, 
      'character-creator'
    );
    
    if (component) {
      pluginComponent.value = markRaw(component);
      console.log('Character creator component loaded successfully');
    } else {
      console.warn('No character creator component found for game system:', activeGameSystemId.value);
      pluginComponentError.value = `No character creator available for ${activeGameSystemId.value}`;
    }
  } catch (err) {
    console.error('Failed to load character creator component:', err);
    pluginComponentError.value = 'Failed to load character creator component';
  }
}

// Plugin component event handlers
function handleCharacterReady(characterData: any) {
  console.log('Character ready from plugin:', characterData);
  pluginData.value = characterData;
  
  // Proceed to create the character
  handleSubmit();
}

function handleBackToBasics() {
  console.log('Back to basics requested');
  currentStep.value = 1;
}

function handleValidationChange(isValid: boolean) {
  console.log('Plugin validation changed:', isValid);
  // Could update UI to show/hide navigation buttons
}

function handleNext() {
  if (currentStep.value === 1 && canProceed.value) {
    currentStep.value = 2;
  }
}

// Handle form submission
async function handleSubmit() {
  try {
    isSubmitting.value = true;

    // Check if plugin is available
    if (!plugin.value) return;

    // Upload images first if they exist
    let avatarAssetId: string | undefined;
    let tokenAssetId: string | undefined;

    if (basicInfo.value.avatarImage instanceof File) {
      try {
        const formData = new FormData();
        formData.append('file', basicInfo.value.avatarImage);
        const avatarAsset = await assetsClient.uploadAsset(formData);
        avatarAssetId = avatarAsset.id;
      } catch (err) {
        console.warn('Failed to upload avatar image:', err);
      }
    }

    if (basicInfo.value.tokenImage instanceof File) {
      try {
        const formData = new FormData();
        formData.append('file', basicInfo.value.tokenImage);
        const tokenAsset = await assetsClient.uploadAsset(formData);
        tokenAssetId = tokenAsset.id;
      } catch (err) {
        console.warn('Failed to upload token image:', err);
      }
    }

    // Use plugin data if available, otherwise fallback to basic info
    const finalPluginData = pluginData.value || {
      name: basicInfo.value.name,
      description: basicInfo.value.description
    };

    // Add asset IDs to plugin data if we have them
    if (avatarAssetId || tokenAssetId) {
      finalPluginData.avatarImage = avatarAssetId;
      finalPluginData.tokenImage = tokenAssetId;
    }

    // Create a proper document request object
    const documentData: CreateDocumentRequest = {
      name: basicInfo.value.name,
      userData: {},
      pluginId: plugin.value.id,
      pluginData: finalPluginData,
      documentType: 'character' as const,
      pluginDocumentType: 'character',
      description: basicInfo.value.description || undefined
    };

    // Send the request using documentsClient
    const response = await documentsClient.createDocument(documentData);
    sessionStorage.removeItem('actorCreationState');

    // Set current actor in the store if created successfully
    if (response && response.id) {
      await actorStore.setCurrentActor(response.id);
    }

    // Navigate to the character sheet
    if (response) {
      router.push({ name: 'character-sheet', params: { id: response.id } });
    } else {
      error.value = 'Failed to create character: No response data';
    }
  } catch (err) {
    console.error('Failed to create character:', err);
    if (err instanceof Error) {
      error.value = `Error creating character: ${err.message}`;
    } else {
      error.value = 'An unknown error occurred while creating the character';
    }
  } finally {
    isSubmitting.value = false;
    isLoading.value = false;
  }
}

// Removed unused handleError function
</script>

<template>
  <div class="character-create-container">
    <!-- Loading & Error States -->
    <div v-if="isLoading" class="flex justify-center items-center p-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-dragon"></div>
    </div>

    <div v-else-if="error" class="bg-error-50 border border-error-200 rounded-md p-4 mb-6 dark:bg-error-900 dark:border-error-700">
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
          <p class="text-sm text-error-700 dark:text-error-200">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- No Active Game System -->
    <div v-else-if="!activeGameSystemId" class="text-center py-6">
      <p class="text-onyx dark:text-parchment mb-4">
        You need to select an active game system before creating a character.
      </p>
      <button
        @click="router.push('/settings')"
        class="btn btn-primary"
      >
        Go to Settings
      </button>
    </div>

    <!-- Character Creation Steps -->
    <div v-else-if="plugin">
      <!-- Step 1: Basic Info -->
      <div v-show="currentStep === 1" class="character-create-form">
        <h2 class="text-3xl font-bold text-center text-dragon dark:text-dragon-400 mb-8">Basic Information</h2>
        <div class="form-group">
          <label for="name">Character Name</label>
          <input
            type="text"
            id="name"
            v-model="basicInfo.name"
            name="name"
            required
            class="form-input"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
          <div class="form-group">
            <label class="block text-sm font-medium text-onyx dark:text-parchment mb-2">Avatar</label>
            <ImageUpload v-model="basicInfo.avatarImage" type="avatar" />
            <div v-if="basicInfo.avatarImage" class="mt-1 text-xs text-ash dark:text-stone-300">
              {{
                typeof basicInfo.avatarImage === 'object' &&
                'lastModified' in basicInfo.avatarImage
                  ? 'File selected'
                  : 'Image uploaded'
              }}
            </div>
          </div>

          <div class="form-group">
            <label class="block text-sm font-medium text-onyx dark:text-parchment mb-2">Token</label>
            <ImageUpload v-model="basicInfo.tokenImage" type="token" />
            <div v-if="basicInfo.tokenImage" class="mt-1 text-xs text-ash dark:text-stone-300">
              {{
                typeof basicInfo.tokenImage === 'object' &&
                'lastModified' in basicInfo.tokenImage
                  ? 'File selected'
                  : 'Image uploaded'
              }}
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            v-model="basicInfo.description"
            class="form-textarea"
          ></textarea>
        </div>

        <!-- Navigation for Step 1 -->
        <div class="form-navigation">
          <div></div>
          <button
            type="button"
            @click="handleNext"
            class="btn btn-primary"
            :disabled="!canProceed"
          >
            Next: Character Details
          </button>
        </div>
      </div>

      <!-- Step 2: Plugin Content -->
      <div v-show="currentStep === 2" class="character-create-form">
        <!-- Plugin Component Error -->
        <div v-if="pluginComponentError" class="bg-error-50 border border-error-200 rounded-md p-4 mb-6 dark:bg-error-900 dark:border-error-700">
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
              <p class="text-sm text-error-700 dark:text-error-200">{{ pluginComponentError }}</p>
            </div>
          </div>
        </div>

        <!-- Dynamic Plugin Component -->
        <component
          v-else-if="pluginComponent"
          :is="pluginComponent"
          :basic-info="basicInfo"
          :readonly="isSubmitting"
          @character-ready="handleCharacterReady"
          @back-to-basics="handleBackToBasics"
          @validation-change="handleValidationChange"
        />

        <!-- Fallback for missing plugin component -->
        <div v-else class="text-center text-gray-500 py-8">
          <div class="mb-4">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Character Creator Not Available
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-4">
            The selected game system doesn't have a character creator component.
          </p>
          <div class="flex justify-center space-x-4">
            <button
              type="button"
              @click="currentStep = 1"
              class="btn btn-secondary"
            >
              Back to Basic Info
            </button>
            <button
              type="button"
              @click="handleSubmit"
              class="btn btn-primary"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? 'Creating...' : 'Create Character' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Mobile-first responsive container */
.character-create-container {
  max-width: 1024px;
  margin: 0 auto;
  padding: 1.5rem;
}

/* Remove all margins and padding on mobile */
@media (max-width: 768px) {
  .character-create-container {
    max-width: none;
    margin: 0;
    padding: 0;
  }
}

.character-create-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

@media (max-width: 768px) {
  .character-create-view {
    max-width: none;
    margin: 0;
    padding: 1rem;
  }
}

.character-create-form {
  background: rgb(var(--bg-card));
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .character-create-form {
    padding: 1rem;
    border-radius: 0;
    box-shadow: none;
  }
}

.form-step {
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: rgb(var(--text-primary));
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid rgb(var(--border-primary));
  border-radius: 0.25rem;
  background-color: rgb(var(--bg-primary));
  color: rgb(var(--text-primary));
}

.form-textarea {
  min-height: 100px;
  resize: vertical;
}

.form-navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid rgb(var(--border-primary));
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: rgb(var(--dragon));
  color: rgb(var(--parchment));
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background-color: rgb(var(--dragon-600));
}

.btn-secondary {
  background-color: rgb(var(--ash));
  color: rgb(var(--parchment));
  border: none;
}

.btn-secondary:hover:not(:disabled) {
  background-color: rgb(var(--ash) / 0.8);
}
</style>
