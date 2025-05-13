<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { AssetsClient } from '@dungeon-lab/client/index.mjs';
import { type IAsset } from '@dungeon-lab/shared/types/index.mjs';

const router = useRouter();
const route = useRoute();
const assetId = route.params.id as string;

const assetClient = new AssetsClient();
const asset = ref<IAsset | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const showDeleteConfirm = ref(false);
const deleting = ref(false);
const toast = ref({
  show: false,
  message: ''
});

// Fetch the asset when the component mounts
onMounted(async () => {
  await fetchAsset();
});

// Fetch asset by ID
async function fetchAsset() {
  loading.value = true;
  error.value = null;
  
  try {
    const assetData = await assetClient.getAsset(assetId);
    asset.value = assetData || null;
  } catch (err: unknown) {
    console.error('Failed to load asset:', err);
    const errorObj = err as { response?: { data?: { message?: string } } };
    error.value = errorObj.response?.data?.message || (err as Error).message || 'Failed to load asset';
  } finally {
    loading.value = false;
  }
}

// Delete the asset
async function deleteAsset() {
  if (!asset.value) return;
  
  deleting.value = true;
  
  try {
    await assetClient.deleteAsset(assetId);
    // Navigate back to assets list after successful deletion
    router.push('/assets');
  } catch (err: unknown) {
    console.error('Failed to delete asset:', err);
    const errorObj = err as { response?: { data?: { message?: string } } };
    showToast(errorObj.response?.data?.message || (err as Error).message || 'Failed to delete asset');
  } finally {
    deleting.value = false;
    showDeleteConfirm.value = false;
  }
}

// Copy asset URL to clipboard
function copyUrl() {
  if (!asset.value?.url) return;
  
  navigator.clipboard.writeText(asset.value.url)
    .then(() => {
      showToast('URL copied to clipboard');
    })
    .catch(() => {
      showToast('Failed to copy URL');
    });
}

// Get asset name
function getAssetName(asset?: IAsset | null): string {
  if (!asset) return 'Unnamed asset';
  
  // Use the name field if available
  if (asset.name) return asset.name;
  
  // Fall back to extracting filename from path
  if (asset.path) {
    const filename = asset.path.split('/').pop();
    if (filename) return filename;
  }
  
  return 'Unnamed asset';
}

// Format file size
function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown size';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Format date
function formatDate(dateString?: Date): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Determine asset type
const isImage = computed(() => {
  return asset.value?.type && asset.value.type.startsWith('image/');
});

const isVideo = computed(() => {
  return asset.value?.type && asset.value.type.startsWith('video/');
});

const isAudio = computed(() => {
  return asset.value?.type && asset.value.type.startsWith('audio/');
});

const isPdf = computed(() => {
  return asset.value?.type && asset.value.type.includes('pdf');
});


// Show toast message
function showToast(message: string) {
  toast.value = {
    show: true,
    message
  };
  
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
}

// Format file type
function formatFileType(mimeType?: string): string {
  if (!mimeType) return 'Unknown';
  
  const types: Record<string, string> = {
    'image': 'Image',
    'video': 'Video',
    'audio': 'Audio',
    'application/pdf': 'PDF',
    'text': 'Text',
    'application': 'Application'
  };
  
  for (const [key, value] of Object.entries(types)) {
    if (mimeType.startsWith(key)) {
      return value;
    }
  }
  
  return 'File';
}

