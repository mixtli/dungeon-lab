<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { MapsClient } from '@dungeon-lab/client/index.mjs';
import ImageUpload from '../../components/common/ImageUpload.vue';
import type { UVTTData } from '@dungeon-lab/shared/types/index.mjs';

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
  width: 20,
  height: 15,
  pixelsPerGrid: 70
});
const mapImageFile = ref<File | UploadedImage | null>(null);
const originalImagePixelDimensions = ref<{ width: number; height: number } | null>(null);

// UVTT file upload
const uvttFile = ref<File | null>(null);
const uvttData = ref<UVTTData | null>(null);
const uvttLoading = ref(false);
const uvttError = ref<string | null>(null);

// Handle UVTT file change
async function handleUvttFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) {
    return;
  }
  
  const file = target.files[0];
  uvttFile.value = file;
  uvttLoading.value = true;
  uvttError.value = null;
  
  try {
    // Read and parse the UVTT file
    const fileContent = await file.text();
    const parsedData = JSON.parse(fileContent) as UVTTData;
    
    // Extract map dimensions from UVTT data
    if (parsedData.resolution) {
      if (parsedData.resolution.map_size) {
        formData.value.width = parsedData.resolution.map_size.x || 20;
        formData.value.height = parsedData.resolution.map_size.y || 15;
      }
      
      if (parsedData.resolution.pixels_per_grid) {
        formData.value.pixelsPerGrid = parsedData.resolution.pixels_per_grid;
      }
    }
    
    // If UVTT has an embedded image, convert to File object and REMOVE from UVTT
    if (parsedData.image && typeof parsedData.image === 'string') {
      // Extract the map image data
      let base64Data: string;
      let mimeType = 'image/png'; // Default mime type
      
      if (parsedData.image.startsWith('data:image')) {
        // It's a data URL, extract the mime type and base64 data
        const imageData = parsedData.image;
        mimeType = imageData.split(';')[0].split(':')[1];
        base64Data = imageData.split(',')[1];
      } else {
        // It's just a base64 string, use it directly
        base64Data = parsedData.image;
      }
      
      // Convert base64 to Blob
      const byteString = atob(base64Data);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const intArray = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < byteString.length; i++) {
        intArray[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([arrayBuffer], {type: mimeType});
      const fileName = `${formData.value.name || 'map'}_image.${mimeType.split('/')[1] || 'png'}`;
      const imageFile = new File([blob], fileName, {type: mimeType});
      
      // Set as the map image
      mapImageFile.value = imageFile;
      
      // IMPORTANT: Remove the image from the UVTT data to reduce payload size
      const modifiedUvttData = {...parsedData} as UVTTData;
      // TypeScript-safe way to remove the image property
      if ('image' in modifiedUvttData) {
        // @ts-expect-error - We know the property exists, but TypeScript is being strict about deletion
        delete modifiedUvttData.image;
      }
      
      // Store the modified UVTT data
      uvttData.value = modifiedUvttData;
      
      // Create a new UVTT file without the image
      const modifiedUvttContent = JSON.stringify(modifiedUvttData);
      const modifiedUvttBlob = new Blob([modifiedUvttContent], {type: 'application/json'});
      uvttFile.value = new File([modifiedUvttBlob], file.name, {type: 'application/json'});
    } else {
      // If no image, just store the parsed data as is
      uvttData.value = parsedData;
    }
    
    // Set a default name if not already set
    if (!formData.value.name && file.name) {
      formData.value.name = file.name
        .replace(/\.(uvtt|dd2vtt)$/i, '')
        .replace(/[_-]/g, ' ');
    }
    
  } catch (err) {
    console.error('Error parsing UVTT file:', err);
    uvttError.value = 'Invalid UVTT file format. Please select a valid UVTT file.';
    uvttFile.value = null;
    uvttData.value = null;
  } finally {
    uvttLoading.value = false;
  }
  
  // Reset the input so the same file can be selected again if needed
  target.value = '';
}

