<template>
  <div
    class="characters-tab"
    :class="{ 'mobile-context': hudNavigationContext.isMobile }"
  >
    <div class="characters-header">
      <h4>Characters</h4>
      <div class="characters-controls">
        <button class="control-button" title="Add Character">
          <i class="mdi mdi-plus"></i>
        </button>
        <button class="control-button" title="Import Characters">
          <i class="mdi mdi-upload"></i>
        </button>
        <button class="control-button" title="Character Settings">
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
          placeholder="Search characters..."
          class="search-input"
        />
      </div>
      
      <div class="filter-tabs">
        <button
          v-for="filter in filterOptions"
          :key="filter.id"
          class="filter-tab"
          :class="{ 'filter-active': activeFilter === filter.id }"
          @click="activeFilter = filter.id"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <div class="characters-list">
      <div
        v-for="character in filteredCharacters"
        :key="character.id"
        class="character-card"
        :class="[
          `character-${character.pluginDocumentType || 'pc'}`,
          { 'is-dragging': isDragging && draggedCharacter?.id === character.id }
        ]"
        :draggable="!hudNavigationContext.isMobile"
        @click="handleCharacterClick(character)"
        @dblclick="handleCharacterDoubleClick(character)"
        @dragstart="handleDragStart($event, character)"
        @dragend="handleDragEnd"
      >
        <div class="character-avatar">
          <img 
            v-if="getCharacterImageUrl(character)" 
            :src="getCharacterImageUrl(character)!" 
            :alt="character.name"
            @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
          />
          <i v-else class="mdi mdi-account"></i>
        </div>
        
        <div class="character-info">
          <div class="character-name">{{ character.name }}</div>
        </div>

        <div class="character-actions">
          <button class="action-button" title="Character Sheet" @click.stop="openCharacterSheet(character)">
            <i class="mdi mdi-file-document"></i>
          </button>
          <button class="action-button" title="Add to Encounter" @click.stop="addToEncounter(character)">
            <i class="mdi mdi-plus-circle"></i>
          </button>
          <button class="action-button" title="Edit Character" @click.stop="editCharacter(character)">
            <i class="mdi mdi-pencil"></i>
          </button>
          <button class="action-button" title="Delete" @click.stop="requestDeleteCharacter(character)">
            <i class="mdi mdi-delete"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="quick-actions">
      <button class="quick-action-button" @click="createCharacter">
        <i class="mdi mdi-account-plus"></i>
        Create Character
      </button>
      <button class="quick-action-button" @click="importCharacter">
        <i class="mdi mdi-upload"></i>
        Import Character
      </button>
      <button class="quick-action-button" @click="manageParty">
        <i class="mdi mdi-account-group"></i>
        Manage Party
      </button>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmationDialog
      :show="showDeleteConfirmation"
      title="Delete Character"
      :message="characterToDelete ? `Are you sure you want to remove '${characterToDelete.name}' from the game session?` : ''"
      confirm-text="Delete"
      cancel-text="Cancel"
      variant="danger"
      :show-database-option="true"
      @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';
import { useDocumentSheetStore } from '../../../stores/document-sheet.store.mjs';
import { getDocumentImageUrl } from '../../../utils/document-image-utils.mjs';
import { playerActionService } from '../../../services/player-action.service.mjs';
import { DocumentsClient } from '@dungeon-lab/client/index.mjs';
import ConfirmationDialog from '../../common/ConfirmationDialog.vue';
import type { ICharacter, StateOperation, RemoveDocumentParameters, BaseDocument } from '@dungeon-lab/shared/types/index.mjs';

const gameStateStore = useGameStateStore();
const documentSheetStore = useDocumentSheetStore();
const documentsClient = new DocumentsClient();
const router = useRouter();

// Navigation context - provided by parent HUD container
const hudNavigationContext = inject<{
  openSheet: (document: BaseDocument) => void;
  isMobile: boolean;
  isDesktop: boolean;
}>('hudNavigationContext', {
  openSheet: (document) => documentSheetStore.openDocumentSheet(document),
  isMobile: false,
  isDesktop: true
});
const searchQuery = ref('');
const activeFilter = ref('all');

// Confirmation dialog state
const showDeleteConfirmation = ref(false);
const characterToDelete = ref<ICharacter | null>(null);

// Drag and drop state
const isDragging = ref(false);
const draggedCharacter = ref<ICharacter | null>(null);

const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'pc', label: 'Players' },
  { id: 'npc', label: 'NPCs' },
  { id: 'companion', label: 'Companions' }
];

// Use real data from store instead of hardcoded
const characters = computed(() => gameStateStore.characters);

