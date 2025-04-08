<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useActorStore } from '../stores/actor.mts';
import PluginUIContainer from '@/components/plugin/PluginUIContainer.vue';
import { pluginRegistry } from '@/services/plugin-registry.service.mjs';
import ImageUpload from '../components/common/ImageUpload.vue';
import { IGameSystemPluginWeb } from '@dungeon-lab/shared/types/plugin.mjs';
import { IActorCreateData } from '@dungeon-lab/shared/schemas/actor.schema.mts';

interface UploadedImage {
  url: string;
  objectKey?: string;
  path?: string;
  size?: number;
  type?: string;
}

const router = useRouter();
const actorStore = useActorStore();
const activeGameSystemId = ref<string>(localStorage.getItem('activeGameSystem') || '');
const isLoading = ref(true);
const error = ref<string | null>(null);

const plugin = pluginRegistry.getGameSystemPlugin(activeGameSystemId.value) as IGameSystemPluginWeb;
// Step management
const currentStep = ref(1);
const isSubmitting = ref(false);

// Basic info form data - can now handle both File objects and UploadedImage objects
const basicInfo = ref({
  name: '',
  description: '',
  avatarImage: null as File | UploadedImage | null,
  tokenImage: null as File | UploadedImage | null
});

// Watch for changes to avatar and token images
watch(() => basicInfo.value.avatarImage, (newValue) => {
  console.log('Avatar image changed:', newValue);
  if (newValue instanceof File) {
    console.log('Avatar is a File object');
  } else if (newValue && typeof newValue === 'object' && 'url' in newValue) {
    console.log('Avatar is an UploadedImage object with URL:', newValue.url);
  }
}, { deep: true });

watch(() => basicInfo.value.tokenImage, (newValue) => {
  console.log('Token image changed:', newValue);
  if (newValue instanceof File) {
    console.log('Token is a File object');
  } else if (newValue && typeof newValue === 'object' && 'url' in newValue) {
    console.log('Token is an UploadedImage object with URL:', newValue.url);
  }
}, { deep: true });

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
    error.value = 'No active game system selected. Please select a game system in the Settings page.';
    isLoading.value = false;
    return;
  }
  isLoading.value = false;
});


// Handle form submission
async function handleSubmit(event: Event) {
  try {
    isSubmitting.value = true;
    
    // Check if plugin is available
    if (!plugin || !actorStore) return;

    // Get the form data
    const form = event.target as HTMLFormElement;
    // Get the plugin component instance
    const pluginComponent = plugin.loadComponent('characterCreation');
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
    const pluginData = pluginComponent.translateFormData(validation.data);

    // Extract image URLs (if any already uploaded images)
    let avatarUrl: string | undefined = undefined;
    let tokenUrl: string | undefined = undefined;

    // If image is an UploadedImage object with a URL, use that
    if (basicInfo.value.avatarImage && typeof basicInfo.value.avatarImage === 'object' && 'url' in basicInfo.value.avatarImage) {
      avatarUrl = basicInfo.value.avatarImage.url;
    }

    if (basicInfo.value.tokenImage && typeof basicInfo.value.tokenImage === 'object' && 'url' in basicInfo.value.tokenImage) {
      tokenUrl = basicInfo.value.tokenImage.url;
    }

    // Only handle File objects here - we'll need to upload them first
    const avatarFile = basicInfo.value.avatarImage instanceof File ? basicInfo.value.avatarImage : null;
    const tokenFile = basicInfo.value.tokenImage instanceof File ? basicInfo.value.tokenImage : null;

    // Create actor data
    const actorData: IActorCreateData = {
      name: basicInfo.value.name,
      type: 'character',
      description: basicInfo.value.description || undefined,
      gameSystemId: plugin.config.id,
      avatar: avatarUrl,
      token: tokenUrl,
      data: pluginData
    };

    // First upload any images if they exist as Files
    if (avatarFile) {
      const formData = new FormData();
      formData.append('image', avatarFile);
      
      try {
        const response = await fetch('/api/actors/images/avatar', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          actorData.avatar = data.url;
        }
      } catch (err) {
        console.error('Failed to upload avatar:', err);
      }
    }

    if (tokenFile) {
      const formData = new FormData();
      formData.append('image', tokenFile);
      
      try {
        const response = await fetch('/api/actors/images/token', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          actorData.token = data.url;
        }
      } catch (err) {
        console.error('Failed to upload token:', err);
      }
    }

    // Now create the actor with the URLs
    const actor = await actorStore.createActor(actorData);
    
    // Navigate to the character sheet
    router.push({ name: 'character-sheet', params: { id: actor.id } });
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
        
        <!-- Single Form -->
        <form @submit.prevent="handleSubmit" class="character-create-form">
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
              >
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
              <div class="form-group">
                <label class="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
                <ImageUpload
                  v-model="basicInfo.avatarImage"
                  type="avatar"
                />
                <div v-if="basicInfo.avatarImage" class="mt-1 text-xs text-gray-500">
                  {{ typeof basicInfo.avatarImage === 'object' && 'lastModified' in basicInfo.avatarImage ? 'File selected' : 'Image uploaded' }}
                </div>
              </div>
              
              <div class="form-group">
                <label class="block text-sm font-medium text-gray-700 mb-2">Token</label>
                <ImageUpload
                  v-model="basicInfo.tokenImage"
                  type="token"
                />
                <div v-if="basicInfo.tokenImage" class="mt-1 text-xs text-gray-500">
                  {{ typeof basicInfo.tokenImage === 'object' && 'lastModified' in basicInfo.tokenImage ? 'File selected' : 'Image uploaded' }}
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
              <div></div> <!-- Empty div for flex spacing -->
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
  background: white;
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
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
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
  border-top: 1px solid #eee;
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