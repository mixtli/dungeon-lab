<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { CompendiumsClient } from '@dungeon-lab/client/index.mjs';
import type { ICompendiumEntry, ICompendium } from '@dungeon-lab/shared/types/index.mjs';
import { pluginRegistry } from '../../services/plugin-registry.mjs';

// Props
const props = defineProps<{
  compendiumId: string;
}>();

const compendiumsClient = new CompendiumsClient();
const router = useRouter();

// Template instantiation state
const instantiating = ref(false);
const showInstantiateModal = ref(false);
const entryToInstantiate = ref<ICompendiumEntry | null>(null);

// State
const entries = ref<ICompendiumEntry[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const showDeleteModal = ref(false);
const entryToDelete = ref<ICompendiumEntry | null>(null);
const deleting = ref(false);
const compendium = ref<ICompendium | null>(null);
const availableDocumentTypes = ref<string[]>([]);

// Pagination
const currentPage = ref(1);
const pageSize = ref(20);
const totalEntries = ref(0);
const totalPages = computed(() => Math.ceil(totalEntries.value / pageSize.value));

// Filtering
const filters = ref({
  search: '',
  contentType: '',
  pluginDocumentType: '',
  category: '',
  sortBy: 'createdAt:desc'
});

// For debouncing search input
let searchTimeout: number | null = null;

// Load compendium data to get plugin information
async function loadCompendiumData() {
  try {
    compendium.value = await compendiumsClient.getCompendium(props.compendiumId);
    
    // Get plugin manifest and extract document types
    if (compendium.value?.pluginId) {
      const manifest = pluginRegistry.getPluginManifest(compendium.value.pluginId);
      if (manifest?.documentTypes) {
        availableDocumentTypes.value = manifest.documentTypes;
      }
    }
  } catch (err: unknown) {
    console.error('Failed to load compendium data:', err);
  }
}

// Load entries when component mounts
onMounted(async () => {
  await loadCompendiumData();
  await loadEntries();
});

// Load compendium entries
async function loadEntries() {
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
    if (filters.value.contentType) params.contentType = filters.value.contentType;
    if (filters.value.pluginDocumentType) params.pluginDocumentType = filters.value.pluginDocumentType;
    if (filters.value.category) params.category = filters.value.category;
    
    // Add sorting
    if (filters.value.sortBy) {
      const [field, order] = filters.value.sortBy.split(':');
      params.sort = field;
      params.order = order;
    }

    const result = await compendiumsClient.getCompendiumEntries(
      props.compendiumId, 
      params as Record<string, string | number | boolean>
    );

    entries.value = result.entries || [];
    totalEntries.value = result.total;
  } catch (err: unknown) {
    console.error('Failed to load compendium entries:', err);
    const errorObj = err as { response?: { data?: { message?: string } } };
    error.value = errorObj.response?.data?.message || (err as Error).message || 'Failed to load entries';
  } finally {
    loading.value = false;
  }
}

// Delete entry
async function deleteEntry(entry: ICompendiumEntry) {
  if (!entry) return;
  
  deleting.value = true;
  try {
    await compendiumsClient.deleteCompendiumEntry(entry.id);
    await loadEntries(); // Reload the list
    showDeleteModal.value = false;
    entryToDelete.value = null;
  } catch (err: unknown) {
    console.error('Failed to delete entry:', err);
    const errorObj = err as { response?: { data?: { message?: string } } };
    error.value = errorObj.response?.data?.message || (err as Error).message || 'Failed to delete entry';
  } finally {
    deleting.value = false;
  }
}

// Show delete confirmation
function confirmDelete(entry: ICompendiumEntry) {
  entryToDelete.value = entry;
  showDeleteModal.value = true;
}

// Show instantiate confirmation
function confirmInstantiate(entry: ICompendiumEntry) {
  entryToInstantiate.value = entry;
  showInstantiateModal.value = true;
}

// Instantiate template
async function instantiateTemplate(entry: ICompendiumEntry) {
  if (!entry) return;
  
  instantiating.value = true;
  try {
    const result = await compendiumsClient.instantiateTemplate(
      props.compendiumId, 
      entry.id,
      {} // Could be extended to allow custom overrides
    );
    
    // Show success message or navigate to the created content
    showInstantiateModal.value = false;
    entryToInstantiate.value = null;
    
    // Optional: Navigate to the created content or show success toast
    console.log('Template instantiated successfully:', result);
    
  } catch (err: unknown) {
    console.error('Failed to instantiate template:', err);
    const errorObj = err as { response?: { data?: { message?: string } } };
    error.value = errorObj.response?.data?.message || (err as Error).message || 'Failed to instantiate template';
  } finally {
    instantiating.value = false;
  }
}

// Extended interface for entries with populated image objects
interface ICompendiumEntryWithImage extends ICompendiumEntry {
  image?: {
    url: string;
    [key: string]: unknown;
  };
  contentType?: string; // Legacy field for backward compatibility
}

