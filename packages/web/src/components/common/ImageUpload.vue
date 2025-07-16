<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { getAssetUrl } from '@/utils/getAssetUrl.mjs';

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
      <img :src="getAssetUrl(previewUrl)" class="h-32 w-32 object-cover rounded-md" alt="Image preview" />
      <button @click="clearImage" class="text-red-600 text-sm mt-1" type="button">Remove</button>
    </div>

    <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="onFileChange" />

    <button
      type="button"
      @click="triggerFileInput"
      class="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      {{ previewUrl ? 'Change Image' : 'Upload Image' }}
    </button>
  </div>
</template>
