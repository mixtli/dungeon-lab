<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DocumentsClient, AssetsClient } from '@dungeon-lab/client/index.mjs';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';
import { ArrowLeftIcon, TrashIcon, CalendarIcon, TagIcon } from '@heroicons/vue/24/outline';
import { transformAssetUrl } from '@/utils/asset-utils.mjs';

const route = useRoute();
const router = useRouter();
const documentsClient = new DocumentsClient();
const assetsClient = new AssetsClient();

// State
const document = ref<BaseDocument | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const showDeleteModal = ref(false);
const deleting = ref(false);
const imageUrl = ref<string | undefined>();
const imageLoading = ref(false);

// Computed properties
const documentId = computed(() => route.params.id as string);

const formatDocumentType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'character': 'Character',
    'actor': 'Actor',
    'item': 'Item',
    'vtt-document': 'VTT Document'
  };
  return typeMap[type] || type;
};

const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
};

// Load document image
const loadDocumentImage = async (doc: BaseDocument) => {
  if (!doc) return;
  
  imageLoading.value = true;
  try {
    // Check various possible image field names
    const docWithImages = doc as { imageId?: string; avatarId?: string; thumbnailId?: string };
    const imageId = docWithImages.imageId || docWithImages.avatarId || docWithImages.thumbnailId;
    if (imageId) {
      const asset = await assetsClient.getAsset(imageId);
      if (asset && asset.url) {
        imageUrl.value = transformAssetUrl(asset.url);
      }
    }
  } catch (err) {
    console.warn('Failed to load image for document:', doc.name, err);
  } finally {
    imageLoading.value = false;
  }
};

// Load document details
const loadDocument = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const doc = await documentsClient.getDocument(documentId.value);
    if (!doc) {
      error.value = 'Document not found';
      return;
    }
    
    document.value = doc;
    await loadDocumentImage(doc);
  } catch (err: unknown) {
    console.error('Error loading document:', err);
    error.value = 'Failed to load document. Please try again later.';
  } finally {
    loading.value = false;
  }
};

// Handle delete
const confirmDelete = () => {
  showDeleteModal.value = true;
};

const handleDelete = async () => {
  if (!document.value?.id) return;
  
  deleting.value = true;
  try {
    await documentsClient.deleteDocument(document.value.id);
    // Navigate back to documents list
    router.push({ name: 'documents' });
  } catch (err) {
    console.error('Error deleting document:', err);
    error.value = 'Failed to delete document. Please try again.';
  } finally {
    deleting.value = false;
    showDeleteModal.value = false;
  }
};

const cancelDelete = () => {
  showDeleteModal.value = false;
};

// Navigation
const goBack = () => {
  router.back();
};

// Format plugin data for display
const formatPluginData = (data: Record<string, unknown>): string => {
  if (!data || typeof data !== 'object') return '';
  
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

// Check if plugin data should be displayed
const shouldShowPluginData = computed(() => {
  if (!document.value) return false;
  const docWithPluginData = document.value as { pluginData?: Record<string, unknown> };
  const pluginData = docWithPluginData.pluginData;
  return pluginData && typeof pluginData === 'object' && Object.keys(pluginData).length > 0;
});

// Load data on mount
onMounted(loadDocument);
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-gray-600">Loading document...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-12">
      <div class="mx-auto h-12 w-12 text-red-400 mb-4">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833-.23 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">{{ error }}</h3>
      <button
        @click="goBack"
        class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <ArrowLeftIcon class="h-4 w-4 mr-2" />
        Go Back
      </button>
    </div>

    <!-- Document details -->
    <div v-else-if="document" class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <button
          @click="goBack"
          class="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeftIcon class="h-4 w-4 mr-2" />
          Back
        </button>
        
        <button
          @click="confirmDelete"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <TrashIcon class="h-4 w-4 mr-2" />
          Delete
        </button>
      </div>

      <!-- Main content -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <!-- Document header -->
        <div class="px-6 py-8 border-b border-gray-200">
          <div class="flex items-start space-x-6">
            <!-- Image -->
            <div class="flex-shrink-0">
              <div v-if="imageLoading" class="w-32 h-32 bg-gray-100 rounded-lg animate-pulse"></div>
              <img
                v-else-if="imageUrl"
                :src="imageUrl"
                :alt="document.name"
                class="w-32 h-32 rounded-lg object-cover border border-gray-300"
              >
              <div
                v-else
                class="w-32 h-32 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center"
              >
                <span class="text-gray-400 text-2xl font-bold">{{ document.documentType?.charAt(0).toUpperCase() }}</span>
              </div>
            </div>

            <!-- Document info -->
            <div class="flex-1 min-w-0">
              <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ document.name }}</h1>
              
              <!-- Document type badge -->
              <div class="mb-4">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  <TagIcon class="h-4 w-4 mr-1" />
                  {{ formatDocumentType(document.documentType) }}
                </span>
              </div>

              <!-- Description -->
              <div v-if="(document as any).description" class="mb-4">
                <p class="text-gray-700">{{ (document as any).description }}</p>
              </div>

              <!-- Metadata -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                <div v-if="'createdAt' in document && document.createdAt" class="flex items-center">
                  <CalendarIcon class="h-4 w-4 mr-2" />
                  <span>Created: {{ formatDate(document.createdAt as string) }}</span>
                </div>
                <div v-if="'updatedAt' in document && document.updatedAt" class="flex items-center">
                  <CalendarIcon class="h-4 w-4 mr-2" />
                  <span>Updated: {{ formatDate(document.updatedAt as string) }}</span>
                </div>
                <div v-if="(document as any).pluginId" class="flex items-center">
                  <TagIcon class="h-4 w-4 mr-2" />
                  <span>Plugin: {{ (document as any).pluginId }}</span>
                </div>
                <div v-if="document.id" class="flex items-center">
                  <TagIcon class="h-4 w-4 mr-2" />
                  <span>ID: {{ document.id }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Document data sections -->
        <div class="px-6 py-6 space-y-6">
          <!-- Plugin Data -->
          <div v-if="shouldShowPluginData" class="border-t border-gray-200 pt-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Plugin Data</h3>
            <div class="bg-gray-50 rounded-lg p-4">
              <pre class="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">{{ formatPluginData((document as any).pluginData) }}</pre>
            </div>
          </div>

          <!-- Item State (for items) -->
          <div v-if="document.documentType === 'item' && (document as any).itemState" class="border-t border-gray-200 pt-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Item State</h3>
            <div class="bg-gray-50 rounded-lg p-4">
              <pre class="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">{{ formatPluginData((document as any).itemState) }}</pre>
            </div>
          </div>

          <!-- User Data -->
          <div v-if="(document as any).userData && Object.keys((document as any).userData).length > 0" class="border-t border-gray-200 pt-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">User Data</h3>
            <div class="bg-gray-50 rounded-lg p-4">
              <pre class="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">{{ formatPluginData((document as any).userData) }}</pre>
            </div>
          </div>

          <!-- Raw Document (for debugging) -->
          <div class="border-t border-gray-200 pt-6">
            <details class="group">
              <summary class="cursor-pointer text-lg font-medium text-gray-900 mb-4 hover:text-gray-700">
                Raw Document Data
                <span class="ml-2 text-sm text-gray-500">(for debugging)</span>
              </summary>
              <div class="bg-gray-50 rounded-lg p-4 mt-2">
                <pre class="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">{{ JSON.stringify(document, null, 2) }}</pre>
              </div>
            </details>
          </div>
        </div>
      </div>
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
              Are you sure you want to delete "{{ document?.name }}"? This action cannot be undone.
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