<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { MapsClient } from '@dungeon-lab/client/index.mjs';
import ImageUpload from '../../components/common/ImageUpload.vue';

interface UploadedImage {
  url: string;
  objectKey?: string;
  path?: string;
  size?: number;
  type?: string;
}

const mapClient = new MapsClient();

const router = useRouter();
const loading = ref(false);
const error = ref<string | null>(null);
const formData = ref({
  name: '',
  description: '',
  pixelsPerGrid: 70
});
const mapImageFile = ref<File | UploadedImage | null>(null);
const originalImagePixelDimensions = ref<{ width: number; height: number } | null>(null);


// Calculate grid dimensions based on image and pixels per grid
const calculatedGridDimensions = computed(() => {
  if (!originalImagePixelDimensions.value || !formData.value.pixelsPerGrid) {
    return { width: 0, height: 0 };
  }
  
  return {
    width: Math.ceil(originalImagePixelDimensions.value.width / formData.value.pixelsPerGrid),
    height: Math.ceil(originalImagePixelDimensions.value.height / formData.value.pixelsPerGrid)
  };
});

watch(mapImageFile, (newFile) => {
  if (newFile instanceof File) {
    const img = new Image();
    const objectUrl = URL.createObjectURL(newFile);
    img.onload = () => {
      originalImagePixelDimensions.value = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      originalImagePixelDimensions.value = null;
      URL.revokeObjectURL(objectUrl);
      console.error('Error loading image for dimension calculation.');
    };
    img.src = objectUrl;
  } else {
    originalImagePixelDimensions.value = null;
  }
});


async function handleSubmit(event: Event) {
  event.preventDefault();

  try {
    loading.value = true;
    error.value = null;
    
    // Ensure we have actual image dimensions from the uploaded file
    if (!originalImagePixelDimensions.value) {
      throw new Error('Image dimensions not available. Please ensure an image is uploaded.');
    }

    // Calculate grid dimensions from image and pixels per grid
    const gridWidth = Math.ceil(originalImagePixelDimensions.value.width / formData.value.pixelsPerGrid);
    const gridHeight = Math.ceil(originalImagePixelDimensions.value.height / formData.value.pixelsPerGrid);
    
    // Prepare the create map request data with new coordinate system
    const mapData = {
      name: formData.value.name,
      description: formData.value.description || '',
      gridColumns: gridWidth, // Calculated from image dimensions
      mapData: {
        coordinates: {
          worldUnitsPerGridCell: formData.value.pixelsPerGrid,
          offset: { x: 0, y: 0 },
          dimensions: { 
            width: gridWidth, 
            height: gridHeight 
          },
          imageDimensions: { 
            width: originalImagePixelDimensions.value.width, 
            height: originalImagePixelDimensions.value.height 
          }
        },
        environment: {
          ambientLight: {
            color: '#ffffff',
            intensity: 0.1
          },
          globalIllumination: false
        }
      }
    };

    // Get the image file if it exists
    const imageFile = mapImageFile.value instanceof File ? mapImageFile.value : undefined;

    // Create the map with the prepared data
    await mapClient.createMap(mapData, imageFile);

    // Show success and navigate to map list
    router.push({ name: 'maps' });
  } catch (err) {
    console.error('Error creating map:', err);
    if (err instanceof Error) {
      error.value = `Error creating map: ${err.message}`;
    } else {
      error.value = 'An unknown error occurred while creating the map';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="p-6">
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-dragon">Create New Map</h1>
    </div>

    <div class="bg-stone dark:bg-stone-700 rounded-lg shadow-xl border border-stone-300 dark:border-stone-600 max-w-2xl mx-auto p-6">
      <!-- Error State -->
      <div v-if="error" class="bg-error-50 border border-error-200 rounded-md p-4 mb-6 dark:bg-error-900 dark:border-error-700">
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


      <form @submit="handleSubmit" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-onyx dark:text-parchment mb-1">
            Name <span class="text-error-700">*</span>
          </label>
          <input
            v-model="formData.name"
            type="text"
            required
            placeholder="Enter map name"
            class="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-md focus:outline-none focus:ring-2 focus:ring-dragon bg-parchment dark:bg-stone-600 text-onyx dark:text-parchment"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-onyx dark:text-parchment mb-1"> Description </label>
          <textarea
            v-model="formData.description"
            rows="3"
            placeholder="Enter map description"
            class="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-md focus:outline-none focus:ring-2 focus:ring-dragon bg-parchment dark:bg-stone-600 text-onyx dark:text-parchment"
          ></textarea>
        </div>

        <!-- Image and Grid Information Display -->
        <div v-if="originalImagePixelDimensions" class="bg-nature-50 dark:bg-nature-900 rounded-md p-4 border border-nature-200 dark:border-nature-700">
          <h3 class="text-sm font-medium text-nature-800 dark:text-nature-200 mb-2">Image & Grid Information</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-nature-600 dark:text-nature-400">Image Size:</span>
              <span class="ml-2 font-mono text-nature-800 dark:text-nature-200">
                {{ originalImagePixelDimensions.width }} × {{ originalImagePixelDimensions.height }} pixels
              </span>
            </div>
            <div>
              <span class="text-nature-600 dark:text-nature-400">Aspect Ratio:</span>
              <span class="ml-2 font-mono text-nature-800 dark:text-nature-200">
                {{ (originalImagePixelDimensions.width / originalImagePixelDimensions.height).toFixed(2) }}:1
              </span>
            </div>
            <div>
              <span class="text-nature-600 dark:text-nature-400">Grid Size:</span>
              <span class="ml-2 font-mono text-nature-800 dark:text-nature-200">
                {{ calculatedGridDimensions.width }} × {{ calculatedGridDimensions.height }} squares
              </span>
            </div>
            <div>
              <span class="text-nature-600 dark:text-nature-400">Pixels per Square:</span>
              <span class="ml-2 font-mono text-nature-800 dark:text-nature-200">
                {{ formData.pixelsPerGrid }}px
              </span>
            </div>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-onyx dark:text-parchment mb-1">
            Pixels Per Grid <span class="text-error-700">*</span>
          </label>
          <input
            v-model="formData.pixelsPerGrid"
            type="number"
            required
            min="10"
            max="200"
            class="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-md focus:outline-none focus:ring-2 focus:ring-dragon bg-parchment dark:bg-stone-600 text-onyx dark:text-parchment"
          />
          <p class="text-ash dark:text-stone-300 text-sm mt-1">
            Number of pixels per grid square. Higher values result in higher resolution maps.
          </p>
        </div>

        <div class="space-y-4">

          <div>
            <label class="block text-sm font-medium text-onyx dark:text-parchment mb-1">
              Map Image
            </label>
            <ImageUpload v-model="mapImageFile" type="map" />
            <p class="text-ash dark:text-stone-300 text-sm mt-2">
              Upload a JPG/PNG image of your map. If no image is provided, one will be generated by AI.
            </p>
            <div v-if="mapImageFile" class="text-xs text-ash dark:text-stone-300 mt-2">
              {{
                typeof mapImageFile === 'object' && 'lastModified' in mapImageFile
                  ? 'File selected'
                  : 'Image set'
              }}
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="!formData.name || loading"
            class="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Creating...' : 'Create Map' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Add any additional custom styles here if needed */
</style>
