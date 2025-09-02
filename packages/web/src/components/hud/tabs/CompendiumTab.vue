<template>
  <div class="compendium-tab">
    <div class="compendium-header">
      <h4>Compendium</h4>
      <div class="compendium-controls">
        <button class="control-button" title="Refresh" @click="refreshEntries">
          <i class="mdi mdi-refresh"></i>
        </button>
        <button class="control-button" title="Compendium Settings">
          <i class="mdi mdi-cog"></i>
        </button>
      </div>
    </div>

    <div class="search-filter">
      <div class="search-box">
        <i class="mdi mdi-magnify search-icon"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search compendium entries..."
          class="search-input"
        />
      </div>
      
      <div class="filter-section">
        <div class="filter-group">
          <label class="filter-label">Document Type:</label>
          <select v-model="activeDocumentType" class="filter-select">
            <option value="">All Types</option>
            <option value="character">Characters</option>
            <option value="actor">Actors</option>
            <option value="item">Items</option>
            <option value="vtt-document">VTT Documents</option>
          </select>
        </div>
        
        <div class="filter-group" v-if="pluginDocumentTypes.length > 0">
          <label class="filter-label">Category:</label>
          <select v-model="activePluginDocumentType" class="filter-select">
            <option value="">All Categories</option>
            <option 
              v-for="type in pluginDocumentTypes" 
              :key="type" 
              :value="type"
            >
              {{ formatPluginDocumentType(type) }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="compendium-list" ref="compendiumListRef">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>Loading compendium entries...</span>
      </div>

      <div v-else-if="error" class="error-state">
        <i class="mdi mdi-alert-circle"></i>
        <span>{{ error }}</span>
        <button @click="refreshEntries" class="retry-button">Retry</button>
      </div>

      <div v-else-if="filteredEntries.length === 0" class="empty-state">
        <i class="mdi mdi-book-open-variant"></i>
        <span>No entries found</span>
        <small>Try adjusting your search or filters</small>
      </div>

      <div
        v-else
        v-for="entry in filteredEntries"
        :key="entry.id"
        class="compendium-card"
        :class="[
          `entry-${entry.entry?.documentType || 'unknown'}`,
          { 'is-dragging': isDragging && draggedEntry?.id === entry.id }
        ]"
        draggable="true"
        @click="selectEntry(entry)"
        @dragstart="handleDragStart($event, entry)"
        @dragend="handleDragEnd"
      >
        <div class="entry-avatar">
          <img 
            v-if="getEntryImageUrl(entry)" 
            :src="getEntryImageUrl(entry)!" 
            :alt="entry.entry?.name || 'Entry'"
            @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
          />
          <i v-else :class="getEntryIcon(entry.entry?.documentType)"></i>
        </div>
        
        <div class="entry-info">
          <div class="entry-name">{{ entry.entry?.name || 'Unnamed Entry' }}</div>
          <div class="entry-details">
            <span class="entry-type">{{ formatDocumentType(entry.entry?.documentType) }}</span>
            <span v-if="entry.content?.pluginDocumentType" class="entry-category">
              {{ formatPluginDocumentType(entry.content.pluginDocumentType) }}
            </span>
          </div>
        </div>

        <div class="entry-actions">
          <button 
            class="action-button" 
            title="Add to Session" 
            @click.stop="addToSession(entry)"
            :disabled="isAddingToSession"
          >
            <i class="mdi mdi-plus-circle"></i>
          </button>
          <button class="action-button" title="View Entry" @click.stop="viewEntry(entry)">
            <i class="mdi mdi-eye"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="status-bar">
      <span class="entry-count">{{ filteredEntries.length }} of {{ totalEntries }} entries</span>
      <button 
        v-if="hasMore" 
        @click="loadMore" 
        class="load-more-button"
        :disabled="loading"
      >
        Load More
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { CompendiumsClient } from '@dungeon-lab/client/index.mjs';
import { playerActionService } from '../../../services/player-action.service.mjs';
import { transformAssetUrl } from '../../../utils/asset-utils.mjs';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';
import { pluginRegistry } from '../../../services/plugin-registry.mjs';
import type { ICompendiumEntry } from '@dungeon-lab/shared/types/index.mjs';
import type { AddDocumentParameters } from '@dungeon-lab/shared/types/game-actions.mjs';

