<template>
  <!-- Modal overlay -->
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="document-token-generator">
    <div class="header">
      <h3>Add Tokens</h3>
      <button @click="$emit('close')" class="close-button">×</button>
    </div>
    
    <div v-if="loadingDocuments" class="loading-state">
      <div class="spinner"></div>
      <p>Loading documents...</p>
    </div>
    
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="$emit('close')" class="cancel-button">Close</button>
    </div>
    
    <div v-else class="form-content">
      <div class="form-group">
        <label for="document-select">Select Document:</label>
        <select 
          id="document-select" 
          v-model="selectedDocumentId"
          @change="onDocumentSelected"
          class="select-input"
        >
          <option disabled value="">Choose a document...</option>
          <optgroup label="Characters" v-if="characters.length > 0">
            <option v-for="doc in characters" :key="doc.id" :value="doc.id">
              {{ doc.name }}
            </option>
          </optgroup>
          <optgroup label="Actors" v-if="actors.length > 0">
            <option v-for="doc in actors" :key="doc.id" :value="doc.id">
              {{ doc.name }}
            </option>
          </optgroup>
          <optgroup label="Items" v-if="items.length > 0">
            <option v-for="doc in items" :key="doc.id" :value="doc.id">
              {{ doc.name }}
            </option>
          </optgroup>
          <!-- VTT Documents would be shown here when available -->
        </select>
      </div>
      
      <div v-if="selectedDocument" class="document-preview">
        <h4>{{ selectedDocument.name }}</h4>
        <p class="document-type">{{ selectedDocument.documentType?.toUpperCase() }} - {{ selectedDocument.pluginDocumentType }}</p>
      </div>
      
      <div class="form-group">
        <label for="token-count">Number of Tokens:</label>
        <input 
          id="token-count" 
          type="number" 
          v-model="tokenCount" 
          min="1" 
          max="20"
          class="number-input"
        />
      </div>
      
      <div class="form-group">
        <label for="token-name">Custom Name (optional):</label>
        <input 
          id="token-name" 
          type="text" 
          v-model="tokenOptions.name" 
          placeholder="Leave blank to use document name"
          class="text-input"
        />
        <small class="help-text">If creating multiple tokens, numbers will be appended</small>
      </div>
      
      <div class="form-group">
        <label for="token-scale">Scale:</label>
        <input 
          id="token-scale" 
          type="range" 
          v-model="tokenOptions.scale" 
          min="0.5" 
          max="2" 
          step="0.1"
          class="range-input"
        />
        <span class="scale-value">{{ tokenOptions.scale }}x</span>
      </div>
      
      <div class="form-group" v-if="isMonster">
        <label class="checkbox-label">
          <input type="checkbox" v-model="tokenOptions.randomizeHP" />
          Randomize HP (roll hit dice)
        </label>
      </div>
      
      <div class="form-group" v-if="isGM">
        <label class="checkbox-label">
          <input type="checkbox" v-model="tokenOptions.isHidden" />
          Start hidden from players
        </label>
      </div>
      
      <div class="form-group">
        <label for="placement-mode">Placement:</label>
        <select id="placement-mode" v-model="placementMode" class="select-input">
          <option value="click">Click to place each token</option>
          <option value="grid">Auto-arrange in grid</option>
          <option value="random">Random positions</option>
        </select>
      </div>
      
      <div class="form-actions">
        <button @click="$emit('close')" class="cancel-button">Cancel</button>
        <button 
          @click="createTokens" 
          :disabled="!selectedDocumentId || loading"
          class="create-button"
        >
          <span v-if="loading">Creating...</span>
          <span v-else>Create {{ tokenCount }} Token{{ tokenCount > 1 ? 's' : '' }}</span>
        </button>
      </div>
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth.store.mjs';
import { useGameStateStore } from '@/stores/game-state.store.mjs';
import { useGameSessionStore } from '@/stores/game-session.store.mjs';
import { pluginTokenService } from '@/services/plugin-token.service.mjs';
import type { BaseDocument, StateOperation } from '@dungeon-lab/shared/types/index.mjs';

interface TokenOptions {
  name: string;
  isHidden: boolean;
  scale: number;
  randomizeHP: boolean;
}

const emit = defineEmits<{
  close: [];
  tokensCreated: [tokenIds: string[]];
}>();

const authStore = useAuthStore();
const gameStateStore = useGameStateStore();
const gameSessionStore = useGameSessionStore();

// State
const selectedDocumentId = ref<string>('');
const tokenCount = ref(1);
const placementMode = ref<'click' | 'grid' | 'random'>('click');
const loading = ref(false);
const loadingDocuments = ref(false);
const error = ref<string | null>(null);

const tokenOptions = ref<TokenOptions>({
  name: '',
  isHidden: false,
  scale: 1,
  randomizeHP: false
});

// All available documents from game state
const allDocuments = computed(() => {
  return [...gameStateStore.characters, ...gameStateStore.actors, ...gameStateStore.items];
});

// Group documents by type
const characters = computed(() => gameStateStore.characters);
const actors = computed(() => gameStateStore.actors);
const items = computed(() => gameStateStore.items);

// Computed
const selectedDocument = computed(() => {
  if (!selectedDocumentId.value) return null;
  return allDocuments.value.find((doc) => doc.id === selectedDocumentId.value) || null;
});

const isMonster = computed(() => {
  return selectedDocument.value?.pluginDocumentType === 'monster';
});

const isGM = computed(() => {
  return gameSessionStore.isGameMaster;
});

const encounter = computed(() => gameStateStore.currentEncounter);

