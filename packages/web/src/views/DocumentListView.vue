<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { DocumentsClient, AssetsClient } from '@dungeon-lab/client/index.mjs';
import type { BaseDocument, IAsset, DocumentType } from '@dungeon-lab/shared/types/index.mjs';
import { EyeIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline';
import { useDeviceAdaptation } from '@/composables/useDeviceAdaptation.mts';
import { transformAssetUrl } from '@/utils/asset-utils.mjs';

const documentsClient = new DocumentsClient();
const assetsClient = new AssetsClient();
const { isMobile } = useDeviceAdaptation();

// State for documents and UI
const documents = ref<BaseDocument[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showDeleteModal = ref(false);
const documentToDelete = ref<BaseDocument | null>(null);
const deleting = ref(false);

// Pagination
const totalDocuments = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const totalPages = computed(() => Math.ceil(totalDocuments.value / pageSize.value));

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
  documentType: '',
  sortBy: 'createdAt:desc'
});

// Document type options for filtering
const documentTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'character', label: 'Characters' },
  { value: 'actor', label: 'Actors' },
  { value: 'item', label: 'Items' },
  { value: 'vtt-document', label: 'VTT Documents' }
];

// For debouncing search input
let searchTimeout: number | null = null;

// Cache for asset URLs to avoid repeated API calls
const assetUrlCache = ref<Map<string, string>>(new Map());

// Function to get the thumbnail URL for a document
const getThumbnailUrl = async (document: BaseDocument): Promise<string | undefined> => {
  try {
    // Check various possible image field names
    const imageId = (document as any).imageId || (document as any).avatarId || (document as any).thumbnailId;
    if (imageId) {
      // Check cache first
      if (assetUrlCache.value.has(imageId)) {
        return assetUrlCache.value.get(imageId);
      }
      
      // Fetch asset from API
      const asset = await assetsClient.getAsset(imageId);
      if (asset && asset.url) {
        const transformedUrl = transformAssetUrl(asset.url);
        // Cache the result
        assetUrlCache.value.set(imageId, transformedUrl);
        return transformedUrl;
      }
    }
  } catch (err) {
    console.warn('Failed to load thumbnail for document:', document.name, err);
  }
  
  return undefined;
};

// Reactive thumbnail URLs for each document
const documentThumbnails = ref<Map<string, string>>(new Map());

// Load thumbnail URLs for all documents
const loadDocumentThumbnails = async () => {
  const thumbnailPromises = documents.value.map(async (document) => {
    if (document.id) {
      const thumbnailUrl = await getThumbnailUrl(document);
      if (thumbnailUrl) {
        documentThumbnails.value.set(document.id, thumbnailUrl);
      }
    }
  });
  
  await Promise.all(thumbnailPromises);
};

// Get cached thumbnail URL for a document
const getCachedThumbnailUrl = (document: BaseDocument): string | undefined => {
  return document.id ? documentThumbnails.value.get(document.id) : undefined;
};

// Format document type for display
const formatDocumentType = (type: string): string => {
  const option = documentTypeOptions.find(opt => opt.value === type);
  return option?.label || type;
};

// Format date for display
const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};

// Load documents
async function loadDocuments() {
  loading.value = true;
  error.value = null;
  
  try {
    const searchParams: any = {};
    
    // Add search filter
    if (filters.value.search.trim()) {
      searchParams.name = filters.value.search.trim();
    }
    
    // Add document type filter
    if (filters.value.documentType) {
      searchParams.documentType = filters.value.documentType;
    }
    
    // For now, we'll use the simple getDocuments method
    // In the future, this could be enhanced with proper pagination support
    const allDocuments = await documentsClient.getDocuments(searchParams);
    
    // Apply client-side pagination for now
    const startIndex = (currentPage.value - 1) * pageSize.value;
    const endIndex = startIndex + pageSize.value;
    
    documents.value = allDocuments.slice(startIndex, endIndex);
    totalDocuments.value = allDocuments.length;
    
    // Load thumbnail URLs for all documents
    await loadDocumentThumbnails();
  } catch (err: unknown) {
    console.error('Error loading documents:', err);
    error.value = 'Failed to load documents. Please try again later.';
  } finally {
    loading.value = false;
  }
}

// Handle search input with debouncing
const handleSearchInput = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  searchTimeout = window.setTimeout(() => {
    currentPage.value = 1; // Reset to first page
    loadDocuments();
  }, 300);
};

// Handle filter changes
const handleFilterChange = () => {
  currentPage.value = 1; // Reset to first page
  loadDocuments();
};

// Handle pagination
const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    loadDocuments();
  }
};

// Handle delete
const confirmDelete = (document: BaseDocument) => {
  documentToDelete.value = document;
  showDeleteModal.value = true;
};

