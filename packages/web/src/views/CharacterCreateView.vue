<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useActorStore } from '../stores/actor.store.mjs';
import PluginUIContainer from '@/components/plugin/PluginUIContainer.vue';
import { pluginRegistry } from '@/services/plugin-registry.service.mjs';
import ImageUpload from '../components/common/ImageUpload.vue';
import { IGameSystemPluginWeb } from '@dungeon-lab/shared/types/plugin.mjs';
import { ActorsClient } from '@dungeon-lab/client/index.mjs';
import { CreateActorRequest } from '@dungeon-lab/shared/types/api/index.mjs';

interface UploadedImage {
  url: string;
  objectKey?: string;
  path?: string;
  size?: number;
  type?: string;
}

const actorClient = new ActorsClient();
const router = useRouter();
const actorStore = useActorStore();
const activeGameSystemId = ref<string>(localStorage.getItem('activeGameSystem') || '');
const isLoading = ref(true);
const error = ref<string | null>(null);
const plugin = ref<IGameSystemPluginWeb | null>(null);
// Step management
const currentStep = ref(1);
const isSubmitting = ref(false);

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
function getUrlFromImageObject(imageObj: File | UploadedImage | null): string | null {
  if (!imageObj) return null;

  if (imageObj instanceof File) {
    // No need to return a URL - when we submit we'll upload the file
    return null;
  } else if ('url' in imageObj) {
    // It's an UploadedImage - use its URL
    return imageObj.url;
  }

  return null;
}

// Combined data to pass to plugin
const combinedInitialData = computed(() => {
  return {
    name: basicInfo.value.name,
    avatarUrl: getUrlFromImageObject(basicInfo.value.avatarImage),
    tokenUrl: getUrlFromImageObject(basicInfo.value.tokenImage),
  };
});

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
    plugin.value = pluginRegistry.getGameSystemPlugin(activeGameSystemId.value) as IGameSystemPluginWeb;
    
    if (!plugin.value) {
      console.log('Plugin not found in registry, attempting to load it...');
      // Initialize plugin registry and load the plugin if it's not already loaded
      await pluginRegistry.initialize();
      plugin.value = await pluginRegistry.loadGameSystemPlugin(activeGameSystemId.value) as IGameSystemPluginWeb;
    }

    if (!plugin.value) {
      error.value = `Plugin ${activeGameSystemId.value} not found`;
      isLoading.value = false;
      return;
    }

    console.log('Plugin loaded successfully:', plugin.value.config.name);
  } catch (err) {
    console.error('Failed to load plugin:', err);
    error.value = `Failed to load plugin ${activeGameSystemId.value}`;
  } finally {
    isLoading.value = false;
  }
});

// Handle form submission
async function handleSubmit(event: Event) {
  try {
    isSubmitting.value = true;

    // Check if plugin is available
    if (!plugin.value) return;

    // Get the form data
    const form = event.target as HTMLFormElement;
    // Get the plugin component instance
    const pluginComponent = plugin.value.loadComponent('characterCreation');
    if (!pluginComponent) {
      console.error('Plugin component not found');
      return;
    }

    // Validate form data
    const validation = pluginComponent.validateForm(form);
    if (!validation.success) {
      console.error('Form validation failed:', validation.error);
      error.value = `Validation error: ${validation.error.message}`;
      return;
    }

    // Translate form data to character schema format
    console.log('Validation data:', validation.data);
    const pluginData = pluginComponent.translateFormData(validation.data) as Record<string, unknown>;
    console.log('Plugin data:', pluginData);

    // Create a proper actor request object
    const actorData: CreateActorRequest = {
      name: basicInfo.value.name,
      type: 'character',
      gameSystemId: plugin.value.config.id,
      data: pluginData,
      description: basicInfo.value.description || undefined,
      avatar: basicInfo.value.avatarImage instanceof File ? basicInfo.value.avatarImage : undefined,
      token: basicInfo.value.tokenImage instanceof File ? basicInfo.value.tokenImage : undefined
    };

    // Send the request using actorClient
    const response = await actorClient.createActor(actorData);
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

function handleError(errorMessage: string) {
  error.value = errorMessage;
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <div class="bg-stone dark:bg-stone-700 rounded-lg shadow-xl border border-stone-300 dark:border-stone-600 p-6">
      <h1 class="text-2xl font-bold text-dragon mb-6">Create New Character</h1>

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
        <!-- Step Indicator -->
        <div class="mb-6">
          <div class="flex items-center">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center"
              :class="currentStep === 1 ? 'bg-dragon text-white' : 'bg-stone-200 text-stone-700 dark:bg-stone-600 dark:text-stone-200'"
            >
              1
            </div>
            <div
              class="flex-1 h-1 mx-2"
              :class="currentStep === 1 ? 'bg-stone-200 dark:bg-stone-600' : 'bg-dragon'"
            ></div>
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center"
              :class="currentStep === 2 ? 'bg-dragon text-white' : 'bg-stone-200 text-stone-700 dark:bg-stone-600 dark:text-stone-200'"
            >
              2
            </div>
          </div>
          <div class="flex justify-between mt-2 text-sm">
            <span>Basic Information</span>
            <span>Character Details</span>
          </div>
        </div>

        <!-- Single Form -->
        <form
          @submit.prevent="handleSubmit"
          class="character-create-form"
          enctype="multipart/form-data"
        >
          <!-- Step 1: Basic Info -->
          <div v-show="currentStep === 1" class="form-step">
            <h2>Basic Information</h2>
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

            <!-- Navigation for Step 1 only -->
            <div class="form-navigation">
              <div></div>
              <!-- Empty div for flex spacing -->
              <button
                type="button"
                @click="currentStep++"
                class="btn btn-primary"
                :disabled="!canProceed"
              >
                Next: Character Details
              </button>
            </div>
          </div>

          <!-- Step 2: Plugin Content -->
          <div v-show="currentStep === 2" class="form-step">
            <h2>Character Details</h2>
            <PluginUIContainer
              :plugin-id="activeGameSystemId"
              :component-id="'characterCreation'"
              :initial-data="combinedInitialData"
              @error="handleError"
            />
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.character-create-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.character-create-form {
  background: rgb(var(--bg-card));
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  background-color: #4299e1;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background-color: #3182ce;
}
</style>
