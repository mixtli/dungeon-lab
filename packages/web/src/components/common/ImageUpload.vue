<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

interface UploadedImage {
  url: string;
  objectKey: string;
  size?: number;
}

const props = defineProps<{
  modelValue: UploadedImage | null;
  type: 'avatar' | 'token';
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: UploadedImage | null): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const previewUrl = ref<string | null>(null);
const isUploading = ref(false);
const uploadError = ref<string | null>(null);

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    previewUrl.value = newValue.url;
  } else {
    previewUrl.value = null;
  }
});

// Set preview URL if we have a model value
onMounted(() => {
  if (props.modelValue) {
    previewUrl.value = props.modelValue.url;
  }
});

// Clean up local resources when component unmounts
onBeforeUnmount(() => {
  if (previewUrl.value && !props.modelValue?.url) {
    URL.revokeObjectURL(previewUrl.value);
  }
});

function triggerFileInput() {
  fileInput.value?.click();
}

async function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    
    // Set local preview immediately for better UX
    if (previewUrl.value && !props.modelValue?.url) {
      URL.revokeObjectURL(previewUrl.value);
    }
    previewUrl.value = URL.createObjectURL(file);
    
    // Upload the file
    await uploadImage(file);
    
    // Reset the file input for future uploads
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
}

async function uploadImage(file: File) {
  isUploading.value = true;
  uploadError.value = null;
  
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`/api/actors/images/${props.type}`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to upload image');
    }
    
    const data = await response.json();
    
    // Emit the uploaded image data
    emit('update:modelValue', {
      url: data.url,
      objectKey: data.objectKey,
      size: data.size
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    uploadError.value = error instanceof Error ? error.message : 'Failed to upload image';
    
    // Clear the preview if upload failed
    if (previewUrl.value && !props.modelValue?.url) {
      URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = null;
    }
  } finally {
    isUploading.value = false;
  }
}

function clearImage() {
  // Revoke local preview URL if it's not from the model
  if (previewUrl.value && !props.modelValue?.url) {
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
      <img :src="previewUrl" class="h-32 w-32 object-cover rounded-md" alt="Image preview" />
      <button 
        @click="clearImage" 
        class="text-red-600 text-sm mt-1"
        type="button"
      >
        Remove
      </button>
    </div>
    
    <input 
      type="file" 
      ref="fileInput"
      class="hidden" 
      accept="image/*" 
      @change="onFileChange" 
    />
    
    <button 
      type="button"
      @click="triggerFileInput"
      class="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      {{ previewUrl ? 'Change Image' : 'Upload Image' }}
    </button>
    
    <div v-if="isUploading" class="mt-2 text-sm text-gray-500">
      Uploading...
    </div>
    <div v-if="uploadError" class="mt-2 text-sm text-red-500">
      {{ uploadError }}
    </div>
  </div>
</template> 