const filteredCharacters = computed(() => {
  let filtered = characters.value;

  // Filter by type
  if (activeFilter.value !== 'all') {
    filtered = filtered.filter((character: { pluginDocumentType: string; }) => 
      (character.pluginDocumentType || 'pc') === activeFilter.value
    );
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter((character: { name: string; pluginDocumentType: string; }) => 
      character.name.toLowerCase().includes(query) ||
      (character.pluginDocumentType || 'pc').toLowerCase().includes(query)
    );
  }

  return filtered;
});

// Helper function to get character image URL with proper transformation
function getCharacterImageUrl(character: ICharacter): string | null {
  return getDocumentImageUrl(character);
}

// Characters are automatically loaded when game session is joined
onMounted(async () => {
  // No need to manually load characters - they come from game state
});

// Implement real functionality
async function selectCharacter(character: ICharacter): Promise<void> {
  try {
    // Set the selected character in the game state store
    gameStateStore.selectedCharacter = character;
    console.log('Selected character:', character.name);
  } catch (error) {
    console.error('Failed to select character:', error);
  }
}

// Context-aware click handlers
function handleCharacterClick(character: ICharacter): void {
  if (hudNavigationContext.isMobile) {
    // Mobile: Single click opens sheet
    openCharacterSheet(character);
  } else {
    // Desktop: Single click selects character
    selectCharacter(character);
  }
}

function handleCharacterDoubleClick(character: ICharacter): void {
  if (hudNavigationContext.isDesktop) {
    // Desktop: Double click opens sheet
    openCharacterSheet(character);
  }
  // Mobile: Double click is handled by single click, so we prevent default
  if (hudNavigationContext.isMobile) {
    // Prevent double click behavior on mobile
    return;
  }
}

async function addToEncounter(character: ICharacter): Promise<void> {
  console.log('Adding character to encounter:', character);
  
  if (!gameStateStore.currentEncounter) {
    console.error('No active encounter to add character to');
    return;
  }
  
  // Validate GM permissions
  if (!gameStateStore.canUpdate) {
    console.warn('Only the GM can add characters to encounters');
    return;
  }
  
  try {
    // Check if character is already a participant
    const isAlreadyParticipant = gameStateStore.currentEncounter.participants?.some(
      participantId => participantId === character.id
    );
    
    if (isAlreadyParticipant) {
      console.log('Character is already a participant in this encounter');
      return;
    }
    
    const operations: StateOperation[] = [];
    
    // Add character as an encounter participant
    operations.push({
      path: '/currentEncounter/participants/-',
      op: 'add',
      value: character.id
    });
    
    // If turn order is active, also add to turn order with default values (if not already present)
    const turnManager = gameStateStore.gameState?.turnManager;
    if (turnManager?.isActive) {
      // Check if participant already exists in turn order
      const existingParticipant = turnManager.participants?.some(p => p.actorId === character.id);
      
      if (!existingParticipant) {
        const turnParticipant = {
          id: `participant_${character.id}`,
          name: character.name,
          actorId: character.id,
          turnOrder: 0, // Will need to be rolled for initiative later
          hasActed: false
        };
        
        operations.push({
          path: '/turnManager/participants/-',
          op: 'add',
          value: turnParticipant
        });
      } else {
        console.log('Character already exists in turn order:', character.name);
      }
    }
    
    const response = await gameStateStore.updateGameState(operations);
    
    if (response.success) {
      console.log('Character added to encounter successfully:', character.name);
      if (turnManager?.isActive) {
        console.log('Character also added to active turn order');
      }
    } else {
      console.error('Failed to add character to encounter:', response.error?.message);
    }
  } catch (error) {
    console.error('Failed to add character to encounter:', error);
  }
}

function requestDeleteCharacter(character: ICharacter): void {
  characterToDelete.value = character;
  showDeleteConfirmation.value = true;
}

function handleDeleteCancel(): void {
  showDeleteConfirmation.value = false;
  characterToDelete.value = null;
}

async function handleDeleteConfirm(deleteFromDatabase: boolean): Promise<void> {
  if (!characterToDelete.value) return;

  const character = characterToDelete.value;
  showDeleteConfirmation.value = false;
  characterToDelete.value = null;

  try {
    // Always remove from game session first
    const parameters: RemoveDocumentParameters = {
      documentId: character.id,
      documentName: character.name,
      documentType: character.documentType
    };

    const result = await playerActionService.requestAction(
      'remove-document',
      undefined, // actorId - not an actor-specific action
      parameters,
      undefined, // actorTokenId
      undefined, // targetTokenIds
      {
        description: `Remove ${character.name} from session`
      }
    );

    if (result.success && result.approved) {
      console.log(`[CharactersTab] ${character.name} removed from session successfully`);

      // If user requested database deletion, do that too
      if (deleteFromDatabase) {
        try {
          await documentsClient.deleteDocument(character.id);
          console.log(`[CharactersTab] ${character.name} deleted from database successfully`);
        } catch (dbError) {
          console.error('[CharactersTab] Failed to delete character from database:', dbError);
          // Don't throw - session removal succeeded
        }
      }
    } else if (result.success && !result.approved) {
      console.log(`[CharactersTab] Waiting for GM approval to remove ${character.name}`);
    } else {
      console.error('[CharactersTab] Failed to remove character from session:', result.error);
    }
  } catch (error) {
    console.error('Failed to delete character:', error);
  }
}

