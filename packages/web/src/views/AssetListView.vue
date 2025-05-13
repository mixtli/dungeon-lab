<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { AssetsClient } from '@dungeon-lab/client/index.mjs';
import AssetUpload from '../components/common/AssetUpload.vue';
import type { IAsset } from '@dungeon-lab/shared/types/index.mjs';

const assetsClient = new AssetsClient();

// State for assets and UI
const assets = ref<IAsset[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showUploadModal = ref(false);

// Pagination
const totalAssets = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const totalPages = computed(() => Math.ceil(totalAssets.value / pageSize.value));

// Pagination range for UI
const paginationRange = computed(() => {
  const range = [];
  const maxVisiblePages = 5;
  const ellipsis = -1;
  
  if (totalPages.value <= maxVisiblePages) {
    // Show all pages if there are few
    for (let i = 1; i <= totalPages.value; i++) {
      range.push(i);
    }
  } else {
    // Always show first page
    range.push(1);
    
    const leftSide = Math.floor(maxVisiblePages / 2);
    const rightSide = maxVisiblePages - leftSide - 1;
    
    // If current page is close to start
    if (currentPage.value <= leftSide + 1) {
      for (let i = 2; i <= maxVisiblePages - 1; i++) {
        range.push(i);
      }
      range.push(ellipsis);
      range.push(totalPages.value);
    } 
    // If current page is close to end
    else if (currentPage.value >= totalPages.value - rightSide) {
      range.push(ellipsis);
      for (let i = totalPages.value - maxVisiblePages + 2; i < totalPages.value; i++) {
        range.push(i);
      }
      range.push(totalPages.value);
    } 
    // If current page is in the middle
    else {
      range.push(ellipsis);
      for (let i = currentPage.value - 1; i <= currentPage.value + 1; i++) {
        range.push(i);
      }
      range.push(ellipsis);
      range.push(totalPages.value);
    }
  }
  
  return range;
});

// Filtering
const filters = ref({
  search: '',
  type: '',
  sortBy: 'createdAt:desc'
});

// For debouncing search input
let searchTimeout: number | null = null;

// Filtered and sorted assets
computed(() => {
  let result = [...assets.value];
  
  // Apply search filter
  if (filters.value.search) {
    const query = filters.value.search.toLowerCase();
    result = result.filter(asset => {
      // Search by filename or type
      const filename = getAssetName(asset).toLowerCase();
      const type = asset.type?.toLowerCase() || '';
      return filename.includes(query) || type.includes(query);
    });
  }
  
  // Apply type filter
  if (filters.value.type) {
    result = result.filter(asset => {
      if (filters.value.type === 'image') return isImageType(asset.type);
      if (filters.value.type === 'document') return isDocumentType(asset.type);
      if (filters.value.type === 'audio') return isAudioType(asset.type);
      if (filters.value.type === 'video') return isVideoType(asset.type);
      if (filters.value.type === 'other') return isOtherType(asset.type);
      return true;
    });
  }
  
  // Apply sorting
  const [field, direction] = filters.value.sortBy.split(':');
  result.sort((a, b) => {
    let valueA, valueB;
    
    if (field === 'createdAt') {
      valueA = new Date(a.createdAt || 0).getTime();
      valueB = new Date(b.createdAt || 0).getTime();
    } else if (field === 'size') {
      valueA = a.size || 0;
      valueB = b.size || 0;
    } else if (field === 'name') {
      valueA = getAssetName(a).toLowerCase();
      valueB = getAssetName(b).toLowerCase();
    } else {
      valueA = 0;
      valueB = 0;
    }
    
    if (direction === 'asc') {
      return valueA > valueB ? 1 : -1;
    } else {
      return valueA < valueB ? 1 : -1;
    }
  });
  
  return result;
});

// Fetch assets when component mounts
onMounted(async () => {
  await loadAssets();
});

// Load assets
async function loadAssets() {
  loading.value = true;
  error.value = null;
  
  try {
    // Build query params
    const params: Record<string, unknown> = {
      page: currentPage.value,
      limit: pageSize.value
    };
    
    // Add filters
    if (filters.value.search) params.search = filters.value.search;
    if (filters.value.type) params.type = filters.value.type;
    
    // Add sorting
    if (filters.value.sortBy) {
      const [field, order] = filters.value.sortBy.split(':');
      params.sort = field;
      params.order = order;
    }

    const assetsData = await assetsClient.getAssets(params as Record<string, string | number | boolean>);

    // Handle the response format
    assets.value = assetsData || [];
    // Note: Since our API doesn't return pagination metadata along with the results,
    // we're using the array length as a fallback for total count
    totalAssets.value = assetsData.length;
  } catch (err: unknown) {
    console.error('Failed to load assets:', err);
    const errorObj = err as { response?: { data?: { message?: string } } };
    error.value = errorObj.response?.data?.message || (err as Error).message || 'Failed to load assets';
  } finally {
    loading.value = false;
  }
}

// Handle the upload of a new asset
function handleAssetUploaded(event: { asset: IAsset; standalone: boolean }) {
  assets.value.unshift(event.asset);
  showUploadModal.value = false;
}

// Get filename from path
function getAssetName(asset?: IAsset): string {
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
  return date.toLocaleDateString();
}

// File type checks
function isImageType(type?: string): boolean {
  return !!type && type.startsWith('image/');
}

function isVideoType(type?: string): boolean {
  return !!type && type.startsWith('video/');
}

function isAudioType(type?: string): boolean {
  return !!type && type.startsWith('audio/');
}

function isDocumentType(type?: string): boolean {
  return !!type && (
    type.includes('pdf') ||
    type.includes('document') ||
    type.includes('spreadsheet') ||
    type.includes('presentation') ||
    type.includes('text/')
  );
}

function isOtherType(type?: string): boolean {
  if (!type) return true;
  return !(
    isImageType(type) ||
    isVideoType(type) ||
    isAudioType(type) ||
    isDocumentType(type)
  );
}

// // Get the appropriate icon for a file type
// function getFileIconClass(type?: string): string {
//   if (!type) return 'file';
  
//   if (isImageType(type)) return 'image';
//   if (isVideoType(type)) return 'video';
//   if (isAudioType(type)) return 'music';
//   if (type.includes('pdf')) return 'file-pdf';
//   if (type.includes('word') || type.includes('document')) return 'file-word';
//   if (type.includes('excel') || type.includes('spreadsheet')) return 'file-excel';
//   if (type.includes('powerpoint') || type.includes('presentation')) return 'file-powerpoint';
//   if (type.includes('zip') || type.includes('compressed')) return 'archive';
//   if (type.includes('text')) return 'file-alt';
//   if (type.includes('code') || type.includes('javascript') || type.includes('html')) return 'file-code';
  
//   return 'file';
// }

// Debounce search input
function debounceSearch() {
  if (searchTimeout) window.clearTimeout(searchTimeout);
  searchTimeout = window.setTimeout(() => {
    currentPage.value = 1; // Reset to first page
    loadAssets();
  }, 400);
}

// Change page function
function changePage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  loadAssets();
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Asset Library</h1>
      <button 
        @click="showUploadModal = true" 
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
      >
        Upload New Asset
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Search</label>
          <input 
            v-model="filters.search" 
            type="text" 
            placeholder="Search by name..."
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm"
            @input="debounceSearch"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Type</label>
          <select 
            v-model="filters.type" 
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm"
            @change="loadAssets"
          >
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="audio">Audio</option>
            <option value="video">Video</option>
            <option value="document">Documents</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Sort By</label>
          <select 
            v-model="filters.sortBy" 
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm"
            @change="loadAssets"
          >
            <option value="createdAt:desc">Newest First</option>
            <option value="createdAt:asc">Oldest First</option>
            <option value="name:asc">Name (A-Z)</option>
            <option value="name:desc">Name (Z-A)</option>
            <option value="size:desc">Size (Largest)</option>
            <option value="size:asc">Size (Smallest)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center my-12">
      <div class="flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Loading assets...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-6">
      <span class="block sm:inline">{{ error }}</span>
      <button 
        class="underline ml-4" 
        @click="loadAssets"
      >
        Try Again
      </button>
    </div>

    <!-- No Assets State -->
    <div v-else-if="assets.length === 0" class="text-center my-12">
      <p class="text-gray-600 dark:text-gray-400 mb-4">No assets found</p>
      <button 
        @click="showUploadModal = true" 
        class="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
      >
        Upload Your First Asset
      </button>
    </div>

    <!-- Asset Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <div 
        v-for="asset in assets" 
        :key="asset.id" 
        class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
      >
        <router-link :to="`/assets/${asset.id}`">
          <!-- Image Preview -->
          <div class="h-40 bg-gray-200 dark:bg-gray-700 relative">
            <!-- Image files -->
            <img 
              v-if="isImageType(asset.type)"
              :src="asset.url" 
              :alt="asset.metadata?.filename || 'Asset preview'" 
              class="w-full h-full object-cover"
            />
            
            <!-- Video files -->
            <div v-else-if="isVideoType(asset.type)" class="flex items-center justify-center h-full">
              <div class="text-center">
                <div class="mx-auto w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                  <i class="fas fa-film text-xl text-white"></i>
                </div>
                <span class="block mt-2 text-sm">Video</span>
              </div>
            </div>
            
            <!-- Audio files -->
            <div v-else-if="isAudioType(asset.type)" class="flex items-center justify-center h-full">
              <div class="text-center">
                <div class="mx-auto w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                  <i class="fas fa-music text-xl text-white"></i>
                </div>
                <span class="block mt-2 text-sm">Audio</span>
              </div>
            </div>
            
            <!-- PDF files -->
            <div v-else-if="asset.type === 'application/pdf'" class="flex items-center justify-center h-full">
              <div class="text-center">
                <div class="mx-auto w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                  <i class="fas fa-file-pdf text-xl text-white"></i>
                </div>
                <span class="block mt-2 text-sm">PDF</span>
              </div>
            </div>
            
            <!-- Other files -->
            <div v-else class="flex items-center justify-center h-full">
              <div class="text-center">
                <div class="mx-auto w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                  <i class="fas fa-file text-xl text-white"></i>
                </div>
                <span class="block mt-2 text-sm">File</span>
              </div>
            </div>
          </div>
          
          <div class="p-4">
            <h3 class="font-medium text-gray-900 dark:text-white truncate">
              {{ getAssetName(asset) }}
            </h3>
            <div class="mt-2 flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>{{ formatFileSize(asset.size) }}</span>
              <span>{{ formatDate(asset.createdAt) }}</span>
            </div>
          </div>
        </router-link>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center mt-8">
      <nav class="flex items-center space-x-2">
        <button 
          @click="changePage(currentPage - 1)" 
          :disabled="currentPage === 1"
          class="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50"
          :class="{ 'opacity-50 cursor-not-allowed': currentPage === 1 }"
        >
          Previous
        </button>
        
        <template v-for="page in paginationRange" :key="page">
          <div v-if="page === -1" class="px-3 py-1">...</div>
          <div v-else class="px-3 py-1 rounded-md cursor-pointer" 
            :class="currentPage === page 
              ? 'bg-blue-600 text-white' 
              : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'"
            @click="changePage(page)"
          >
            {{ page }}
          </div>
        </template>
        
        <button 
          @click="changePage(currentPage + 1)" 
          :disabled="currentPage === totalPages"
          class="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50"
          :class="{ 'opacity-50 cursor-not-allowed': currentPage === totalPages }"
        >
          Next
        </button>
      </nav>
    </div>
  </div>
  
  <!-- Upload Modal -->
  <div v-if="showUploadModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold">Upload New Asset</h3>
        <button 
          @click="showUploadModal = false" 
          class="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p class="mb-4 text-gray-600 dark:text-gray-400">Select a file to upload to your asset library.</p>
      <div class="flex justify-center">
        <AssetUpload @asset-uploaded="handleAssetUploaded" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.assets-list-view {
  min-height: 50vh;
}
</style> 