<template>
  <div class="documents-tab">
    <div class="documents-header">
      <h4>Documents</h4>
      <div class="documents-controls">
        <button class="control-button" title="Refresh" @click="refreshDocuments">
          <i class="mdi mdi-refresh"></i>
        </button>
        <button class="control-button" title="Documents Settings">
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
          placeholder="Search documents..."
          class="search-input"
        />
      </div>
      
      <div class="filter-section">
        <div class="filter-group" v-if="availableDocumentTypes.length > 0">
          <label class="filter-label">Type:</label>
          <select v-model="activeDocumentType" class="filter-select">
            <option value="">All Types</option>
            <option 
              v-for="type in availableDocumentTypes" 
              :key="type" 
              :value="type"
            >
              {{ formatDocumentType(type) }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="documents-list" ref="documentsListRef">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>Loading documents...</span>
      </div>

      <div v-else-if="error" class="error-state">
        <i class="mdi mdi-alert-circle"></i>
        <span>{{ error }}</span>
        <button @click="refreshDocuments" class="retry-button">Retry</button>
      </div>

      <div v-else-if="filteredDocuments.length === 0" class="empty-state">
        <i class="mdi mdi-file-document-multiple"></i>
        <span>No documents found</span>
        <small>Try adjusting your search or filters</small>
      </div>

      <div
        v-else
        v-for="document in filteredDocuments"
        :key="document.id"
        class="document-card"
        :class="[
          `document-${document.documentType || 'unknown'}`,
          { 'is-dragging': isDragging && draggedDocument?.id === document.id }
        ]"
        draggable="true"
        @click="selectDocument(document)"
        @dragstart="handleDragStart($event, document)"
        @dragend="handleDragEnd"
      >
        <div class="document-icon">
          <img 
            v-if="(document as any).image?.url" 
            :src="(document as any).image.url" 
            :alt="document.name || 'Document image'"
            class="document-image"
            @error="onImageError"
          />
          <i v-else :class="getDocumentIcon(document.pluginDocumentType)"></i>
        </div>
        
        <div class="document-info">
          <div class="document-name">{{ document.name || 'Unnamed Document' }}</div>
          <div class="document-details">
            <span class="document-type">{{ formatDocumentType(document.pluginDocumentType) }}</span>
          </div>
          <div v-if="document.description" class="document-description">{{ document.description }}</div>
        </div>

        <div class="document-actions">
          <button 
            class="action-button" 
            title="Add to Session" 
            @click.stop="addToSession(document)"
            :disabled="isAddingToSession"
          >
            <i class="mdi mdi-plus-circle"></i>
          </button>
          <button class="action-button" title="View Document" @click.stop="viewDocument(document)">
            <i class="mdi mdi-eye"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="status-bar">
      <span class="document-count">{{ filteredDocuments.length }} of {{ totalDocuments }} documents</span>
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
import { ref, computed, onMounted, watch } from 'vue';
import { DocumentsClient } from '@dungeon-lab/client/index.mjs';
import { playerActionService } from '../../../services/player-action.service.mjs';
import { useDocumentSheetStore } from '../../../stores/document-sheet.store.mjs';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';
import type { AddDocumentParameters } from '@dungeon-lab/shared/types/game-actions.mjs';

const documentsClient = new DocumentsClient();
const documentSheetStore = useDocumentSheetStore();

