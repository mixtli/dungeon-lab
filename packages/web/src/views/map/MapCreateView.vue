<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from '../../network/axios.mjs';
import { ArrowLeftIcon, ArrowUpTrayIcon } from '@heroicons/vue/24/outline';

const router = useRouter();
const loading = ref(false);
const formData = ref({
  name: '',
  description: '',
  gridColumns: 20,
});
const imageFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    imageFile.value = input.files[0];
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    imageFile.value = event.dataTransfer.files[0];
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
}

async function handleSubmit(event: Event) {
  event.preventDefault();
  
  if (!imageFile.value) {
    alert('Please upload a map image');
    return;
  }

  try {
    loading.value = true;
    const form = new FormData();
    form.append('name', formData.value.name);
    form.append('description', formData.value.description || '');
    form.append('gridColumns', formData.value.gridColumns.toString());
    form.append('image', imageFile.value);

    await axios.post('/api/maps', form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    alert('Map created successfully');
    router.push({ name: 'maps' });
  } catch (error) {
    alert('Failed to create map');
    console.error('Error creating map:', error);
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
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
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
          <div
            @drop="handleDrop"
            @dragover="handleDragOver"
            class="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400"
            @click="fileInputRef?.click()"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleFileChange"
            />
            <ArrowUpTrayIcon class="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p class="text-gray-600">
              Drop file here or <span class="text-blue-500">click to upload</span>
            </p>
            <p v-if="imageFile" class="mt-2 text-sm text-gray-500">
              Selected: {{ imageFile.name }}
            </p>
          </div>
          <p class="text-gray-500 text-sm mt-2">
            Upload a JPG/PNG image of your map
          </p>
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="!formData.name || !imageFile || loading"
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