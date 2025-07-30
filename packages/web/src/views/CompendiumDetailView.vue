<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { CompendiumsClient } from '@dungeon-lab/client/index.mjs';
import type { ICompendium } from '@dungeon-lab/shared/types/index.mjs';
import CompendiumEntriesList from '../components/compendium/CompendiumEntriesList.vue';

const route = useRoute();
const router = useRouter();
const compendiumsClient = new CompendiumsClient();

// State
const compendium = ref<ICompendium | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const showDeleteModal = ref(false);
const deleting = ref(false);

// Get compendium ID from route
const compendiumId = route.params.id as string;

// Load compendium data
onMounted(async () => {
  await loadCompendium();
});

async function loadCompendium() {
  loading.value = true;
  error.value = null;
  
  try {
    const compendiumData = await compendiumsClient.getCompendium(compendiumId);
    compendium.value = compendiumData;
  } catch (err: unknown) {
    console.error('Failed to load compendium:', err);
    const errorObj = err as { response?: { data?: { message?: string } } };
    error.value = errorObj.response?.data?.message || (err as Error).message || 'Failed to load compendium';
  } finally {
    loading.value = false;
  }
}

// Delete compendium
async function deleteCompendium() {
  if (!compendium.value) return;
  
  deleting.value = true;
  try {
    await compendiumsClient.deleteCompendium(compendium.value.slug);
    router.push('/compendiums');
  } catch (err: unknown) {
    console.error('Failed to delete compendium:', err);
    const errorObj = err as { response?: { data?: { message?: string } } };
    error.value = errorObj.response?.data?.message || (err as Error).message || 'Failed to delete compendium';
  } finally {
    deleting.value = false;
    showDeleteModal.value = false;
  }
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

// Format date
function formatDate(dateString?: Date | string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center my-12">
      <div class="flex flex-col items-center">
        <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Loading compendium...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-2xl mx-auto">
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-6">
        <span class="block sm:inline">{{ error }}</span>
        <div class="mt-4 flex space-x-4">
          <button 
            class="underline" 
            @click="loadCompendium"
          >
            Try Again
          </button>
          <router-link 
            to="/compendiums"
            class="underline"
          >
            Back to Compendiums
          </router-link>
        </div>
      </div>
    </div>

    <!-- Compendium Content -->
    <div v-else-if="compendium">
      <!-- Header -->
      <div class="flex justify-between items-start mb-8">
        <div class="flex-1 min-w-0">
          <div class="flex items-center mb-2">
            <router-link 
              to="/compendiums"
              class="text-blue-600 hover:text-blue-700 mr-2"
            >
              <i class="fas fa-arrow-left"></i>
            </router-link>
            <h1 class="text-3xl font-semibold text-gray-900 dark:text-white truncate">
              {{ compendium.name }}
            </h1>
            <span 
              :class="getStatusBadgeClass(compendium.status || 'draft')"
              class="ml-3 inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium capitalize"
            >
              {{ compendium.status || 'draft' }}
            </span>
          </div>
          
          <p v-if="compendium.description" class="text-gray-600 dark:text-gray-300 text-lg">
            {{ compendium.description }}
          </p>
          
          <div class="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span class="flex items-center">
              <i class="fas fa-gamepad mr-2"></i>
              {{ compendium.pluginId || 'Unknown System' }}
            </span>
            <span class="flex items-center">
              <i class="fas fa-tag mr-2"></i>
              Version {{ compendium.version || '1.0.0' }}
            </span>
            <span class="flex items-center">
              <i :class="compendium.isPublic ? 'fas fa-globe' : 'fas fa-lock'" class="mr-2"></i>
              {{ compendium.isPublic ? 'Public' : 'Private' }}
            </span>
            <span class="flex items-center">
              <i class="fas fa-calendar mr-2"></i>
              Created {{ formatDate((compendium as any).createdAt) }}
            </span>
          </div>
        </div>
        
        <div class="flex space-x-3 ml-6">
          <button 
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            @click="$router.push(`/compendiums/${compendium.slug}/edit`)"
          >
            <i class="fas fa-edit mr-2"></i>
            Edit
          </button>
          <button 
            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
            @click="showDeleteModal = true"
          >
            <i class="fas fa-trash mr-2"></i>
            Delete
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <i class="fas fa-list text-gray-400 text-xl"></i>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Entries
                  </dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-white">
                    {{ compendium.totalEntries || 0 }}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div v-if="compendium.entriesByType?.actor" class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <i class="fas fa-users text-blue-400 text-xl"></i>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Actors
                  </dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-white">
                    {{ compendium.entriesByType.actor }}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div v-if="compendium.entriesByType?.item" class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <i class="fas fa-sword text-green-400 text-xl"></i>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Items
                  </dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-white">
                    {{ compendium.entriesByType.item }}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div v-if="compendium.entriesByType?.['vtt-document']" class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <i class="fas fa-scroll text-purple-400 text-xl"></i>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Documents
                  </dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-white">
                    {{ compendium.entriesByType['vtt-document'] }}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tags -->
      <div v-if="compendium.tags && compendium.tags.length > 0" class="mb-8">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Tags</h3>
        <div class="flex flex-wrap gap-2">
          <span 
            v-for="tag in compendium.tags" 
            :key="tag"
            class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
          >
            {{ tag }}
          </span>
        </div>
      </div>

      <!-- Entries Section -->
      <div class="mb-8">
        <CompendiumEntriesList :compendiumId="compendiumId" />
      </div>
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
            Delete Compendium
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete "{{ compendium?.name }}"? This action cannot be undone and will remove all associated entries.
          </p>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="showDeleteModal = false"
            :disabled="deleting"
            class="px-4 py-2 bg-gray-300 hover:bg-gray-400 disabled:opacity-50 text-gray-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="deleteCompendium"
            :disabled="deleting"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-md transition-colors flex items-center"
          >
            <div v-if="deleting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
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