<!-- Create a new component for handling map images with presigned URLs -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ArrowPathIcon, XCircleIcon } from '@heroicons/vue/24/outline';


const props = defineProps<{
  mapId: string;
  imageUrl?: string;
  alt: string;
  className?: string;
}>();

const imageError = ref(false);
const loading = ref(true);
const currentUrl = ref(props.imageUrl || '');
const showPlaceholder = ref(true);


// async function refreshPresignedUrl() {
//   try {
//     const response = await axios.get(`/api/maps/${props.mapId}/image-url`);
//     currentUrl.value = response.data.imageUrl;
//     imageError.value = false;
//   } catch (error) {
//     console.error('Error refreshing image URL:', error);
//     showNotification('Failed to refresh image URL');
//   }
// }

async function handleImageError() {
  if (!imageError.value) {
    imageError.value = true;
    showPlaceholder.value = false;
    //await refreshPresignedUrl();
  }
}

function handleImageLoad() {
  loading.value = false;
  imageError.value = false;
  showPlaceholder.value = false;
}

onMounted(() => {
  // Start with the provided URL
  currentUrl.value = props.imageUrl || '';
});
</script>

<template>
  <div class="relative w-full h-full" :class="className">
    <img
      :src="currentUrl"
      :alt="alt"
      class="w-full h-full object-cover"
      @error="handleImageError"
      @load="handleImageLoad"
    />

    <!-- Loading placeholder -->
    <div
      v-if="showPlaceholder"
      class="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-500 text-sm"
    >
      <ArrowPathIcon class="w-6 h-6 mb-2 animate-spin" />
      <span>Loading image...</span>
    </div>

    <!-- Error state -->
    <div
      v-if="imageError"
      class="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-red-500 text-sm"
    >
      <XCircleIcon class="w-6 h-6 mb-2" />
      <span>Failed to load image</span>
    </div>
  </div>
</template>

<style scoped>
/* All styles have been converted to Tailwind classes */
</style>
