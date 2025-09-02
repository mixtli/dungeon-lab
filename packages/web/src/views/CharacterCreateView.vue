<script setup lang="ts">
import { ref, computed, onMounted, markRaw } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStateStore } from '../stores/game-state.store.mjs';
import { useSocketStore } from '../stores/socket.store.mjs';
import { pluginRegistry } from '../services/plugin-registry.mts';
import ImageUpload from '../components/common/ImageUpload.vue';
import type { GameSystemPlugin } from '@dungeon-lab/shared-ui/types/plugin.mjs';
import { DocumentsClient, AssetsClient, CharactersClient } from '@dungeon-lab/client/index.mjs';
import { CreateDocumentRequest } from '@dungeon-lab/shared/types/api/index.mjs';
import { characterCreateSchema } from '@dungeon-lab/shared/schemas/index.mjs';

interface UploadedImage {
  url: string;
  objectKey?: string;
  path?: string;
  size?: number;
  type?: string;
}

const documentsClient = new DocumentsClient();
const assetsClient = new AssetsClient();
const charactersClient = new CharactersClient();
const router = useRouter();
const gameStateStore = useGameStateStore();
const socketStore = useSocketStore();
const activeGameSystemId = ref<string>(localStorage.getItem('activeGameSystem') || '');
const isLoading = ref(true);
const error = ref<string | null>(null);
const plugin = ref<GameSystemPlugin | null>(null);
// Step management
const currentStep = ref(1);
const isSubmitting = ref(false);

// Plugin component loading
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pluginComponent = ref<any>(null);
const pluginComponentError = ref<string | null>(null);
// const pluginData = ref<any>(null); // Currently unused