// Helper function to format metadata keys
function formatMetadataKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// Helper function to format metadata values
function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center my-12">
      <div class="flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Loading asset...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-6">
      <span class="block sm:inline">{{ error }}</span>
      <button 
        class="underline ml-4" 
        @click="fetchAsset"
      >
        Try Again
      </button>
    </div>

    <!-- Asset Details -->
    <div v-else-if="asset" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Asset Preview -->
      <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <!-- Image Preview -->
        <div v-if="isImage" class="flex justify-center items-center p-4">
          <img 
            :src="asset.url" 
            :alt="getAssetName(asset)" 
            class="max-w-full max-h-[60vh] object-contain"
          />
        </div>

        <!-- Video Preview -->
        <div v-else-if="isVideo" class="flex justify-center items-center p-4">
          <video 
            :src="asset.url" 
            controls 
            class="max-w-full max-h-[60vh]"
          >
            Your browser does not support the video tag.
          </video>
        </div>

        <!-- Audio Preview -->
        <div v-else-if="isAudio" class="flex justify-center items-center p-4">
          <audio 
            :src="asset.url" 
            controls 
            class="w-full"
          >
            Your browser does not support the audio tag.
          </audio>
        </div>

        <!-- PDF Preview -->
        <div v-else-if="isPdf" class="flex justify-center items-center p-4">
          <iframe 
            :src="asset.url" 
            class="w-full h-[60vh]"
            frameborder="0"
          ></iframe>
        </div>

        <!-- Generic File Preview -->
        <div v-else class="flex flex-col justify-center items-center p-8">
          <div class="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
            <i class="fas fa-file text-4xl text-gray-500"></i>
          </div>
          <p class="text-center text-lg font-medium">{{ getAssetName(asset) }}</p>
          <p class="text-gray-500 dark:text-gray-400 mt-2">{{ formatFileSize(asset.size) }}</p>
        </div>
      </div>

      <!-- Asset Information -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
          <h1 class="text-2xl font-bold">{{ getAssetName(asset) }}</h1>
          <p class="text-gray-500 dark:text-gray-400 mt-2">
            {{ formatFileType(asset.type) }} • {{ formatFileSize(asset.size) }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-2 mb-6">
          <a 
            :href="asset.url" 
            download 
            class="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <i class="fas fa-download mr-2"></i> Download
          </a>
          <button 
            class="inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            @click="showDeleteConfirm = true"
          >
            <i class="fas fa-trash-alt mr-2"></i> Delete
          </button>
          <button 
            class="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            @click="copyUrl"
          >
            <i class="fas fa-link mr-2"></i> Copy URL
          </button>
        </div>

        <!-- Asset Details -->
        <h2 class="text-lg font-semibold mb-4">Details</h2>
        <div class="space-y-3">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Name</p>
            <p>{{ getAssetName(asset) }}</p>
          </div>
          <div v-if="asset.path">
            <p class="text-sm text-gray-500 dark:text-gray-400">Filename</p>
            <p>{{ asset.path.split('/').pop() }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">MIME Type</p>
            <p>{{ asset.type || 'Unknown' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Size</p>
            <p>{{ formatFileSize(asset.size) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Uploaded</p>
            <p>{{ formatDate(asset.createdAt) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Path</p>
            <p class="truncate">{{ asset.path }}</p>
          </div>
        </div>

        <!-- Metadata -->
        <div v-if="asset.metadata && Object.keys(asset.metadata).length > 0" class="mt-6">
          <h2 class="text-lg font-semibold mb-4">Metadata</h2>
          <div class="space-y-3">
            <div v-for="key in Object.keys(asset.metadata).filter(key => key !== 'filename')" :key="key">
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ formatMetadataKey(key) }}</p>
              <p>{{ formatMetadataValue(asset.metadata[key]) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else class="text-center my-12">
      <div class="w-24 h-24 mx-auto rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
        <i class="fas fa-question text-4xl text-gray-500"></i>
      </div>
      <h2 class="text-2xl font-bold mb-2">Asset Not Found</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6">The asset you're looking for could not be found.</p>
      <router-link 
        to="/assets" 
        class="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
      >
        <i class="fas fa-arrow-left mr-2"></i> Back to Assets
      </router-link>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">Delete Asset</h3>
        <p class="mb-6">Are you sure you want to delete this asset? This action cannot be undone.</p>
        <div class="flex justify-end space-x-3">
          <button 
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            @click="showDeleteConfirm = false"
          >
            Cancel
          </button>
          <button 
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            @click="deleteAsset"
            :disabled="deleting"
          >
            <span v-if="deleting">Deleting...</span>
            <span v-else>Delete</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Toast notifications -->
    <div class="fixed bottom-4 right-4 z-50">
      <transition name="fade">
        <div v-if="toast.show" class="bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg">
          {{ toast.message }}
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style> 