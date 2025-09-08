<script setup lang="ts">
import { ref, defineEmits, defineExpose } from 'vue';
import { MapsClient } from '@dungeon-lab/client/index.mjs';
import type { IMap } from '@dungeon-lab/shared/types/index.mjs';

// Props and Emits
const emit = defineEmits<{
  close: [];
  success: [map: IMap];
  error: [message: string];
}>();

// State
const isVisible = ref(false);
const isUploading = ref(false);
const selectedFile = ref<File | null>(null);
const errorMessage = ref<string | null>(null);
const isDragOver = ref(false);
const mapsClient = new MapsClient();

// File input handling
function onFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (file) {
    // Validate file type
    const validExtensions = ['.uvtt', '.dd2vtt'];
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidExtension) {
      errorMessage.value = 'Please select a valid UVTT or DD2VTT file';
      selectedFile.value = null;
      return;
    }
    
    selectedFile.value = file;
    errorMessage.value = null;
  }
}

// Drag and drop handling
function onDragEnter(event: DragEvent) {
  event.preventDefault();
  isDragOver.value = true;
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
}

function onDragLeave(event: DragEvent) {
  event.preventDefault();
  // Only set isDragOver to false if we're leaving the drop zone entirely
  // Check if the related target is outside the drop zone
  const dropZone = (event.currentTarget as HTMLElement);
  const relatedTarget = event.relatedTarget as HTMLElement;
  
  if (!dropZone.contains(relatedTarget)) {
    isDragOver.value = false;
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  isDragOver.value = false;
  
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  
  const file = files[0];
  
  // Validate file type (same logic as onFileSelect)
  const validExtensions = ['.uvtt', '.dd2vtt'];
  const hasValidExtension = validExtensions.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );
  
  if (!hasValidExtension) {
    errorMessage.value = 'Please select a valid UVTT or DD2VTT file';
    selectedFile.value = null;
    return;
  }
  
  selectedFile.value = file;
  errorMessage.value = null;
}

// Import functionality
async function importUVTT() {
  if (!selectedFile.value) {
    errorMessage.value = 'Please select a file to import';
    return;
  }
  
  isUploading.value = true;
  errorMessage.value = null;
  
  try {
    const map = await mapsClient.importUVTT(selectedFile.value);
    emit('success', map);
    close();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import UVTT file';
    errorMessage.value = message;
    emit('error', message);
  } finally {
    isUploading.value = false;
  }
}

// Modal control
function open() {
  isVisible.value = true;
  selectedFile.value = null;
  errorMessage.value = null;
  isUploading.value = false;
  isDragOver.value = false;
}

function close() {
  isVisible.value = false;
  isDragOver.value = false;
  emit('close');
}

// Expose methods for parent component
defineExpose({
  open,
  close
});
</script>

<template>
  <!-- Modal Backdrop -->
  <div
    v-if="isVisible"
    class="fixed inset-0 z-50 overflow-y-auto"
    aria-labelledby="modal-title"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div
        class="fixed inset-0 bg-obsidian bg-opacity-75 transition-opacity"
        aria-hidden="true"
        @click="close"
      ></div>

      <!-- Modal panel -->
      <div
        class="inline-block align-middle bg-stone dark:bg-stone-700 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full border border-stone-300 dark:border-stone-600"
      >
        <!-- Header -->
        <div class="bg-stone dark:bg-stone-700 px-6 pt-6 pb-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg leading-6 font-bold text-dragon" id="modal-title">
              📤 Import UVTT Map
            </h3>
            <button
              type="button"
              class="text-ash hover:text-dragon transition-colors"
              @click="close"
            >
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="bg-parchment dark:bg-obsidian px-6 py-4">
          <!-- File Upload Area -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-onyx dark:text-parchment mb-2">
              UVTT File
            </label>
            <div 
              class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors"
              :class="{
                'border-arcane bg-arcane/5': isDragOver,
                'border-stone-300 dark:border-stone-600 hover:border-arcane dark:hover:border-arcane': !isDragOver
              }"
              @dragenter="onDragEnter"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
              @drop="onDrop"
            >
              <div class="space-y-1 text-center">
                <svg
                  class="mx-auto h-12 w-12 text-ash dark:text-stone-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <div class="flex text-sm text-ash dark:text-stone-300">
                  <label
                    for="file-upload"
                    class="relative cursor-pointer bg-parchment dark:bg-obsidian rounded-md font-medium text-arcane hover:text-secondary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-secondary-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".uvtt,.dd2vtt"
                      class="sr-only"
                      @change="onFileSelect"
                    />
                  </label>
                  <p class="pl-1">or drag and drop</p>
                </div>
                <p class="text-xs text-ash dark:text-stone-400">
                  UVTT or DD2VTT files only
                </p>
              </div>
            </div>
            
            <!-- Selected File -->
            <div v-if="selectedFile" class="mt-2 text-sm text-onyx dark:text-parchment">
              <span class="font-medium">Selected:</span> {{ selectedFile.name }}
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="errorMessage" class="mb-4 p-3 bg-error-50 border border-error-200 rounded-md">
            <p class="text-sm text-error-700">{{ errorMessage }}</p>
          </div>

          <!-- Upload Progress -->
          <div v-if="isUploading" class="mb-4">
            <div class="flex items-center">
              <div class="animate-spin rounded-full h-4 w-4 border-2 border-arcane border-t-transparent mr-2"></div>
              <span class="text-sm text-ash dark:text-stone-300">Importing UVTT file...</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="bg-stone dark:bg-stone-700 px-6 py-4 border-t border-stone-300 dark:border-stone-600 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            class="btn btn-success shadow-lg sm:ml-3"
            :disabled="!selectedFile || isUploading"
            @click="importUVTT"
          >
            <span v-if="isUploading">Importing...</span>
            <span v-else>📤 Import Map</span>
          </button>
          <button
            type="button"
            class="btn btn-outline shadow-lg mt-3 sm:mt-0"
            :disabled="isUploading"
            @click="close"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>