<script setup lang="ts">
import { ref, watch,  onBeforeUnmount } from 'vue';

// Define the new props - can accept either a File object or the uploaded image data
const props = defineProps<{
  modelValue: File | null;
  type?: 'avatar' | 'token'; // Make type optional since we're not using it for direct uploads
  showPreview?: boolean; // Whether to show image preview (default true)
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: File | null): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const previewUrl = ref<string | null>(null);

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (newValue instanceof File) {
    // If we get a new File object, update the preview
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
    }
    previewUrl.value = URL.createObjectURL(newValue);
  } else {
    previewUrl.value = null;
  }
});

// Clean up local resources when component unmounts
onBeforeUnmount(() => {
  if (previewUrl.value) {
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
    
    // Clean up previous preview URL if it exists
    if (previewUrl.value) {
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
  if (previewUrl.value) {
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
    <div v-if="previewUrl && (showPreview !== false)" class="mb-2">
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
  </div>
</template> 