const compendiumsClient = new CompendiumsClient();
const gameStateStore = useGameStateStore();

// State
const searchQuery = ref('');
const activeDocumentType = ref('');
const activePluginDocumentType = ref('');
const entries = ref<ICompendiumEntry[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const isAddingToSession = ref(false);
const selectedEntry = ref<ICompendiumEntry | null>(null);

// Pagination
const currentPage = ref(1);
const pageLimit = ref(50);
const totalEntries = ref(0);
const hasMore = computed(() => entries.value.length < totalEntries.value);

// Drag and drop state
const isDragging = ref(false);
const draggedEntry = ref<ICompendiumEntry | null>(null);
const compendiumListRef = ref<HTMLElement | null>(null);

// Plugin document types for filter dropdown - computed from plugin manifest
const pluginDocumentTypes = computed<string[]>(() => {
  // If no document type is selected, show all types from all plugins
  if (!activeDocumentType.value) {
    return [];
  }
  
  // For 'item' document type, use the plugin manifest itemTypes
  if (activeDocumentType.value === 'item') {
    const manifest = pluginRegistry.getPluginManifest('dnd-5e-2024');
    return manifest?.itemTypes || [];
  }
  
  // For other document types, could expand this logic
  // For now, fallback to extracting from loaded entries
  const uniqueTypes = new Set<string>();
  entries.value.forEach(entry => {
    if (entry.entry?.documentType === activeDocumentType.value && entry.content?.pluginDocumentType) {
      uniqueTypes.add(entry.content.pluginDocumentType);
    }
  });
  return Array.from(uniqueTypes).sort();
});

// Computed properties
const filteredEntries = computed(() => {
  let filtered = entries.value;

  // Filter by document type
  if (activeDocumentType.value) {
    filtered = filtered.filter(entry => 
      entry.entry?.documentType === activeDocumentType.value
    );
  }

  // Filter by plugin document type
  if (activePluginDocumentType.value) {
    filtered = filtered.filter(entry => 
      entry.content?.pluginDocumentType === activePluginDocumentType.value
    );
  }

  // Filter by search query (client-side for loaded entries)
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(entry => 
      entry.entry?.name?.toLowerCase().includes(query) ||
      entry.content?.pluginDocumentType?.toLowerCase().includes(query) ||
      entry.entry?.documentType?.toLowerCase().includes(query)
    );
  }

  return filtered;
});

// Methods
async function loadEntries(reset = false): Promise<void> {
  if (loading.value) return;
  
  try {
    loading.value = true;
    error.value = null;

    if (reset) {
      entries.value = [];
      currentPage.value = 1;
    }

    const params: Record<string, string | number | boolean> = {
      page: currentPage.value,
      limit: pageLimit.value,
      pluginId: 'dnd-5e-2024' // For now, default to D&D 5e plugin
    };

    // Add filters
    if (activeDocumentType.value) {
      params.documentType = activeDocumentType.value;
    }
    if (activePluginDocumentType.value) {
      params.pluginDocumentType = activePluginDocumentType.value;
    }
    
    // Only search on server if we have 3+ characters
    if (searchQuery.value.trim() && searchQuery.value.trim().length >= 3) {
      params.search = searchQuery.value.trim();
    }

    console.log('[CompendiumTab] Loading entries with params:', params);

    const response = await compendiumsClient.getAllCompendiumEntries(params);
    
    if (reset) {
      entries.value = response.entries;
    } else {
      entries.value = [...entries.value, ...response.entries];
    }
    
    totalEntries.value = response.total;
    currentPage.value = response.page;

    // Note: Plugin document types are now computed from manifest data

    console.log(`[CompendiumTab] Loaded ${response.entries.length} entries, ${totalEntries.value} total`);

  } catch (err) {
    console.error('[CompendiumTab] Error loading entries:', err);
    error.value = err instanceof Error ? err.message : 'Failed to load compendium entries';
  } finally {
    loading.value = false;
  }
}

