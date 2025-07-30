<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex justify-center items-center min-h-screen">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error Loading Entry</h1>
        <p class="text-gray-600 dark:text-gray-400">{{ error }}</p>
        <button @click="$router.go(-1)" class="mt-4 btn-primary">
          Go Back
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="entry" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <nav class="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <router-link :to="{ name: 'compendiums' }" class="hover:text-primary-600">
            Compendiums
          </router-link>
          <span>›</span>
          <router-link :to="{ name: 'compendium-detail', params: { id: $route.params.compendiumId } }" class="hover:text-primary-600">
            {{ compendium?.name || 'Compendium' }}
          </router-link>
          <span>›</span>
          <span class="text-gray-900 dark:text-white">{{ entry.entry.name }}</span>
        </nav>

        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              {{ entry.entry.name }}
            </h1>
            <div class="flex items-center space-x-4 mt-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getContentTypeColor(entry)">
                <i :class="getContentTypeIcon(entry)" class="mr-1"></i>
                {{ getContentTypeDisplayName(entry) }}
              </span>
              <span v-if="entry.entry.category" class="text-sm text-gray-500 dark:text-gray-400">
                {{ entry.entry.category }}
              </span>
            </div>
          </div>
          
          <button @click="$router.go(-1)" class="btn-secondary">
            <i class="fas fa-arrow-left mr-2"></i>
            Back
          </button>
        </div>
      </div>

      <!-- Responsive Grid Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Image Section (Full Width on Mobile, Left Column on Desktop) -->
        <div v-if="entryImageUrl" class="lg:col-span-1">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <img 
              :src="entryImageUrl" 
              :alt="entry.entry.name"
              class="w-full h-auto object-contain"
            />
          </div>
        </div>

        <!-- Description Section (Full Width on Mobile, Right Column on Desktop) -->
        <div class="lg:col-span-1">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Description
            </h2>
            <div 
              v-if="entry.content?.description"
              class="prose dark:prose-invert max-w-none"
              v-html="formatDescription(entry.content.description)"
            ></div>
            <p v-else class="text-gray-500 dark:text-gray-400 italic">
              No description available
            </p>
          </div>
        </div>

        <!-- Attributes Section (Full Width on Mobile, Left Column on Desktop) -->
        <div class="lg:col-span-1">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Attributes
            </h2>
            <dl class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Type</dt>
                <dd class="text-sm text-gray-900 dark:text-white">{{ getContentTypeDisplayName(entry) }}</dd>
              </div>
              <div v-if="entry.entry.category">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Category</dt>
                <dd class="text-sm text-gray-900 dark:text-white">{{ entry.entry.category }}</dd>
              </div>
              <div v-if="entry.entry.tags && entry.entry.tags.length > 0">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Tags</dt>
                <dd class="text-sm text-gray-900 dark:text-white">
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span 
                      v-for="tag in entry.entry.tags" 
                      :key="tag"
                      class="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </dd>
              </div>
              <div v-if="(entry.entry.documentType === 'actor' || entry.entry.documentType === 'item') && entry.content.gameSystemId">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Game System</dt>
                <dd class="text-sm text-gray-900 dark:text-white">{{ entry.content.gameSystemId }}</dd>
              </div>
              <div v-if="(entry.entry.documentType === 'item' || entry.entry.documentType === 'vtt-document') && entry.content.pluginId">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Plugin</dt>
                <dd class="text-sm text-gray-900 dark:text-white">{{ entry.content.pluginId }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Version</dt>
                <dd class="text-sm text-gray-900 dark:text-white">{{ entry.contentVersion }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Plugin Data Section (Full Width on Mobile, Right Column on Desktop) -->
        <div class="lg:col-span-1">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                Plugin Data
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Raw game system data in JSON format
              </p>
            </div>
            
            <div class="p-6">
              <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <pre class="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-auto max-h-96">{{ formatPluginData(entry.content) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { CompendiumsClient } from '@dungeon-lab/client/index.mjs';
import type { ICompendiumEntry, ICompendium } from '@dungeon-lab/shared/types/index.mjs';

const route = useRoute();
const compendiumsClient = new CompendiumsClient();
const loading = ref(true);
const error = ref<string | null>(null);
const entry = ref<ICompendiumEntry | null>(null);
const compendium = ref<ICompendium | null>(null);

// Extended interface for entries with populated image objects
interface ICompendiumEntryWithImage extends ICompendiumEntry {
  image?: {
    url: string;
    [key: string]: unknown;
  };
}

// Computed properties
const entryImageUrl = computed(() => {
  if (!entry.value) return null;
  
  // Use entry-level image first
  const entryWithImage = entry.value as ICompendiumEntryWithImage;
  if (entryWithImage.image?.url) {
    return entryWithImage.image.url;
  }
  
  // Fallback to content images
  if (!entry.value.content) return null;
  
  const content = entry.value.content as {
    avatarId?: { url: string };
    defaultTokenImageId?: { url: string };
    imageId?: { url: string };
  };
  
  // For actors, prefer avatarId
  if (entry.value.entry.documentType === 'actor') {
    if (content.avatarId?.url) return content.avatarId.url;
    if (content.defaultTokenImageId?.url) return content.defaultTokenImageId.url;
  }
  
  // For items and documents, use imageId
  if (content.imageId?.url) return content.imageId.url;
  
  return null;
});

// Functions for content type handling
function getContentTypeIcon(entry: ICompendiumEntry): string {
  const contentType = entry.entry.documentType;
  switch (contentType) {
    case 'actor': return 'fas fa-users';
    case 'item': return 'fas fa-sword';
    case 'vtt-document': return 'fas fa-scroll';
    default: return 'fas fa-file';
  }
}

function getContentTypeColor(entry: ICompendiumEntry): string {
  const contentType = entry.entry.documentType;
  switch (contentType) {
    case 'actor': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'item': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'vtt-document': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}

function getContentTypeDisplayName(entry: ICompendiumEntry): string {
  const contentType = entry.entry.documentType;
  switch (contentType) {
    case 'actor': return 'Actor';
    case 'item': return 'Item';
    case 'vtt-document': return 'Document';
    default: return 'Unknown';
  }
}

function formatDescription(description: string): string {
  if (!description) return '';
  
  // Basic HTML formatting - convert line breaks to paragraphs
  return description
    .split('\n\n')
    .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function formatPluginData(data: Record<string, unknown>): string {
  if (!data) return 'No plugin data available';
  
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return 'Invalid JSON data';
  }
}

// Load data
async function loadEntry() {
  try {
    loading.value = true;
    error.value = null;
    
    const compendiumId = route.params.compendiumId as string;
    const entryId = route.params.entryId as string;
    
    // Load both entry and compendium info
    const [entryData, compendiumData] = await Promise.all([
      compendiumsClient.getCompendiumEntry(entryId),
      compendiumsClient.getCompendium(compendiumId)
    ]);
    
    entry.value = entryData;
    compendium.value = compendiumData;
    
  } catch (err) {
    console.error('Error loading entry:', err);
    error.value = err instanceof Error ? err.message : 'An unknown error occurred';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadEntry();
});
</script>

<style scoped>
.btn-primary {
  @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500;
}

.btn-secondary {
  @apply inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500;
}

.prose {
  @apply text-gray-900 dark:text-gray-100;
}
</style>