// Get content type icon and color
function getContentTypeIcon(entry: ICompendiumEntryWithImage): string {
  const contentType = entry.entry.documentType;
  switch (contentType) {
    case 'actor': return 'fas fa-users';
    case 'item': return 'fas fa-sword';
    case 'vtt-document': return 'fas fa-scroll';
    default: return 'fas fa-file';
  }
}

function getContentTypeColor(entry: ICompendiumEntryWithImage): string {
  const contentType = entry.entry.documentType;
  switch (contentType) {
    case 'actor': return 'text-blue-600';
    case 'item': return 'text-green-600';
    case 'vtt-document': return 'text-purple-600';
    default: return 'text-gray-600';
  }
}

// Get display name for content type
function getContentTypeDisplayName(entry: ICompendiumEntryWithImage): string {
  const contentType = entry.entry.documentType;
  switch (contentType) {
    case 'actor': return 'Actor';
    case 'item': return 'Item';
    case 'vtt-document': return 'Document';
    default: return 'Unknown';
  }
}

// Format date
function formatDate(dateString?: Date | string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

// Debounce search input
function debounceSearch() {
  if (searchTimeout) window.clearTimeout(searchTimeout);
  searchTimeout = window.setTimeout(() => {
    currentPage.value = 1; // Reset to first page
    loadEntries();
  }, 400);
}

// Change page function
function changePage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  loadEntries();
}

// Simple pagination range (simplified version)
const paginationRange = computed(() => {
  const range = [];
  const maxVisible = 5;
  
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages.value, start + maxVisible - 1);
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }
  
  for (let i = start; i <= end; i++) {
    range.push(i);
  }
  
  return range;
});

// Get image URL for entry based on content type
function getEntryImage(entry: ICompendiumEntryWithImage): string | undefined {
  // Use entry-level image first (from wrapper format)
  if (entry.image?.url) {
    return entry.image.url;
  }
  
  // Use content-level images based on content type
  if (!entry.content) return undefined;
  
  const content = entry.content as {
    avatarId?: { url: string };
    defaultTokenImageId?: { url: string };
    imageId?: { url: string };
  };
  
  // For characters, prefer avatarId, fallback to defaultTokenImageId
  if (entry.entry.documentType === 'character') {
    if (content.avatarId?.url) {
      return content.avatarId.url;
    }
    if (content.defaultTokenImageId?.url) {
      return content.defaultTokenImageId.url;
    }
  }
  
  // For items and documents, use imageId
  if (entry.entry.documentType === 'item' || entry.entry.documentType === 'vtt-document') {
    if (content.imageId?.url) {
      return content.imageId.url;
    }
  }
  
  return undefined;
}

