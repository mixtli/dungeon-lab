<script setup lang="ts">
import { ref, computed } from 'vue';
import axios from '../network/axios.mjs';

const props = defineProps<{
  folder?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
}>();

const emit = defineEmits<{
  (e: 'upload-success', files: Array<{ url: string; key: string }>): void;
  (e: 'upload-error', error: Error): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFiles = ref<File[]>([]);
const uploading = ref(false);
const uploadProgress = ref(0);
const error = ref<string | null>(null);

const maxSizeBytes = computed(() => (props.maxSize || 10) * 1024 * 1024);
const acceptedFileTypes = computed(() => props.accept || '*');

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files) return;
  
  error.value = null;
  selectedFiles.value = Array.from(input.files);
  
  // Validate file size
  for (const file of selectedFiles.value) {
    if (file.size > maxSizeBytes.value) {
      error.value = `File ${file.name} exceeds the maximum size of ${props.maxSize || 10}MB`;
      selectedFiles.value = [];
      if (fileInput.value) fileInput.value.value = '';
      return;
    }
  }
}

async function uploadFiles() {
  if (selectedFiles.value.length === 0) return;
  
  uploading.value = true;
  uploadProgress.value = 0;
  error.value = null;
  
  try {
    const uploadedFiles = [];
    
    for (const file of selectedFiles.value) {
      const formData = new FormData();
      formData.append('file', file);
      if (props.folder) {
        formData.append('folder', props.folder);
      }
      
      const response = await axios.post('/api/storage/files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          }
        }
      });
      
      uploadedFiles.push({
        url: response.data.url,
        key: response.data.key
      });
    }
    
    emit('upload-success', uploadedFiles);
    selectedFiles.value = [];
    if (fileInput.value) fileInput.value.value = '';
  } catch (err) {
    console.error('Error uploading files:', err);
    error.value = err instanceof Error ? err.message : 'An error occurred during upload';
    emit('upload-error', err instanceof Error ? err : new Error('Upload failed'));
  } finally {
    uploading.value = false;
  }
}

function triggerFileInput() {
  if (fileInput.value) {
    fileInput.value.click();
  }
}

function clearSelection() {
  selectedFiles.value = [];
  if (fileInput.value) fileInput.value.value = '';
  error.value = null;
}
</script>

<template>
  <div class="file-uploader">
    <input
      ref="fileInput"
      type="file"
      :accept="acceptedFileTypes"
      :multiple="multiple"
      class="hidden"
      @change="handleFileSelect"
    />
    
    <div class="mb-4">
      <button
        type="button"
        @click="triggerFileInput"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        :disabled="uploading"
      >
        Select File{{ multiple ? 's' : '' }}
      </button>
      
      <span v-if="maxSize" class="ml-2 text-sm text-gray-500">
        Max size: {{ maxSize }}MB
      </span>
    </div>
    
    <div v-if="selectedFiles.length > 0" class="mb-4">
      <div class="text-sm font-medium mb-2">Selected Files:</div>
      <ul class="space-y-1">
        <li v-for="(file, index) in selectedFiles" :key="index" class="flex items-center">
          <span class="truncate max-w-md">{{ file.name }}</span>
          <span class="ml-2 text-xs text-gray-500">
            ({{ (file.size / 1024).toFixed(1) }} KB)
          </span>
        </li>
      </ul>
      
      <div class="mt-3 flex space-x-2">
        <button
          type="button"
          @click="uploadFiles"
          class="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          :disabled="uploading"
        >
          Upload
        </button>
        
        <button
          type="button"
          @click="clearSelection"
          class="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          :disabled="uploading"
        >
          Clear
        </button>
      </div>
    </div>
    
    <div v-if="uploading" class="mb-4">
      <div class="w-full bg-gray-200 rounded-full h-2.5">
        <div
          class="bg-blue-600 h-2.5 rounded-full"
          :style="{ width: `${uploadProgress}%` }"
        ></div>
      </div>
      <div class="text-sm text-center mt-1">
        {{ uploadProgress }}% Uploaded
      </div>
    </div>
    
    <div v-if="error" class="text-red-600 text-sm mt-2">
      {{ error }}
    </div>
  </div>
</template>

<style scoped>
.hidden {
  display: none;
}
</style> 