const handleDelete = async () => {
  if (!documentToDelete.value?.id) return;
  
  deleting.value = true;
  try {
    await documentsClient.deleteDocument(documentToDelete.value.id);
    showDeleteModal.value = false;
    documentToDelete.value = null;
    // Reload current page
    await loadDocuments();
  } catch (err) {
    console.error('Error deleting document:', err);
    error.value = 'Failed to delete document. Please try again.';
  } finally {
    deleting.value = false;
  }
};

const cancelDelete = () => {
  showDeleteModal.value = false;
  documentToDelete.value = null;
};

// Load data on mount
onMounted(loadDocuments);

// Watch for filter changes
watch(() => filters.value.documentType, handleFilterChange);
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-4 md:mb-0">All Documents</h1>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Search -->
        <div class="relative">
          <label for="search" class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <div class="relative">
            <input
              id="search"
              v-model="filters.search"
              type="text"
              placeholder="Search documents..."
              class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @input="handleSearchInput"
            >
            <MagnifyingGlassIcon class="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <!-- Document Type Filter -->
        <div>
          <label for="documentType" class="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
          <select
            id="documentType"
            v-model="filters.documentType"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option v-for="option in documentTypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <!-- Sort -->
        <div>
          <label for="sortBy" class="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
          <select
            id="sortBy"
            v-model="filters.sortBy"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            @change="handleFilterChange"
          >
            <option value="createdAt:desc">Newest First</option>
            <option value="createdAt:asc">Oldest First</option>
            <option value="name:asc">Name (A-Z)</option>
            <option value="name:desc">Name (Z-A)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-gray-600">Loading documents...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">{{ error }}</p>
    </div>

    <!-- Documents list -->
    <div v-else-if="documents.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="document in documents" :key="document.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <!-- Thumbnail -->
                  <div class="flex-shrink-0 h-12 w-12">
                    <img
                      v-if="getCachedThumbnailUrl(document)"
                      :src="getCachedThumbnailUrl(document)"
                      :alt="document.name"
                      class="h-12 w-12 rounded-lg object-cover border border-gray-200"
                    >
                    <div
                      v-else
                      class="h-12 w-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center"
                    >
                      <span class="text-gray-400 text-xs font-medium">{{ document.documentType?.charAt(0).toUpperCase() }}</span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ document.name }}</div>
                    <div v-if="(document as any).description" class="text-sm text-gray-500 truncate max-w-xs">
                      {{ (document as any).description }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ formatDocumentType(document.documentType) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(document.createdAt || '') }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-2">
                  <RouterLink
                    :to="{ name: 'document-detail', params: { id: document.id } }"
                    class="inline-flex items-center p-2 border border-transparent rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                    title="View details"
                  >
                    <EyeIcon class="h-4 w-4" />
                  </RouterLink>
                  <button
                    @click="confirmDelete(document)"
                    class="inline-flex items-center p-2 border border-transparent rounded-md text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors"
                    title="Delete document"
                  >
                    <TrashIcon class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
        <div class="flex items-center justify-between">
          <div class="flex-1 flex justify-between sm:hidden">
            <button
              :disabled="currentPage <= 1"
              @click="goToPage(currentPage - 1)"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              :disabled="currentPage >= totalPages"
              @click="goToPage(currentPage + 1)"
              class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                Showing
                <span class="font-medium">{{ (currentPage - 1) * pageSize + 1 }}</span>
                to
                <span class="font-medium">{{ Math.min(currentPage * pageSize, totalDocuments) }}</span>
                of
                <span class="font-medium">{{ totalDocuments }}</span>
                results
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  :disabled="currentPage <= 1"
                  @click="goToPage(currentPage - 1)"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <template v-for="page in paginationRange" :key="page">
                  <span
                    v-if="page === -1"
                    class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                  >
                    ...
                  </span>
                  <button
                    v-else
                    @click="goToPage(page)"
                    :class="[
                      'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                      page === currentPage
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    ]"
                  >
                    {{ page }}
                  </button>
                </template>
                
                <button
                  :disabled="currentPage >= totalPages"
                  @click="goToPage(currentPage + 1)"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-12">
      <div class="mx-auto h-12 w-12 text-gray-400">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
      <p class="mt-1 text-sm text-gray-500">
        {{ filters.search || filters.documentType ? 'Try adjusting your search or filters.' : 'No documents have been created yet.' }}
      </p>
    </div>

    <!-- Delete confirmation modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      @click="cancelDelete"
    >
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" @click.stop>
        <div class="mt-3 text-center">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <TrashIcon class="h-6 w-6 text-red-600" />
          </div>
          <h3 class="text-lg font-medium text-gray-900 mt-4">Delete Document</h3>
          <div class="mt-2 px-7 py-3">
            <p class="text-sm text-gray-500">
              Are you sure you want to delete "{{ documentToDelete?.name }}"? This action cannot be undone.
            </p>
          </div>
          <div class="flex justify-center space-x-4 mt-4">
            <button
              @click="cancelDelete"
              class="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
              :disabled="deleting"
            >
              Cancel
            </button>
            <button
              @click="handleDelete"
              class="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              :disabled="deleting"
            >
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>