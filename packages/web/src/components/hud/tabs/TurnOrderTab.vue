<template>
  <div class="turn-order-tab">
    <div v-if="!isInTurnOrder" class="turn-order-setup">
      <h3>Turn Order Setup</h3>
      <p>Set up turn order for this scene</p>
      
      <!-- Primary action: Always available, universal -->
      <button @click="startTurnBasedMode" class="btn-primary">
        {{ calculateButtonLabel }}
      </button>
      
      <!-- Secondary button removed from setup phase - only needed when turn order is active -->
    </div>
    
    <div v-else class="turn-order-active">
      <div class="turn-order-header">
        <h3>Turn Order - Round {{ turnManager?.round }}</h3>
        <div class="header-controls">
          <!-- Recalculate button for systems that support it -->
          <button 
            v-if="showCalculateButton"
            @click="calculateInitiative" 
            class="btn-secondary"
          >
            🎲 {{ calculateButtonLabel }}
          </button>
          <button @click="endTurnBasedMode" class="btn-danger">End Turn Order</button>
        </div>
      </div>
      
      <!-- Main feature: Drag-and-drop initiative tracker (always available) -->
      <div class="initiative-tracker">
        <div class="tracker-header">
          <h4>Initiative Order</h4>
          <span v-if="allowsManualReordering" class="drag-hint">
            🔄 Drag to reorder
          </span>
        </div>
        
        <div 
          v-for="(participant, index) in turnManager?.participants || []"
          :key="participant.id"
          :draggable="allowsManualReordering && gameStateStore.canUpdate"
          @dragstart="onDragStart($event, index)"
          @dragover="onDragOver"
          @drop="onDrop($event, index)"
          :class="{
            'participant-item': true,
            'current-turn': index === (turnManager?.currentTurn ?? -1),
            'has-acted': participant.hasActed,
            'draggable': allowsManualReordering && gameStateStore.canUpdate,
            'drag-target': draggedIndex !== null && draggedIndex !== index
          }"
        >
          <!-- Drag handle (visible when reordering is allowed) -->
          <div v-if="allowsManualReordering" class="drag-handle">
            ⋮⋮
          </div>
          
          <div class="participant-info">
            <span class="participant-name">{{ participant.name }}</span>
            <span 
              v-if="participant.turnOrder > 0" 
              class="initiative-score"
              :title="String(participant.participantData?.initiativeMethod || 'Unknown method')"
            >
              {{ participant.turnOrder }}
            </span>
          </div>
          
          <div class="participant-status">
            <span v-if="participant.hasActed" class="acted-indicator">
              ✓ Acted
            </span>
          </div>
        </div>
      </div>
      
      <div class="turn-controls" v-if="gameStateStore.canUpdate">
        <button @click="nextTurn" class="btn-primary">Next Turn</button>
      </div>
      
      <div class="action-availability" v-if="currentParticipant">
        <h4>Available Actions</h4>
        <div class="action-buttons">
          <button 
            :disabled="!canPerformAction('attack')"
            class="action-btn"
          >
            ⚔️ Attack
          </button>
          <button 
            :disabled="!canPerformAction('cast-spell')"
            class="action-btn"
          >
            ✨ Cast Spell
          </button>
          <button 
            :disabled="!canPerformAction('move')"
            class="action-btn"
          >
            🏃 Move
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';
import { turnManagerService } from '../../../services/turn-manager.service.mjs';
import { useNotificationStore } from '../../../stores/notification.store.mjs';

const gameStateStore = useGameStateStore();
const notificationStore = useNotificationStore();

const turnManager = computed(() => gameStateStore.gameState?.turnManager);
const isInTurnOrder = computed(() => turnManager.value?.isActive ?? false);
const currentParticipant = computed(() => {
  const tm = turnManager.value;
  return tm?.participants[tm.currentTurn] || null;
});

