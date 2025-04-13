<!-- 
  Generic Asset Upload Component
  
  This component handles file uploads for any model type, not just specific ones like actors.
  It uses a temporary preview URL before upload, and doesn't send the file to the server
  until the parent component is ready to submit the whole form.
-->
<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue';

const props = defineProps<{
  modelValue: File | null;
  label?: string;
  accept?: string;
  maxSize?: number; // in MB
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: File | null): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const previewUrl = ref<string | null>(null);
const isDragging = ref(false);
const error = ref<string | null>(null);

// Default accept types if none provided
const acceptTypes = computed(() => props.accept || 'image/*');

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      // Create preview URL for the file
      previewUrl.value = URL.createObjectURL(newValue);
    } else {
      clearPreviewUrl();
    }
  }
);

// Clean up local resources when component unmounts
onBeforeUnmount(() => {
  clearPreviewUrl();
});

function clearPreviewUrl() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = null;
  }
}

function triggerFileInput() {
  fileInput.value?.click();
}

function validateFile(file: File): boolean {
  // Check file size if maxSize is provided
  if (props.maxSize && file.size > props.maxSize * 1024 * 1024) {
    error.value = `File size exceeds the ${props.maxSize}MB limit`;
    return false;
  }

  // Check file type if accept is provided and it's not '*'
  if (props.accept && props.accept !== '*') {
    const fileType = file.type;
    const acceptTypes = props.accept.split(',').map(type => type.trim());

    // Check if any of the accepted types match
    const isAccepted = acceptTypes.some(type => {
      if (type.endsWith('/*')) {
        // Handle wildcard mime types (e.g., image/*)
        const category = type.split('/')[0];
        return fileType.startsWith(`${category}/`);
      }
      return type === fileType;
    });

    if (!isAccepted) {
      error.value = `File type not accepted. Please upload ${props.accept}`;
      return false;
    }
  }

  return true;
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];

    if (!validateFile(file)) {
      // Reset the file input if validation fails
      if (fileInput.value) {
        fileInput.value.value = '';
      }
      return;
    }

    // Clear any previous error
    error.value = null;

    // Clear previous preview URL
    clearPreviewUrl();

    // Create new preview URL
    previewUrl.value = URL.createObjectURL(file);

    // Emit the file to parent
    emit('update:modelValue', file);
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;

  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0];

    if (!validateFile(file)) {
      return;
    }

    // Clear any previous error
    error.value = null;

    // Clear previous preview URL
    clearPreviewUrl();

    // Create new preview URL
    previewUrl.value = URL.createObjectURL(file);

    // Emit the file to parent
    emit('update:modelValue', file);
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

function clearFile() {
  // Clear preview URL
  clearPreviewUrl();

  // Reset the file input
  if (fileInput.value) {
    fileInput.value.value = '';
  }

  // Emit null to clear the model value
  emit('update:modelValue', null);
}

function isImage(file: File): boolean {
  return file.type.startsWith('image/');
}
</script>

<template>
  <div>
    <!-- File preview area -->
    <div v-if="previewUrl && modelValue" class="mb-3">
      <!-- Preview for image files -->
      <img
        v-if="isImage(modelValue)"
        :src="previewUrl"
        class="h-32 w-32 object-cover rounded-md mb-1"
        alt="Asset preview"
      />

      <!-- Preview for non-image files -->
      <div v-else class="flex items-center p-2 bg-gray-100 rounded-md mb-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6 text-gray-500 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span class="text-sm text-gray-800">{{ modelValue.name }}</span>
      </div>

      <!-- File info and remove button -->
      <div class="flex items-center justify-between text-xs text-gray-500">
        <span>{{ (modelValue.size / 1024).toFixed(0) }} KB</span>
        <button @click="clearFile" type="button" class="text-red-600 hover:text-red-800">
          Remove
        </button>
      </div>
    </div>

    <!-- File upload area -->
    <div
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      class="border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors"
      :class="[
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
        error ? 'border-red-300 bg-red-50' : '',
      ]"
      @click="triggerFileInput"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="acceptTypes"
        class="hidden"
        @change="onFileChange"
      />

      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-8 w-8 mx-auto mb-2"
        :class="error ? 'text-red-400' : 'text-gray-400'"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>

      <p :class="error ? 'text-red-600' : 'text-gray-600'">
        {{ error || `Drop file here or click to upload` }}
      </p>
      <p class="text-xs text-gray-500 mt-1">
        {{ props.label || `Upload a file` }}
      </p>
    </div>
  </div>
</template>
