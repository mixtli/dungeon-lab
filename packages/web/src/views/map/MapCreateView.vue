<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from '../../api/axios.mjs';
import { ArrowLeftIcon } from '@heroicons/vue/24/outline';
import ImageUpload from '../../components/common/ImageUpload.vue';
import { type IAsset } from '@dungeon-lab/shared/index.mjs';

interface UploadedImage {
  url: string;
  objectKey?: string;
  path?: string;
  size?: number;
  type?: string;
}

const router = useRouter();
const loading = ref(false);
const error = ref<string | null>(null);
const formData = ref({
  name: '',
  description: '',
  gridColumns: 20,
});
const mapImageFile = ref<File | UploadedImage | null>(null);

async function handleSubmit(event: Event) {
  event.preventDefault();

  try {
    loading.value = true;
    error.value = null;
    const form = new FormData();
    form.append('name', formData.value.name);
    form.append('description', formData.value.description || '');
    form.append('gridColumns', formData.value.gridColumns.toString());

    // Add the file directly to the form if it's a File object
    if (mapImageFile.value instanceof File) {
      form.append('image', mapImageFile.value);
    }

    await axios.post('/api/maps', form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes timeout for large uploads or AI image generation
    });

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

    <div class="bg-white rounded-lg shadow-md max-w-2xl mx-auto p-6">
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

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Grid Columns <span class="text-red-500">*</span>
          </label>
          <input
            v-model="formData.gridColumns"
            type="number"
            required
            min="1"
            max="100"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p class="text-gray-500 text-sm mt-1">
            Number of columns in the grid. Rows will be calculated based on the image aspect ratio.
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