// State
const searchQuery = ref('');
const activeDocumentType = ref('');
const documents = ref<BaseDocument[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const isAddingToSession = ref(false);
const selectedDocument = ref<BaseDocument | null>(null);

// Pagination
const currentPage = ref(1);
const totalDocuments = ref(0);
const hasMore = computed(() => documents.value.length < totalDocuments.value);

// Drag and drop state
const isDragging = ref(false);
const draggedDocument = ref<BaseDocument | null>(null);
const documentsListRef = ref<HTMLElement | null>(null);

// Get current plugin ID - hardcoded for now, could be made dynamic
const currentPluginId = 'dnd-5e-2024';

// Available document types from plugin manifest
const availableDocumentTypes = computed<string[]>(() => {
  // For now, use hardcoded list of D&D 5e document types
  // TODO: Get this from plugin manifest once the schema is updated
  return ['spell', 'feat', 'class', 'background', 'language', 'rule', 'gear', 'creature', 'species', 'subclass'];
});

// Computed properties
const filteredDocuments = computed(() => {
  let filtered = documents.value;

  // Filter by document type
  if (activeDocumentType.value) {
    filtered = filtered.filter(doc => doc.pluginDocumentType === activeDocumentType.value);
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(doc => 
      doc.name?.toLowerCase().includes(query) ||
      doc.pluginDocumentType?.toLowerCase().includes(query) ||
      doc.description?.toLowerCase().includes(query)
    );
  }

  return filtered;
});

// Watch for search changes and reload documents
watch([searchQuery, activeDocumentType], () => {
  refreshDocuments();
});

// Component lifecycle
onMounted(async () => {
  await loadDocuments();
});

// Load documents from server
async function loadDocuments(): Promise<void> {
  if (loading.value) return;
  
  loading.value = true;
  error.value = null;
  
  try {
    const query: Record<string, string> = {
      pluginId: currentPluginId,
      documentType: 'vtt-document'
    };

    // Add search query if present
    if (searchQuery.value.trim()) {
      query.name = searchQuery.value.trim();
    }

    // Add document type filter if present
    if (activeDocumentType.value) {
      query.pluginDocumentType = activeDocumentType.value;
    }

    const results = await documentsClient.searchDocuments(query);
    documents.value = results;
    totalDocuments.value = results.length;
  } catch (err) {
    console.error('Failed to load documents:', err);
    error.value = err instanceof Error ? err.message : 'Failed to load documents';
  } finally {
    loading.value = false;
  }
}

// Refresh documents
async function refreshDocuments(): Promise<void> {
  documents.value = [];
  currentPage.value = 1;
  await loadDocuments();
}

// Load more documents (for pagination)
async function loadMore(): Promise<void> {
  currentPage.value++;
  await loadDocuments();
}

// Helper function to get appropriate icon for document type
function getDocumentIcon(type?: string): string {
  const iconMap: Record<string, string> = {
    spell: 'mdi mdi-book-open-variant',
    feat: 'mdi mdi-star-circle',
    class: 'mdi mdi-account-tie',
    background: 'mdi mdi-account-details',
    language: 'mdi mdi-translate',
    rule: 'mdi mdi-gavel',
    gear: 'mdi mdi-bag-personal',
    creature: 'mdi mdi-dragon',
    species: 'mdi mdi-account-group',
    subclass: 'mdi mdi-account-supervisor',
    default: 'mdi mdi-file-document'
  };
  return iconMap[type || ''] || iconMap.default;
}

// Format document type for display
function formatDocumentType(type?: string): string {
  if (!type) return 'Unknown';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// Document actions
async function selectDocument(document: BaseDocument): Promise<void> {
  selectedDocument.value = document;
  console.log('Selected document:', document.name);
}

async function addToSession(document: BaseDocument): Promise<void> {
  if (isAddingToSession.value) return;
  
  isAddingToSession.value = true;
  try {
    // For documents, we can directly add them to the session since they are already instantiated
    const parameters: AddDocumentParameters = {
      compendiumId: 'documents', // Special compendium ID for direct documents
      entryId: document.id,
      documentData: document
    };

    const result = await playerActionService.requestAction(
      'add-document',
      undefined, // actorId - not an actor-specific action
      parameters,
      undefined, // actorTokenId
      undefined, // targetTokenIds
      {
        description: `Add ${document.name} to session`
      }
    );

    if (result.success && result.approved) {
      console.log(`[DocumentsTab] ${document.name} added to session successfully`);
    } else if (result.success && !result.approved) {
      console.log(`[DocumentsTab] Waiting for GM approval to add ${document.name}`);
    } else {
      console.error('[DocumentsTab] Failed to add document to session:', result.error);
      error.value = result.error || 'Failed to add document to session';
    }
  } catch (err) {
    console.error('Failed to add document to session:', err);
    error.value = err instanceof Error ? err.message : 'Failed to add document to session';
  } finally {
    isAddingToSession.value = false;
  }
}

async function viewDocument(document: BaseDocument): Promise<void> {
  console.log('[DocumentsTab] Opening document sheet for:', document.name, document.documentType, document.pluginDocumentType);
  
  // Open the document using the same floating sheet system as characters/actors
  documentSheetStore.openDocumentSheet(document);
}

// Drag and drop functionality
function handleDragStart(event: DragEvent, document: BaseDocument): void {
  if (!event.dataTransfer) return;
  
  // Set drag state
  isDragging.value = true;
  draggedDocument.value = document;
  
  // Set transfer data for drop handling
  const dragData = {
    type: 'document-token',
    documentId: document.id,
    documentType: document.documentType,
    pluginDocumentType: document.pluginDocumentType,
    name: document.name
  };
  
  event.dataTransfer.setData('application/json', JSON.stringify(dragData));
  event.dataTransfer.effectAllowed = 'copy';
  
  console.log(`Started dragging document: ${document.name}`);
}

function handleDragEnd(): void {
  // Reset drag state
  isDragging.value = false;
  draggedDocument.value = null;
  
  console.log('Drag ended');
}

// Handle image loading errors
function onImageError(event: Event): void {
  const img = event.target as HTMLImageElement;
  console.warn(`Failed to load document image: ${img.src}`);
  // Hide the broken image - the v-else icon will show instead
  img.style.display = 'none';
}

</script>

<style scoped>
.documents-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.documents-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.documents-header h4 {
  color: white;
  margin: 0;
  font-weight: 600;
}

.documents-controls {
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
  align-items: center;
  gap: 8px;
}

.filter-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 600;
  min-width: 60px;
}

.filter-select {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 6px 8px;
  color: white;
  font-size: 12px;
}

.filter-select option {
  background: #1a1a1a;
  color: white;
}

.documents-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  gap: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid rgba(59, 130, 246, 0.6);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-button {
  background: rgba(59, 130, 246, 0.6);
  border: 1px solid rgba(59, 130, 246, 0.8);
  border-radius: 4px;
  padding: 8px 16px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background: rgba(59, 130, 246, 0.8);
}

.document-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.document-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.document-card.is-dragging {
  opacity: 0.5;
  transform: scale(0.95);
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

.document-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

.document-icon i {
  font-size: 20px;
}

.document-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
  transition: transform 0.2s ease;
}

.document-icon:hover .document-image {
  transform: scale(1.05);
}

.document-info {
  flex: 1;
  min-width: 0;
}

.document-name {
  color: white;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.document-details {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  align-items: center;
}

.document-type {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  text-transform: capitalize;
}

.document-description {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 8px;
}

.document-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.document-card:hover .document-actions {
  opacity: 1;
}

.action-button {
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

.document-count {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.load-more-button {
  background: rgba(59, 130, 246, 0.6);
  border: 1px solid rgba(59, 130, 246, 0.8);
  border-radius: 4px;
  padding: 6px 12px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.load-more-button:hover {
  background: rgba(59, 130, 246, 0.8);
}

.load-more-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Scrollbar styling */
.documents-list::-webkit-scrollbar {
  width: 6px;
}

.documents-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.documents-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.documents-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>