async function editCharacter(character: ICharacter): Promise<void> {
  console.log('Editing character:', character);
  
  try {
    // Navigate to character edit view
    await router.push(`/character/${character.id}`);
  } catch (error) {
    console.error('Failed to navigate to character editor:', error);
  }
}

// Character sheet functions
function openCharacterSheet(character: ICharacter): void {
  hudNavigationContext.openSheet(character);
}

// Quick action functions
async function createCharacter(): Promise<void> {
  try {
    await router.push('/character/create');
  } catch (error) {
    console.error('Failed to navigate to character creation:', error);
  }
}

function importCharacter(): void {
  // TODO: Implement character import functionality
  console.log('Import character functionality not yet implemented');
}

function manageParty(): void {
  // TODO: Implement party management functionality
  console.log('Party management functionality not yet implemented');
}

// ============================================================================
// DRAG AND DROP FUNCTIONALITY
// ============================================================================

function handleDragStart(event: DragEvent, character: ICharacter): void {
  if (!event.dataTransfer) return;
  
  // Set drag state
  isDragging.value = true;
  draggedCharacter.value = character;
  
  // Set transfer data for drop handling
  const dragData = {
    type: 'document-token',
    documentId: character.id,
    documentType: character.documentType,
    name: character.name,
    imageUrl: getCharacterImageUrl(character)
  };
  
  event.dataTransfer.setData('application/json', JSON.stringify(dragData));
  event.dataTransfer.effectAllowed = 'copy';
  
  // Set custom drag image if we have a character image
  const imageUrl = getCharacterImageUrl(character);
  if (imageUrl) {
    const dragImage = new Image();
    dragImage.src = imageUrl;
    dragImage.onload = () => {
      // Scale the image for dragging
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(dragImage, 0, 0, 64, 64);
        
        // Add a subtle border
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 64, 64);
        
        event.dataTransfer?.setDragImage(canvas, 32, 32);
      }
    };
  }
  
  console.log(`Started dragging character: ${character.name}`);
}

function handleDragEnd(): void {
  // Reset drag state
  isDragging.value = false;
  draggedCharacter.value = null;
  
  console.log('Drag ended');
}
</script>

<style scoped>
.characters-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.characters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.characters-header h4 {
  color: white;
  margin: 0;
  font-weight: 600;
}

.characters-controls {
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

.filter-tabs {
  display: flex;
  gap: 4px;
}

.filter-tab {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 6px 12px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 600;
}

.filter-tab:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.filter-tab.filter-active {
  background: rgba(59, 130, 246, 0.6);
  color: white;
  border-color: rgba(59, 130, 246, 0.8);
}

.characters-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.character-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.character-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.character-card.is-dragging {
  opacity: 0.5;
  transform: scale(0.95);
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

.character-card.character-pc {
  border-left: 3px solid #3b82f6;
}

.character-card.character-npc {
  border-left: 3px solid #22c55e;
}

.character-card.character-companion {
  border-left: 3px solid #f59e0b;
}

.character-avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  overflow: hidden;
}

.character-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.character-avatar i {
  font-size: 20px;
}

.character-info {
  flex: 1;
  min-width: 0;
}

.character-name {
  color: white;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.character-details {
  display: flex;
  gap: 8px;
}

.character-type {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  text-transform: capitalize;
}

.character-level {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.character-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.character-card:hover .character-actions {
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

.quick-actions {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-action-button {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 10px 12px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
}

.quick-action-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateY(-1px);
}

/* Scrollbar styling */
.characters-list::-webkit-scrollbar {
  width: 6px;
}

.characters-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.characters-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.characters-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* Mobile-specific styles - injected context aware */
.characters-tab:has([data-mobile="true"]) .character-actions {
  display: none !important;
}

.characters-tab:has([data-mobile="true"]) .character-card {
  cursor: pointer !important;
  min-height: 64px !important;
  padding: 16px !important;
  border-radius: 8px !important;
}

.characters-tab:has([data-mobile="true"]) .character-card:active {
  transform: scale(0.98);
  transition: transform 0.1s ease;
}

/* Alternative mobile styles using class-based approach */
.characters-tab.mobile-context .character-actions {
  display: none !important;
}

.characters-tab.mobile-context .character-card {
  cursor: pointer !important;
  min-height: 64px !important;
  padding: 16px !important;
  border-radius: 8px !important;
}

.characters-tab.mobile-context .character-card:active {
  transform: scale(0.98);
  transition: transform 0.1s ease;
}
</style>