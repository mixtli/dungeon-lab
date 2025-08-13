<template>
  <div class="characters-tab">
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
        draggable="true"
        @click="selectCharacter(character)"
        @dblclick="openCharacterSheet(character)"
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
          <div class="character-details">
            <span class="character-type">{{ character.pluginDocumentType || 'PC' }}</span>
          </div>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';
import { useCharacterSheetStore } from '../../../stores/character-sheet.store.mjs';
import { getDocumentImageUrl } from '../../../utils/document-image-utils.mjs';
import type { ICharacter, StateOperation } from '@dungeon-lab/shared/types/index.mjs';

const gameStateStore = useGameStateStore();
const characterSheetStore = useCharacterSheetStore();
const router = useRouter();
const searchQuery = ref('');
const activeFilter = ref('all');

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
    
    // Add character as a participant using game state operations
    const operations: StateOperation[] = [{
      path: 'currentEncounter.participants',
      operation: 'push',
      value: character.id
    }];
    
    const response = await gameStateStore.updateGameState(operations);
    
    if (response.success) {
      console.log('Character added to encounter successfully:', character.name);
    } else {
      console.error('Failed to add character to encounter:', response.error?.message);
    }
  } catch (error) {
    console.error('Failed to add character to encounter:', error);
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
  characterSheetStore.openCharacterSheet(character);
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
</style>