async function loadMore(): Promise<void> {
  if (hasMore.value && !loading.value) {
    // Store current scroll position before loading new entries
    const scrollContainer = compendiumListRef.value;
    const currentScrollTop = scrollContainer?.scrollTop || 0;
    
    currentPage.value++;
    await loadEntries();
    
    // Restore scroll position after DOM updates complete
    await nextTick();
    if (scrollContainer) {
      scrollContainer.scrollTop = currentScrollTop;
    }
  }
}

async function refreshEntries(): Promise<void> {
  await loadEntries(true);
}

function selectEntry(entry: ICompendiumEntry): void {
  selectedEntry.value = entry;
  console.log('[CompendiumTab] Selected entry:', entry.entry?.name);
}

async function addToSession(entry: ICompendiumEntry): Promise<void> {
  if (isAddingToSession.value) return;
  
  try {
    isAddingToSession.value = true;
    console.log('[CompendiumTab] Adding entry to session:', entry.entry?.name);

    // Step 1: Instantiate the template to create the actual document
    const campaignId = gameStateStore.gameState?.campaign?.id;
    if (!campaignId) {
      throw new Error('No active campaign found. Please ensure you are in a campaign session.');
    }
    
    const document = await compendiumsClient.instantiateTemplate(
      entry.compendiumId?.toString() || '',
      entry.id || '',
      {}, // overrides
      { 
        skipIfExists: false,
        campaignId: campaignId
      }
    );

    if (!document) {
      throw new Error('Failed to instantiate template - no document returned');
    }

    console.log('[CompendiumTab] Template instantiated:', document);

    // Step 2: Send GM request to add document to session
    const result = await playerActionService.requestAction(
      'add-document',
      undefined, // actorId - not an actor-specific action
      {
        compendiumId: entry.compendiumId?.toString() || '',
        entryId: entry.id || '',
        documentData: document
      } as AddDocumentParameters,
      undefined, // actorTokenId
      undefined, // targetTokenIds
      {
        description: `Add ${entry.entry?.name || 'document'} to session`
      }
    );

    // Step 3: Handle result
    if (result.success && result.approved) {
      console.log(`[CompendiumTab] ${entry.entry?.name} added to session successfully`);
      // TODO: Show success notification
    } else if (result.success && !result.approved) {
      console.log(`[CompendiumTab] Waiting for GM approval to add ${entry.entry?.name}`);
      // TODO: Show pending approval notification
    } else {
      console.error('[CompendiumTab] Failed to add document to session:', result.error);
      // TODO: Show error notification
    }

  } catch (err) {
    console.error('[CompendiumTab] Error adding entry to session:', err);
    error.value = err instanceof Error ? err.message : 'Failed to add entry to session';
  } finally {
    isAddingToSession.value = false;
  }
}

function viewEntry(entry: ICompendiumEntry): void {
  console.log('[CompendiumTab] View entry:', entry.entry?.name);
  // TODO: Implement entry detail view
}

// Helper functions
function getEntryImageUrl(entry: ICompendiumEntry): string | null {
  // Try different image sources in order of preference
  const entryWithImage = entry as ICompendiumEntry & { image?: { url: string } };
  
  if (entryWithImage.image?.url) {
    return transformAssetUrl(entryWithImage.image.url);
  }
  if (entry.content?.avatar?.url) {
    return transformAssetUrl(entry.content.avatar.url);
  }
  if (entry.content?.tokenImage?.url) {
    return transformAssetUrl(entry.content.tokenImage.url);
  }
  if (entry.content?.image?.url) {
    return transformAssetUrl(entry.content.image.url);
  }
  return null;
}

function getEntryIcon(documentType: string | undefined): string {
  switch (documentType) {
    case 'character':
      return 'mdi mdi-account';
    case 'actor':
      return 'mdi mdi-account-multiple';
    case 'item':
      return 'mdi mdi-package-variant';
    case 'vtt-document':
      return 'mdi mdi-file-document';
    default:
      return 'mdi mdi-help-circle';
  }
}