function calculateAndSetMapHeight() {
  if (originalImagePixelDimensions.value && formData.value.width > 0) {
    const aspectRatio = originalImagePixelDimensions.value.height / originalImagePixelDimensions.value.width;
    let newHeight = Math.round(formData.value.width * aspectRatio);
    if (newHeight < 1) newHeight = 1; // Ensure minimum height of 1
    formData.value.height = newHeight;
  }
}

watch(mapImageFile, (newFile) => {
  if (newFile instanceof File) {
    const img = new Image();
    const objectUrl = URL.createObjectURL(newFile);
    img.onload = () => {
      originalImagePixelDimensions.value = { width: img.naturalWidth, height: img.naturalHeight };
      calculateAndSetMapHeight();
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      originalImagePixelDimensions.value = null;
      URL.revokeObjectURL(objectUrl);
      console.error('Error loading image for dimension calculation.');
      // Potentially reset height or allow user input if image fails to load
    };
    img.src = objectUrl;
  } else {
    originalImagePixelDimensions.value = null;
    // When image is cleared, height input becomes enabled.
    // Consider if we should reset height to a default or previous user value.
    // For now, it will retain its last calculated or UVTT-set value.
  }
});

watch(() => formData.value.width, () => {
  if (originalImagePixelDimensions.value) {
    calculateAndSetMapHeight();
  }
});

async function handleSubmit(event: Event) {
  event.preventDefault();

  try {
    loading.value = true;
    error.value = null;
    
    // Prepare the create map request data without the image
    const mapData = {
      name: formData.value.name,
      description: formData.value.description || '',
      gridColumns: formData.value.width, // Keep for backward compatibility
      uvtt: {
        format: 1.0, // Use a simple default format
        resolution: {
          map_origin: { x: 0, y: 0 },
          map_size: { 
            x: formData.value.width, 
            y: formData.value.height 
          },
          pixels_per_grid: formData.value.pixelsPerGrid
        },
        environment: {
          baked_lighting: false,
          ambient_light: '#ffffff'
        }
      }
    };

    // Get the image file if it exists
    const imageFile = mapImageFile.value instanceof File ? mapImageFile.value : undefined;

    // Create the map with the prepared data - if we have a UVTT file, let the client handle it
    await mapClient.createMap(mapData, imageFile, uvttFile.value || undefined);

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

      <!-- UVTT Error State -->
      <div v-if="uvttError" class="bg-error-50 border border-error-200 rounded-md p-4 mb-6 dark:bg-error-900 dark:border-error-700">
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
            <p class="text-sm text-error-700 dark:text-error-200">{{ uvttError }}</p>
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

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-onyx dark:text-parchment mb-1">
              Map Width (Squares) <span class="text-error-700">*</span>
            </label>
            <input
              v-model="formData.width"
              type="number"
              required
              min="1"
              max="100"
              class="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-md focus:outline-none focus:ring-2 focus:ring-dragon bg-parchment dark:bg-stone-600 text-onyx dark:text-parchment"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-onyx dark:text-parchment mb-1">
              Map Height (Squares) <span class="text-error-700">*</span>
            </label>
            <input
              v-model="formData.height"
              type="number"
              required
              min="1"
              max="100"
              :disabled="!!originalImagePixelDimensions"
              class="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-md focus:outline-none focus:ring-2 focus:ring-dragon bg-parchment dark:bg-stone-600 text-onyx dark:text-parchment disabled:opacity-50"
            />
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
              Import from UVTT/DD2VTT
            </label>
            <div class="flex items-center">
              <input 
                type="file"
                accept=".uvtt,.dd2vtt"
                @change="handleUvttFileChange"
                class="block w-full text-sm text-ash dark:text-stone-300
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-secondary-50 file:text-secondary-700
                      hover:file:bg-secondary-100 dark:file:bg-secondary-800 dark:file:text-secondary-200"
              />
            </div>
            <div v-if="uvttFile" class="mt-2 text-sm text-nature-600 dark:text-nature-400 flex items-center">
              <svg class="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              UVTT file loaded: {{ uvttFile.name }}
            </div>
            <p class="text-ash dark:text-stone-300 text-sm mt-2">
              Upload a Universal VTT (UVTT/DD2VTT) file to automatically fill map settings. Will also extract any embedded image.
            </p>
          </div>

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
