<template>
  <div class="actors-tab">
    <div class="actors-header">
      <h4>Actors</h4>
      <div class="actors-controls">
        <button class="control-button" title="Add Actor">
          <i class="mdi mdi-plus"></i>
        </button>
        <button class="control-button" title="Import Actors">
          <i class="mdi mdi-upload"></i>
        </button>
        <button class="control-button" title="Actor Settings">
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
          placeholder="Search actors..."
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

    <div class="actors-list">
      <div
        v-for="actor in filteredActors"
        :key="actor.id"
        class="actor-card"
        :class="[
          `actor-${actor.pluginDocumentType}`,
          { 'is-dragging': isDragging && draggedActor?.id === actor.id }
        ]"
        draggable="true"
        @click="selectActor(actor)"
        @dblclick="openCharacterSheet(actor)"
        @dragstart="handleDragStart($event, actor)"
        @dragend="handleDragEnd"
      >
        <div class="actor-avatar">
          <img 
            v-if="getDocumentImageUrl(actor)" 
            :src="getDocumentImageUrl(actor)!" 
            :alt="actor.name"
            @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
          />
          <i v-else class="mdi mdi-account-circle"></i>
        </div>
        
        <div class="actor-info">
          <div class="actor-name">{{ actor.name }}</div>
          <div class="actor-details">
            <span class="actor-type">{{ actor.pluginDocumentType }}</span>
          </div>
        </div>

        <div class="actor-actions">
          <button class="action-button" title="Character Sheet" @click.stop="openCharacterSheet(actor)">
            <i class="mdi mdi-file-document"></i>
          </button>
          <button class="action-button" title="Add to Encounter" @click.stop="addToEncounter(actor)">
            <i class="mdi mdi-plus-circle"></i>
          </button>
          <button class="action-button" title="Edit Actor" @click.stop="editActor(actor)">
            <i class="mdi mdi-pencil"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="quick-actions">
      <button class="quick-action-button">
        <i class="mdi mdi-account-plus"></i>
        Create Character
      </button>
      <button class="quick-action-button">
        <i class="mdi mdi-sword-cross"></i>
        Create Monster
      </button>
      <button class="quick-action-button">
        <i class="mdi mdi-account-group"></i>
        Create NPC
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';
import { useDocumentSheetStore } from '../../../stores/document-sheet.store.mjs';
import { getDocumentImageUrl } from '../../../utils/document-image-utils.mjs';
import type { IActor, StateOperation } from '@dungeon-lab/shared/types/index.mjs';

const gameStateStore = useGameStateStore();
const documentSheetStore = useDocumentSheetStore();
const router = useRouter();
const searchQuery = ref('');
const activeFilter = ref('all');

// Drag and drop state
const isDragging = ref(false);
const draggedActor = ref<IActor | null>(null);

const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'character', label: 'Characters' },
  { id: 'monster', label: 'Monsters' },
  { id: 'npc', label: 'NPCs' }
];

// Use real data from store instead of hardcoded
const actors = computed(() => gameStateStore.actors);

const filteredActors = computed(() => {
  let filtered = actors.value;

  // Filter by type
  if (activeFilter.value !== 'all') {
    filtered = filtered.filter((actor: { pluginDocumentType: string; }) => actor.pluginDocumentType === activeFilter.value);
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter((actor: { name: string; pluginDocumentType: string; }) => 
      actor.name.toLowerCase().includes(query) ||
      actor.pluginDocumentType.toLowerCase().includes(query)
    );
  }

  return filtered;
});

// Actors are automatically loaded when game session is joined
onMounted(async () => {
  // No need to manually load actors - they come from game state
});

// Implement real functionality  
async function selectActor(actor: IActor): Promise<void> {
  try {
    // Actors don't have a "current" concept in the new system
    // This would depend on the specific use case
    console.log('Selected actor:', actor.name);
  } catch (error) {
    console.error('Failed to select actor:', error);
  }
}