function formatDocumentType(type: string | undefined): string {
  if (!type) return 'Unknown';
  return type.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatPluginDocumentType(type: string | undefined): string {
  if (!type) return '';
  return type.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

// ============================================================================
// DRAG AND DROP FUNCTIONALITY
// ============================================================================

function handleDragStart(event: DragEvent, entry: ICompendiumEntry): void {
  if (!event.dataTransfer) return;
  
  // Set drag state
  isDragging.value = true;
  draggedEntry.value = entry;
  
  // Create drag data for token creation
  const dragData = {
    type: 'compendium-entry',
    entryId: entry.id,
    compendiumId: entry.compendiumId?.toString(),
    documentType: entry.entry?.documentType,
    name: entry.entry?.name,
    imageUrl: getEntryImageUrl(entry)
  };
  
  event.dataTransfer.setData('application/json', JSON.stringify(dragData));
  event.dataTransfer.effectAllowed = 'copy';
  
  console.log(`[CompendiumTab] Started dragging entry: ${entry.entry?.name}`);
}

function handleDragEnd(): void {
  // Reset drag state
  isDragging.value = false;
  draggedEntry.value = null;
  
  console.log('[CompendiumTab] Drag ended');
}

// ============================================================================
// WATCHERS AND LIFECYCLE
// ============================================================================

// Watch for search query changes with debouncing
let searchTimeout: number | undefined;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadEntries(true);
  }, 500) as unknown as number;
});

// Watch for filter changes
watch([activeDocumentType, activePluginDocumentType], () => {
  loadEntries(true);
});

onMounted(async () => {
  console.log('[CompendiumTab] Mounted, loading initial entries');
  await loadEntries(true);
});
</script>

<style scoped>
.compendium-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.compendium-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.compendium-header h4 {
  color: white;
  margin: 0;
  font-weight: 600;
}

.compendium-controls {
  display: flex;
  gap: 4px;
}

.control-button {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.search-filter {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.search-box {
  position: relative;
  margin-bottom: 12px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
}

.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px 12px 8px 36px;
  color: white;
  font-size: 14px;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(255, 255, 255, 0.15);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 600;
}

.filter-select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 6px 8px;
  color: white;
  font-size: 12px;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.5);
}

.compendium-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid rgba(59, 130, 246, 0.8);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state i {
  font-size: 24px;
  color: rgba(239, 68, 68, 0.8);
  margin-bottom: 8px;
}

.retry-button {
  background: rgba(59, 130, 246, 0.6);
  border: 1px solid rgba(59, 130, 246, 0.8);
  border-radius: 4px;
  color: white;
  padding: 6px 12px;
  margin-top: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.retry-button:hover {
  background: rgba(59, 130, 246, 0.8);
}

.empty-state i {
  font-size: 32px;
  margin-bottom: 8px;
}

.empty-state small {
  font-size: 11px;
  opacity: 0.7;
}

.compendium-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.compendium-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.compendium-card.is-dragging {
  opacity: 0.5;
  transform: scale(0.95);
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

.compendium-card.entry-character {
  border-left: 3px solid #3b82f6;
}

.compendium-card.entry-actor {
  border-left: 3px solid #22c55e;
}

.compendium-card.entry-item {
  border-left: 3px solid #f59e0b;
}

.compendium-card.entry-vtt-document {
  border-left: 3px solid #8b5cf6;
}

.entry-avatar {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  overflow: hidden;
  flex-shrink: 0;
}

.entry-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.entry-avatar i {
  font-size: 16px;
}

.entry-info {
  flex: 1;
  min-width: 0;
}

.entry-name {
  color: white;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-details {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.entry-type, .entry-category {
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  text-transform: capitalize;
}

.entry-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.compendium-card:hover .entry-actions {
  opacity: 1;
}

.action-button {
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-bar {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.entry-count {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.load-more-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.8);
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.load-more-button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.load-more-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Scrollbar styling */
.compendium-list::-webkit-scrollbar {
  width: 6px;
}

.compendium-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.compendium-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.compendium-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>