// Utility functions
const generateTokenId = (): string => {
  return `token_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

const getTokenGridSizeFromDocument = async (doc: BaseDocument): Promise<number> => {
  return await pluginTokenService.getTokenGridSize(doc);
};

const createBoundsFromGridSize = (centerX: number, centerY: number, gridSize: number, elevation: number = 0) => {
  // Convert grid size multiplier to actual grid cell count
  const gridCells = Math.max(1, Math.round(gridSize));
  
  // Calculate bounds - for odd sizes, center aligns naturally
  // For even sizes, we offset slightly to align with grid
  const halfSize = Math.floor(gridCells / 2);
  const isEven = gridCells % 2 === 0;
  
  const centerGridX = Math.round(centerX / 50); // Assuming 50px grid size
  const centerGridY = Math.round(centerY / 50);
  
  // For even-sized tokens, adjust center to align with grid intersection
  const adjustedCenterX = isEven ? centerGridX - 0.5 : centerGridX;
  const adjustedCenterY = isEven ? centerGridY - 0.5 : centerGridY;
  
  return {
    topLeft: {
      x: Math.floor(adjustedCenterX - halfSize),
      y: Math.floor(adjustedCenterY - halfSize)
    },
    bottomRight: {
      x: Math.floor(adjustedCenterX - halfSize) + gridCells - 1,
      y: Math.floor(adjustedCenterY - halfSize) + gridCells - 1
    },
    elevation
  };
};

// Event handlers
const onDocumentSelected = () => {
  const doc = selectedDocument.value;
  if (!doc) return;
  
  // Set default token name to document name
  tokenOptions.value.name = doc.name;
};

// Watch for document selection to update token name
watch(selectedDocumentId, () => {
  onDocumentSelected();
});

const createTokens = async () => {
  if (!selectedDocument.value || !encounter.value) {
    error.value = 'No document selected or encounter not found';
    return;
  }

  // Validate GM permissions
  if (!gameStateStore.canUpdate) {
    error.value = 'Only the GM can create tokens';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const document = selectedDocument.value;
    const baseName = tokenOptions.value.name || document.name;
    
    // Get token image from document's token, avatar, or image
    // These properties are defined on all document types as optional
    const documentWithImageProps = document as { 
      tokenImageId?: string;
      avatarId?: string;
      imageId?: string;
    };
    const tokenImage = 
      documentWithImageProps.tokenImageId || 
      documentWithImageProps.avatarId || 
      documentWithImageProps.imageId;
    if (!tokenImage) {
      error.value = 'Document must have a token image, avatar, or image';
      return;
    }

    const createdTokenIds: string[] = [];
    const operations: StateOperation[] = [];

    // Get token grid size from plugin (this is async)
    const tokenGridSize = await getTokenGridSizeFromDocument(document);

    for (let i = 0; i < tokenCount.value; i++) {
      const tokenId = generateTokenId();
      const tokenData = {
        id: tokenId,
        name: tokenCount.value > 1 ? `${baseName} ${i + 1}` : baseName,
        imageUrl: tokenImage,
        encounterId: encounter.value!.id,
        bounds: createBoundsFromGridSize(
          100 + (i * 50), // x center
          100 + (i * 50), // y center
          tokenGridSize,   // grid size multiplier
          0               // elevation
        ),
        documentId: document.id,
        documentType: document.documentType,
        notes: '',
        isVisible: !tokenOptions.value.isHidden,
        isPlayerControlled: document.documentType === 'character',
        data: document.pluginData || {},
        conditions: [],
        version: 1,
        createdBy: authStore.user?.id || '',
        updatedBy: authStore.user?.id || ''
      };

      operations.push({
        path: `currentEncounter.tokens.${tokenId}`,
        op: 'add',
        value: tokenData
      });

      createdTokenIds.push(tokenId);
    }

    const response = await gameStateStore.updateGameState(operations);

    if (response.success) {
      console.log(`Created ${tokenCount.value} token(s) for document: ${document.name}`);
      emit('tokensCreated', createdTokenIds);
      emit('close');
    } else {
      error.value = response.error?.message || 'Failed to create tokens';
    }
  } catch (err) {
    console.error('Error creating tokens:', err);
    error.value = 'An unexpected error occurred while creating tokens';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50;
}

.document-token-generator {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto;
}

.header {
  @apply flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700;
}

.header h3 {
  @apply text-lg font-semibold text-gray-900 dark:text-white;
}

.close-button {
  @apply text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold;
}

.loading-state,
.error-state {
  @apply p-6 text-center;
}

.spinner {
  @apply animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4;
}

.form-content {
  @apply p-4 space-y-4;
}

.form-group {
  @apply space-y-2;
}

.form-group label {
  @apply block text-sm font-medium text-gray-700 dark:text-gray-300;
}

.select-input,
.text-input,
.number-input {
  @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.document-preview {
  @apply p-3 bg-gray-50 dark:bg-gray-700 rounded-md;
}

.document-preview h4 {
  @apply font-semibold text-gray-900 dark:text-white;
}

.document-type {
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.document-stats {
  @apply flex space-x-4 text-xs text-gray-600 dark:text-gray-400 mt-2;
}

.range-input {
  @apply w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer;
}

.scale-value {
  @apply text-sm text-gray-600 dark:text-gray-400 font-mono;
}

.checkbox-label {
  @apply flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300;
}

.checkbox-label input[type="checkbox"] {
  @apply rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500;
}

.help-text {
  @apply text-xs text-gray-500 dark:text-gray-400;
}

.form-actions {
  @apply flex space-x-3 pt-4;
}

.cancel-button {
  @apply flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 
         hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500;
}

.create-button {
  @apply flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
         focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed;
}

.error-message {
  @apply p-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800;
}
</style> 