async function addToEncounter(actor: IActor): Promise<void> {
  console.log('Adding to encounter:', actor);
  
  if (!gameStateStore.currentEncounter) {
    console.error('No active encounter to add actor to');
    return;
  }
  
  // Validate GM permissions
  if (!gameStateStore.canUpdate) {
    console.warn('Only the GM can add actors to encounters');
    return;
  }
  
  try {
    // Check if actor is already a participant
    const isAlreadyParticipant = gameStateStore.currentEncounter.participants?.some(
      participantId => participantId === actor.id
    );
    
    if (isAlreadyParticipant) {
      console.log('Actor is already a participant in this encounter');
      return;
    }
    
    // Add actor as a participant using game state operations
    const operations: StateOperation[] = [{
      path: 'currentEncounter.participants',
      op: 'add',
      value: actor.id
    }];
    
    const response = await gameStateStore.updateGameState(operations);
    
    if (response.success) {
      console.log('Actor added to encounter successfully:', actor.name);
    } else {
      console.error('Failed to add actor to encounter:', response.error?.message);
    }
  } catch (error) {
    console.error('Failed to add actor to encounter:', error);
  }
}

async function editActor(actor: IActor): Promise<void> {
  console.log('Editing actor:', actor);
  
  try {
    // For actors that are player characters, check plugin document type
    if (actor.pluginDocumentType === 'character') {
      await router.push(`/characters/${actor.id}/edit`);
    } else {
      // For other actor types (monsters, NPCs), navigate to a generic actor edit view
      // For now, we'll navigate to the character edit view as a fallback
      // In a full implementation, this would be a dedicated actor editor
      await router.push(`/actors/${actor.id}/edit`);
    }
  } catch (error) {
    console.error('Failed to navigate to actor editor:', error);
    // Fallback: could show a modal editor or error message
    console.warn('Actor editing not fully implemented for this actor type');
  }
}

// Character sheet functions
function openCharacterSheet(actor: IActor): void {
  documentSheetStore.openDocumentSheet(actor);
}

// ============================================================================
// DRAG AND DROP FUNCTIONALITY
// ============================================================================

function handleDragStart(event: DragEvent, actor: IActor): void {
  if (!event.dataTransfer) return;
  
  // Set drag state
  isDragging.value = true;
  draggedActor.value = actor;
  
  // Set transfer data for drop handling
  const dragData = {
    type: 'document-token',
    documentId: actor.id,
    documentType: actor.documentType,
    name: actor.name,
    imageUrl: getDocumentImageUrl(actor)
  };
  
  event.dataTransfer.setData('application/json', JSON.stringify(dragData));
  event.dataTransfer.effectAllowed = 'copy';
  
  // Set custom drag image if we have an actor image
  const imageUrl = getDocumentImageUrl(actor);
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
        event.dataTransfer?.setDragImage(canvas, 32, 32);
      }
    };
  }
  
  console.log(`Started dragging actor: ${actor.name}`);
}

function handleDragEnd(): void {
  // Reset drag state
  isDragging.value = false;
  draggedActor.value = null;
  
  console.log('Drag ended');
}

</script>

<style scoped>
.actors-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.actors-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.actors-header h4 {
  color: white;
  margin: 0;
  font-weight: 600;
}

.actors-controls {
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

.actors-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.actor-card {
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

.actor-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.actor-card.actor-character {
  border-left: 3px solid #3b82f6;
}

.actor-card.actor-monster {
  border-left: 3px solid #ef4444;
}

.actor-card.actor-npc {
  border-left: 3px solid #22c55e;
}

.actor-card.is-dragging {
  opacity: 0.5;
  transform: scale(0.95);
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

.actor-avatar {
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

.actor-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.actor-avatar i {
  font-size: 20px;
}

.actor-info {
  flex: 1;
  min-width: 0;
}

.actor-name {
  color: white;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.actor-details {
  display: flex;
  gap: 8px;
}

.actor-type {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  text-transform: capitalize;
}

.actor-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.actor-card:hover .actor-actions {
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
.actors-list::-webkit-scrollbar {
  width: 6px;
}

.actors-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.actors-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.actors-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>