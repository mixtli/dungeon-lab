<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { CompendiumsClient } from '@dungeon-lab/client/index.mjs';
import type { ICompendium } from '@dungeon-lab/shared/types/index.mjs';

const compendiumsClient = new CompendiumsClient();

// State for compendiums and UI
const compendiums = ref<ICompendium[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showImportModal = ref(false);

// Pagination
const totalCompendiums = ref(0);
const currentPage = ref(1);
const pageSize = ref(12);
const totalPages = computed(() => Math.ceil(totalCompendiums.value / pageSize.value));

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
  gameSystemId: '',
  status: '',
  isPublic: '',
  sortBy: 'createdAt:desc'
});

// For debouncing search input
let searchTimeout: number | null = null;

// Fetch compendiums when component mounts
onMounted(async () => {
  await loadCompendiums();
});

// Load compendiums
async function loadCompendiums() {
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
    if (filters.value.gameSystemId) params.gameSystemId = filters.value.gameSystemId;
    if (filters.value.status) params.status = filters.value.status;
    if (filters.value.isPublic) params.isPublic = filters.value.isPublic === 'true';
    
    // Add sorting
    if (filters.value.sortBy) {
      const [field, order] = filters.value.sortBy.split(':');
      params.sort = field;
      params.order = order;
    }

    const compendiumData = await compendiumsClient.getCompendiums(params as Record<string, string | number | boolean>);

    // Handle the response format
    compendiums.value = compendiumData || [];
    // Note: Since our API doesn't return pagination metadata along with the results,
    // we're using the array length as a fallback for total count
    totalCompendiums.value = compendiumData.length;
  } catch (err: unknown) {
    console.error('Failed to load compendiums:', err);
    const errorObj = err as { response?: { data?: { message?: string } } };
    error.value = errorObj.response?.data?.message || (err as Error).message || 'Failed to load compendiums';
  } finally {
    loading.value = false;
  }
}

// Format date
function formatDate(dateString?: Date | string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

// Get status badge color
function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'draft': return 'bg-yellow-100 text-yellow-800';
    case 'importing': return 'bg-blue-100 text-blue-800';
    case 'error': return 'bg-red-100 text-red-800';
    case 'archived': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

// Debounce search input
function debounceSearch() {
  if (searchTimeout) window.clearTimeout(searchTimeout);
  searchTimeout = window.setTimeout(() => {
    currentPage.value = 1; // Reset to first page
    loadCompendiums();
  }, 400);
}

// Change page function
function changePage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  loadCompendiums();
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Compendium Library</h1>
      <button 
        @click="showImportModal = true" 
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
      >
        Import Compendium
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Search</label>
          <input 
            v-model="filters.search" 
            type="text" 
            placeholder="Search compendiums..."
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm"
            @input="debounceSearch"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Game System</label>
          <select 
            v-model="filters.gameSystemId" 
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm"
            @change="loadCompendiums"
          >
            <option value="">All Systems</option>
            <option value="dnd5e">D&D 5e</option>
            <option value="pathfinder2e">Pathfinder 2e</option>
            <option value="call-of-cthulhu">Call of Cthulhu</option>
            <option value="vampire">Vampire</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Status</label>
          <select 
            v-model="filters.status" 
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm"
            @change="loadCompendiums"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="importing">Importing</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Visibility</label>
          <select 
            v-model="filters.isPublic" 
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm"
            @change="loadCompendiums"
          >
            <option value="">All</option>
            <option value="true">Public</option>
            <option value="false">Private</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Sort By</label>
          <select 
            v-model="filters.sortBy" 
            class="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm"
            @change="loadCompendiums"
          >
            <option value="createdAt:desc">Newest First</option>
            <option value="createdAt:asc">Oldest First</option>
            <option value="name:asc">Name (A-Z)</option>
            <option value="name:desc">Name (Z-A)</option>
            <option value="totalEntries:desc">Most Entries</option>
            <option value="totalEntries:asc">Fewest Entries</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center my-12">
      <div class="flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Loading compendiums...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-6">
      <span class="block sm:inline">{{ error }}</span>
      <button 
        class="underline ml-4" 
        @click="loadCompendiums"
      >
        Try Again
      </button>
    </div>

    <!-- No Compendiums State -->
    <div v-else-if="compendiums.length === 0" class="text-center my-12">
      <div class="mb-6">
        <div class="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <i class="fas fa-book text-2xl text-gray-400"></i>
        </div>
      </div>
      <p class="text-gray-600 dark:text-gray-400 mb-4">No compendiums found</p>
      <p class="text-sm text-gray-500 dark:text-gray-500 mb-6">Import your first compendium to get started with content management</p>
      <button 
        @click="showImportModal = true" 
        class="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
      >
        Import Your First Compendium
      </button>
    </div>

    <!-- Compendium Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="compendium in compendiums" 
        :key="compendium.id" 
        class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
      >
        <router-link :to="`/compendiums/${compendium.id}`">
          <!-- Header -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-lg text-gray-900 dark:text-white truncate">
                  {{ compendium.name }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {{ compendium.gameSystemId || 'Unknown System' }}
                </p>
              </div>
              <span 
                :class="getStatusBadgeClass(compendium.status || 'draft')"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
              >
                {{ compendium.status || 'draft' }}
              </span>
            </div>
          </div>

          <!-- Content -->
          <div class="p-4">
            <p class="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
              {{ compendium.description || 'No description available' }}
            </p>
            
            <!-- Stats -->
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {{ compendium.totalEntries || 0 }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">Entries</div>
              </div>
              <div class="text-center">
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ compendium.version || '1.0.0' }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">Version</div>
              </div>
            </div>

            <!-- Entry Types -->
            <div v-if="compendium.entriesByType && Object.keys(compendium.entriesByType).length > 0" class="mb-4">
              <div class="flex flex-wrap gap-1">
                <span 
                  v-for="(count, type) in compendium.entriesByType" 
                  :key="type"
                  class="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                >
                  {{ type }}: {{ count }}
                </span>
              </div>
            </div>

            <!-- Tags -->
            <div v-if="compendium.tags && compendium.tags.length > 0" class="mb-4">
              <div class="flex flex-wrap gap-1">
                <span 
                  v-for="tag in compendium.tags.slice(0, 3)" 
                  :key="tag"
                  class="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                >
                  {{ tag }}
                </span>
                <span 
                  v-if="compendium.tags.length > 3"
                  class="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                >
                  +{{ compendium.tags.length - 3 }} more
                </span>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
              <span class="flex items-center">
                <i :class="compendium.isPublic ? 'fas fa-globe' : 'fas fa-lock'" class="mr-1"></i>
                {{ compendium.isPublic ? 'Public' : 'Private' }}
              </span>
              <span>{{ formatDate((compendium as any).createdAt) }}</span>
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
  
  <!-- Import Modal Placeholder -->
  <div v-if="showImportModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold">Import Compendium</h3>
        <button 
          @click="showImportModal = false" 
          class="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p class="mb-4 text-gray-600 dark:text-gray-400">Import functionality will be implemented in a future phase.</p>
      <div class="flex justify-end">
        <button 
          @click="showImportModal = false"
          class="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-md transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>