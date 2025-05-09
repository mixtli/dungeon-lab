<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { MapsClient } from '@dungeon-lab/client/index.mjs';
import { ArrowLeftIcon } from '@heroicons/vue/24/outline';
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
  width: 20,
  height: 15,
  pixelsPerGrid: 70
});
const mapImageFile = ref<File | UploadedImage | null>(null);

// UVTT file upload
const uvttFile = ref<File | null>(null);
const uvttLoading = ref(false);
const uvttError = ref<string | null>(null);

async function handleUvttFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    uvttFile.value = target.files[0];
  }
}

async function handleUvttUpload() {
  if (!uvttFile.value) {
    uvttError.value = 'Please select a UVTT file to upload';
    return;
  }

  try {
    uvttLoading.value = true;
    uvttError.value = null;

    // Read the file content
    const fileContent = await uvttFile.value.text();

    // Use fetch API directly to control the Content-Type header
    const response = await fetch('/api/maps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/uvtt'
      },
      body: fileContent
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    
    // Navigate to the map edit page
    router.push({ name: 'map-edit', params: { id: result.data.id } });
  } catch (err) {
    console.error('Error uploading UVTT file:', err);
    if (err instanceof Error) {
      uvttError.value = `Error uploading UVTT file: ${err.message}`;
    } else {
      uvttError.value = 'An unknown error occurred while uploading the UVTT file';
    }
  } finally {
    uvttLoading.value = false;
  }
}

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
        format: 1.0,
        resolution: {
          map_origin: { x: 0, y: 0 },
          map_size: { 
            x: formData.value.width, 
            y: formData.value.height 
          },
          pixels_per_grid: formData.value.pixelsPerGrid
        },
        // Always include environment with required fields
        environment: {
          baked_lighting: false,
          ambient_light: '#ffffff'
        }
      }
    };

    // Get the image file if it exists
    const imageFile = mapImageFile.value instanceof File ? mapImageFile.value : undefined;

    // Call the createMap method with separate file parameter
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
    <div class="flex items-center mb-6">
      <button
        @click="router.back()"
        class="flex items-center px-4 py-2 mr-4 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <ArrowLeftIcon class="h-5 w-5 mr-1" />
        Back
      </button>
      <h1 class="text-2xl font-bold">Create New Map</h1>
    </div>

    <!-- UVTT File Upload Section -->
    <div class="bg-white rounded-lg shadow-md max-w-2xl mx-auto p-6 mb-6 border-2 border-blue-200">
      <h2 class="text-xl font-semibold mb-4">Import from UVTT File</h2>
      <p class="text-gray-600 mb-4">
        Upload a Universal VTT (UVTT) file to quickly import a map with all its settings.
      </p>

      <!-- UVTT Error Display -->
      <div v-if="uvttError" class="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
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
            <p class="text-sm text-red-700">{{ uvttError }}</p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <input 
          type="file"
          accept=".uvtt"
          @change="handleUvttFileChange"
          class="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
        />
        <button
          @click="handleUvttUpload"
          :disabled="!uvttFile || uvttLoading"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ uvttLoading ? 'Uploading...' : 'Upload UVTT' }}
        </button>
      </div>
      <div v-if="uvttFile" class="mt-2 text-sm text-gray-600">
        Selected file: {{ uvttFile.name }}
      </div>
    </div>

    <div class="bg-white rounded-lg shadow-md max-w-2xl mx-auto p-6">
      <h2 class="text-xl font-semibold mb-4">Or Create a New Map</h2>
      
      <!-- Error State -->
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
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

      <form @submit="handleSubmit" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Name <span class="text-red-500">*</span>
          </label>
          <input
            v-model="formData.name"
            type="text"
            required
            placeholder="Enter map name"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"> Description </label>
          <textarea
            v-model="formData.description"
            rows="3"
            placeholder="Enter map description"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Map Width (Squares) <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.width"
              type="number"
              required
              min="1"
              max="100"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Map Height (Squares) <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.height"
              type="number"
              required
              min="1"
              max="100"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Pixels Per Grid <span class="text-red-500">*</span>
          </label>
          <input
            v-model="formData.pixelsPerGrid"
            type="number"
            required
            min="10"
            max="200"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p class="text-gray-500 text-sm mt-1">
            Number of pixels per grid square. Higher values result in higher resolution maps.
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Map Image <span class="text-red-500">*</span>
          </label>
          <ImageUpload v-model="mapImageFile" type="map" />
          <p class="text-gray-500 text-sm mt-2">
            Upload a JPG/PNG image of your map. If no image is provided, one will be generated by AI.
          </p>
          <div v-if="mapImageFile" class="text-xs text-gray-500 mt-2">
            {{
              typeof mapImageFile === 'object' && 'lastModified' in mapImageFile
                ? 'File selected'
                : 'Image set'
            }}
          </div>
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="!formData.name || loading"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