// Basic info form data - can now handle both File objects and UploadedImage objects
const basicInfo = ref({
  name: '',
  description: '',
  avatarImage: null as File | UploadedImage | null,
  tokenImage: null as File | UploadedImage | null,
});


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
      // Initialize plugin registry and load the plugin if it's not already loaded  
      // Note: The registry should already be initialized in main.mts, but let's ensure plugin is loaded
      plugin.value = await pluginRegistry.loadPlugin(activeGameSystemId.value) as GameSystemPlugin;
    }

    if (!plugin.value) {
      error.value = `Plugin ${activeGameSystemId.value} not found`;
      isLoading.value = false;
      return;
    }

    
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

    
    // Get the character creator component from the plugin registry
    const component = await pluginRegistry.getComponent(
      activeGameSystemId.value, 
      'character-creator'
    );
    
    if (component) {
      pluginComponent.value = markRaw(component);
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCharacterReady(preparedData: any) {
  
  try {
    isSubmitting.value = true;
    
    // Extract character data and items data from plugin response
    const { characterData, itemsData } = preparedData;
    
    // Check if this is already a created document (has an id)
    if (characterData?.id) {
      
      // Clear session storage
      sessionStorage.removeItem('actorCreationState');
      
      // Set current character in the game state store
      gameStateStore.selectedCharacter = characterData;
      
      // Navigate to the character sheet
      router.push({ name: 'character-sheet', params: { id: characterData.id } });
      return;
    }
    
    // Upload images if they are File objects and get asset IDs
    let avatarAssetId: string | undefined;
    let tokenAssetId: string | undefined;
    
    if (basicInfo.value.avatarImage instanceof File) {
      const formData = new FormData();
      formData.append('file', basicInfo.value.avatarImage);
      const avatarAsset = await assetsClient.uploadAsset(formData);
      avatarAssetId = avatarAsset.id;
    }
    
    if (basicInfo.value.tokenImage instanceof File) {
      const formData = new FormData();
      formData.append('file', basicInfo.value.tokenImage);
      const tokenAsset = await assetsClient.uploadAsset(formData);
      tokenAssetId = tokenAsset.id;
    }
    
    // Create the character document using extracted character data
    
    // Calculate imageId based on avatar/token priority
    let imageId: string | undefined;
    if (avatarAssetId) {
      imageId = avatarAssetId;
    } else if (tokenAssetId) {
      imageId = tokenAssetId;
    }
    
    const finalDocumentData = {
      ...characterData,
      ...(avatarAssetId && { avatarId: avatarAssetId }),
      ...(tokenAssetId && { tokenImageId: tokenAssetId }),
      ...(imageId && { imageId })
    };
    
    // Validate character data using schema
    const validationResult = characterCreateSchema.safeParse(finalDocumentData);
    if (!validationResult.success) {
      console.error('Character validation failed:', validationResult.error.issues);
      error.value = `Character validation failed: ${validationResult.error.issues.map(issue => issue.message).join(', ')}`;
      return;
    }
    
    // Save the validated character document
    const response = await documentsClient.createDocument(finalDocumentData);
    
    // Create item documents if character was created successfully
    if (response?.id && itemsData && Array.isArray(itemsData)) {
      for (const itemData of itemsData) {
        try {
          const itemDocumentData = {
            ...itemData,
            ownerId: socketStore.userId, // Set the current user as owner
            carrierId: response.id // Set the character as carrier of the item
          };
          
          await documentsClient.createDocument(itemDocumentData);
        } catch (itemError) {
          console.error('Failed to create item document:', itemError);
          // Continue with other items even if one fails
        }
      }
    }
    
    sessionStorage.removeItem('actorCreationState');

    // Set current character in the game state store if created successfully
    if (response && response.id && response.documentType === 'character') {
      gameStateStore.selectedCharacter = response;
      
      // Schedule automatic image generation if user didn't provide images
      try {
        if (!basicInfo.value.avatarImage) {
          console.log('Scheduling avatar generation for character', response.id);
          await charactersClient.generateAvatar(response.id);
        }
        
        if (!basicInfo.value.tokenImage) {
          console.log('Scheduling token generation for character', response.id);
          await charactersClient.generateToken(response.id);
        }
      } catch (imageError) {
        console.error('Failed to schedule image generation:', imageError);
        // Don't block character creation if image generation fails
      }
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

function handleBackToBasics() {
  currentStep.value = 1;
}

function handleValidationChange() {
  // Could update UI to show/hide navigation buttons
}

function handleNext() {
  if (currentStep.value === 1 && canProceed.value) {
    currentStep.value = 2;
  }
}

// Legacy handleSubmit - now handled by handleCharacterReady directly
// This function is now only used when plugin component is missing
async function handleSubmit() {
  try {
    isSubmitting.value = true;

    // Check if plugin is available
    if (!plugin.value) return;

    // Create basic document when no plugin component is available
    const documentData: CreateDocumentRequest = {
      name: basicInfo.value.name,
      userData: {},
      pluginId: plugin.value.manifest.id,
      pluginData: {
        name: basicInfo.value.name,
        description: basicInfo.value.description
      },
      itemState: {}, // Required property for document creation
      state: {}, // Required property for document creation
      documentType: 'character' as const,
      pluginDocumentType: 'character',
      description: basicInfo.value.description || undefined
    };

    // Send the request using documentsClient
    const response = await documentsClient.createDocument(documentData);
    sessionStorage.removeItem('actorCreationState');

    // Set current character in the game state store if created successfully
    if (response && response.id && response.documentType === 'character') {
      gameStateStore.selectedCharacter = response;
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
        <h2 class="text-3xl font-heading font-bold text-center mb-8" style="color: rgb(255, 80, 80); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);">Basic Information</h2>
        <div class="form-group">
          <label for="name" class="form-label">Character Name</label>
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
            <label class="form-label">Avatar</label>
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
            <label class="form-label">Token</label>
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
          <label for="description" class="form-label">Description</label>
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

.form-label {
  display: block;
  margin-bottom: 0.75rem;
  font-family: 'MedievalSharp', cursive;
  font-weight: 600;
  font-size: 1.125rem;
  color: rgb(255 80 80) !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid rgb(var(--border-primary));
  border-radius: 0.375rem;
  background-color: white !important;
  color: rgb(var(--text-primary));
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: rgb(139 30 30);
  box-shadow: 0 0 0 3px rgba(139 30 30, 0.1);
}

/* Nuclear option: maximum specificity for text inputs */
.dark .character-create-form .form-group input[type="text"].form-input,
.dark .character-create-form input[type="text"],
.dark .form-group input[type="text"].form-input,
.dark input[type="text"].form-input,
.dark .form-input,
.dark .form-textarea {
  background-color: rgb(10, 10, 10) !important;
  color: rgb(245 241 232) !important;
  border-color: rgb(75 75 75) !important;
}

.dark .form-input:focus,
.dark .form-textarea:focus {
  border-color: rgb(139 30 30);
  box-shadow: 0 0 0 3px rgba(139 30 30, 0.1);
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