// Get plugin capabilities for UI behavior
const plugin = computed(() => turnManagerService.getPlugin());
const allowsManualReordering = computed(() => plugin.value?.allowsManualReordering() ?? true);
const calculateButtonLabel = computed(() => plugin.value?.getInitiativeButtonLabel() ?? 'Start Turn Order');
const showCalculateButton = computed(() => plugin.value?.showCalculateButton() ?? false);

// Drag-and-drop state
const draggedIndex = ref<number | null>(null);

async function startTurnBasedMode() {
  try {
    // Get tokens from current encounter
    const tokens = gameStateStore.currentEncounter?.tokens || [];
    
    const participants = tokens.map(token => ({
      id: token.id, // Use token ID as participant ID for proper permission mapping
      name: token.name,
      actorId: token.documentId || '',
      tokenId: token.id,
      hasActed: false,
      turnOrder: 0, // Will be calculated by plugin
    }));
    
    await turnManagerService.startTurnOrder(participants);
    notificationStore.addNotification({ message: 'Turn-based mode started!', type: 'success' });
    
  } catch (error) {
    console.error('Failed to start turn-based mode:', error);
    notificationStore.addNotification({ message: 'Failed to start turn-based mode', type: 'error' });
  }
}

async function calculateInitiative() {
  try {
    await turnManagerService.recalculateInitiative();
    notificationStore.addNotification({ message: 'Initiative calculated!', type: 'success' });
  } catch (error) {
    console.error('Failed to calculate initiative:', error);
    notificationStore.addNotification({ message: 'Failed to calculate initiative', type: 'error' });
  }
}

// Drag-and-drop handlers for manual reordering
function onDragStart(event: DragEvent, index: number) {
  draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

async function onDrop(event: DragEvent, dropIndex: number) {
  event.preventDefault();
  if (draggedIndex.value === null || !turnManager.value) return;
  
  const participants = [...turnManager.value.participants];
  const draggedItem = participants.splice(draggedIndex.value, 1)[0];
  participants.splice(dropIndex, 0, draggedItem);
  
  await turnManagerService.updateParticipantOrder(participants);
  draggedIndex.value = null;
}

async function nextTurn() {
  try {
    const continued = await turnManagerService.nextTurn();
    if (!continued) {
      notificationStore.addNotification({ message: 'Turn-based mode ended', type: 'info' });
    }
  } catch (error) {
    console.error('Failed to advance turn:', error);
    notificationStore.addNotification({ message: 'Failed to advance turn', type: 'error' });
  }
}

async function endTurnBasedMode() {
  try {
    await turnManagerService.endTurnOrder();
    notificationStore.addNotification({ message: 'Turn-based mode ended', type: 'success' });
  } catch (error) {
    console.error('Failed to end turn-based mode:', error);
  }
}

function canPerformAction(actionType: string): boolean {
  const participantId = currentParticipant.value?.id;
  if (!participantId) return false;
  
  return turnManagerService.canPerformAction(participantId, actionType);
}
</script>

<style scoped>
.participant-item {
  @apply flex items-center p-2 border-b relative;
}

.participant-item.current-turn {
  @apply bg-blue-600 text-white border-blue-700 font-semibold;
}

.participant-item.has-acted {
  @apply opacity-60;
}

/* Drag-and-drop styling */
.participant-item.draggable {
  @apply cursor-move;
}

.participant-item.draggable:hover {
  @apply bg-gray-50;
}

.participant-item.drag-target {
  @apply border-t-2 border-blue-500;
}

.drag-handle {
  @apply text-gray-400 mr-2 cursor-move select-none;
}

.drag-hint {
  @apply text-sm text-gray-500 italic;
}

.tracker-header {
  @apply flex justify-between items-center mb-2 pb-2 border-b;
}

.header-controls {
  @apply flex gap-2;
}

.participant-info {
  @apply flex-1 flex justify-between items-center;
}

.initiative-score {
  @apply bg-gray-100 text-gray-900 px-2 py-1 rounded text-sm font-mono;
}

.action-btn:disabled {
  @apply opacity-50 cursor-not-allowed;
}
</style>