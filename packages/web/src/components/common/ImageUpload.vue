<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { transformAssetUrl } from '@/utils/asset-utils.mjs';

// Define the interface for uploaded assets
interface UploadedImage {
  url: string;
  objectKey?: string;
  path?: string;
  size?: number;
  type?: string;
}

// Define the new props - can accept either a File object or the uploaded image data
const props = defineProps<{
  modelValue: File | UploadedImage | null;
  type?: 'avatar' | 'token' | 'map'; // Add 'map' as a valid type
  showPreview?: boolean; // Whether to show image preview (default true)
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: File | UploadedImage | null): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const previewUrl = ref<string | null>(null);

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  newValue => {
    console.log('Model value changed in ImageUpload:', newValue);

    // Clear previous preview URL if it exists
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = null;
    }

    if (!newValue) return;

    // Handle File objects
    if (newValue instanceof File || (typeof newValue === 'object' && 'lastModified' in newValue)) {
      previewUrl.value = URL.createObjectURL(newValue as File);
      console.log('Created preview from File:', previewUrl.value);
    }
    // Handle UploadedImage objects
    else if (typeof newValue === 'object' && 'url' in newValue) {
      previewUrl.value = newValue.url;
      console.log('Using UploadedImage URL for preview:', previewUrl.value);
    }
  },
  { immediate: true }
);

// Clean up local resources when component unmounts
onBeforeUnmount(() => {
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value);
  }
});

function triggerFileInput() {
  fileInput.value?.click();
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    console.log('File selected:', file.name);

    // Clean up previous preview URL if it's a blob URL
    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value);
    }

    // Create a new preview URL
    previewUrl.value = URL.createObjectURL(file);

    // Emit the file object to the parent
    emit('update:modelValue', file);

    // Reset the file input for future uploads
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
}

function clearImage() {
  // Revoke local preview URL
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value);
  }

  previewUrl.value = null;

  // Reset the file input
  if (fileInput.value) {
    fileInput.value.value = '';
  }

  // Emit null to clear the model value
  emit('update:modelValue', null);
}
</script>

<template>
  <div>
    <div v-if="previewUrl" class="mb-2">
      <img :src="transformAssetUrl(previewUrl)" class="h-32 w-32 object-cover rounded-md" alt="Image preview" />
      <button @click="clearImage" class="text-red-600 text-sm mt-1" type="button">Remove</button>
    </div>

    <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="onFileChange" />

    <button
      type="button"
      @click="triggerFileInput"
      class="upload-button font-heading text-base px-6 py-3 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
    >
      {{ previewUrl ? 'Change Image' : 'Upload Image' }}
    </button>
  </div>
</template>

<style scoped>
.upload-button {
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(50, 50, 50, 0.9) 100%);
  border: 2px solid rgb(212, 175, 55);
  border-radius: 0.5rem;
  color: rgb(212, 175, 55);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-button:hover {
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.2) 100%);
  border-color: rgb(255, 200, 85);
  color: rgb(255, 200, 85);
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
}

.upload-button:active {
  transform: translateY(1px) scale(0.98);
}
</style>