// Navigation function
function navigateToEntry(entry: ICompendiumEntry) {
  if (!entry.id) {
    console.error('Cannot navigate to entry: missing ID', entry);
    error.value = 'This entry is missing an ID and cannot be opened';
    return;
  }

  router.push({
    name: 'compendium-entry-detail',
    params: {
      compendiumId: props.compendiumId,
      entryId: entry.id
    }
  });
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Compendium Entries</h2>
      <button 
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
        @click="$router.push(`/compendiums/${compendiumId}/add-entry`)"
      >
        <i class="fas fa-plus mr-2"></i>
        Add Entry
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Search</label>
          <input 
            v-model="filters.search" 
            type="text" 
            placeholder="Search entries..."
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm"
            @input="debounceSearch"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Content Type</label>
          <select 
            v-model="filters.contentType" 
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm"
            @change="currentPage = 1; loadEntries()"
          >
            <option value="">All Types</option>
            <option value="actor">Actors</option>
            <option value="item">Items</option>
            <option value="vtt-document">Documents</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Plugin Document Type</label>
          <select 
            v-model="filters.pluginDocumentType" 
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm"
            @change="currentPage = 1; loadEntries()"
          >
            <option value="">All Plugin Types</option>
            <option 
              v-for="docType in availableDocumentTypes" 
              :key="docType"
              :value="docType"
            >
              {{ docType.charAt(0).toUpperCase() + docType.slice(1) }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Category</label>
          <select 
            v-model="filters.category" 
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm"
            @change="currentPage = 1; loadEntries()"
          >
            <option value="">All Categories</option>
            <option value="core">Core</option>
            <option value="optional">Optional</option>
            <option value="expansion">Expansion</option>
            <option value="homebrew">Homebrew</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Sort By</label>
          <select 
            v-model="filters.sortBy" 
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm"
            @change="currentPage = 1; loadEntries()"
          >
            <option value="createdAt:desc">Newest First</option>
            <option value="createdAt:asc">Oldest First</option>
            <option value="name:asc">Name (A-Z)</option>
            <option value="name:desc">Name (Z-A)</option>
            <option value="contentType:asc">Type (A-Z)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center my-12">
      <div class="flex flex-col items-center">
        <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Loading entries...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-6">
      <span class="block sm:inline">{{ error }}</span>
      <button 
        class="underline ml-4" 
        @click="loadEntries"
      >
        Try Again
      </button>
    </div>

    <!-- No Entries State -->
    <div v-else-if="entries.length === 0" class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
      <div class="mb-4">
        <div class="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <i class="fas fa-list text-xl text-gray-400"></i>
        </div>
      </div>
      <p class="text-gray-600 dark:text-gray-400 mb-2">No entries found</p>
      <p class="text-sm text-gray-500 dark:text-gray-500 mb-4">This compendium doesn't have any entries yet</p>
      <button 
        class="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
        @click="$router.push(`/compendiums/${compendiumId}/add-entry`)"
      >
        Add First Entry
      </button>
    </div>

    <!-- Entries List -->
    <div v-else class="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-md">
      <ul class="divide-y divide-gray-200 dark:divide-gray-700">
        <li 
          v-for="entry in entries" 
          :key="entry.id"
          class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
          @click="navigateToEntry(entry)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4 flex-1 min-w-0">
              <div class="flex-shrink-0">
                <!-- Image if available, otherwise fallback to icon -->
                <div v-if="getEntryImage(entry)" class="w-10 h-10 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <img 
                    :src="getEntryImage(entry)" 
                    :alt="entry.entry.name"
                    class="w-full h-full object-cover"
                    @error="($event.target as HTMLElement).style.display = 'none'; (($event.target as HTMLElement).nextElementSibling as HTMLElement).style.display = 'flex'"
                  />
                  <div class="w-full h-full hidden items-center justify-center">
                    <i 
                      :class="[getContentTypeIcon(entry), getContentTypeColor(entry)]"
                      class="text-lg"
                    ></i>
                  </div>
                </div>
                <!-- Fallback icon when no image -->
                <div v-else class="w-10 h-10 flex items-center justify-center">
                  <i 
                    :class="[getContentTypeIcon(entry), getContentTypeColor(entry)]"
                    class="text-xl"
                  ></i>
                </div>
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2 mb-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {{ entry.entry.name }}
                  </p>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    {{ getContentTypeDisplayName(entry) }}
                  </span>
                  <span v-if="entry.entry.category" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {{ entry.entry.category }}
                  </span>
                </div>
                
                <div class="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>Created {{ formatDate((entry as any).createdAt) }}</span>
                  <span v-if="entry.entry.tags && entry.entry.tags.length > 0" class="flex items-center space-x-1">
                    <i class="fas fa-tags"></i>
                    <span>{{ entry.entry.tags.slice(0, 2).join(', ') }}{{ entry.entry.tags.length > 2 ? ` +${entry.entry.tags.length - 2}` : '' }}</span>
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center space-x-2">
              <button 
                class="text-green-600 hover:text-green-700 p-2 rounded-md hover:bg-green-50 dark:hover:bg-green-900"
                @click.stop="confirmInstantiate(entry)"
                title="Create from template"
              >
                <i class="fas fa-plus-circle"></i>
              </button>
              <button 
                class="text-blue-600 hover:text-blue-700 p-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900"
                @click.stop="$router.push(`/compendiums/${compendiumId}/entries/${entry.id}/edit`)"
                title="Edit entry"
              >
                <i class="fas fa-edit"></i>
              </button>
              <button 
                class="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900"
                @click.stop="confirmDelete(entry)"
                title="Delete entry"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center mt-6">
      <nav class="flex items-center space-x-2">
        <button 
          @click="changePage(currentPage - 1)" 
          :disabled="currentPage === 1"
          class="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50"
          :class="{ 'opacity-50 cursor-not-allowed': currentPage === 1 }"
        >
          Previous
        </button>
        
        <div 
          v-for="page in paginationRange" 
          :key="page"
          class="px-3 py-1 rounded-md cursor-pointer" 
          :class="currentPage === page 
            ? 'bg-blue-600 text-white' 
            : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'"
          @click="changePage(page)"
        >
          {{ page }}
        </div>
        
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

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <div class="flex items-center mb-4">
          <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <i class="fas fa-exclamation-triangle text-red-600"></i>
          </div>
        </div>
        
        <div class="text-center">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Delete Entry
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete "{{ entryToDelete?.entry.name }}"? This action cannot be undone.
          </p>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showDeleteModal = false; entryToDelete = null"
            :disabled="deleting"
            class="px-4 py-2 bg-gray-300 hover:bg-gray-400 disabled:opacity-50 text-gray-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="deleteEntry(entryToDelete!)"
            :disabled="deleting"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-md transition-colors flex items-center"
          >
            <div v-if="deleting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Instantiate Template Confirmation Modal -->
    <div v-if="showInstantiateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <div class="flex items-center mb-4">
          <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <i class="fas fa-plus-circle text-green-600"></i>
          </div>
        </div>
        
        <div class="text-center">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Create from Template
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            This will create a new {{ getContentTypeDisplayName(entryToInstantiate!).toLowerCase() }} based on "{{ entryToInstantiate?.entry.name }}" that you can customize and use in your world.
          </p>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showInstantiateModal = false; entryToInstantiate = null"
            :disabled="instantiating"
            class="px-4 py-2 bg-gray-300 hover:bg-gray-400 disabled:opacity-50 text-gray-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="instantiateTemplate(entryToInstantiate!)"
            :disabled="instantiating"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-md transition-colors flex items-center"
          >
            <div v-if="instantiating" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            {{ instantiating ? 'Creating...' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>