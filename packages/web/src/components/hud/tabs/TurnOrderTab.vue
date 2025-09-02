<template>
  <div class="turn-order-tab h-full flex flex-col">
    <div v-if="!isInTurnOrder" class="turn-order-setup space-y-4">
      <div class="text-center">
        <h3 class="text-lg font-semibold mb-2">Turn Order Setup</h3>
        <p class="text-gray-600 mb-4">Encounter participants ready for turn order</p>
      </div>
      
      <!-- Show encounter participants even when turn order is not active -->
      <div v-if="encounterParticipants.length > 0" class="participants-preview">
        <div class="text-center mb-2">
          <span class="text-sm text-gray-500 italic">
            {{ encounterParticipants.length }} participants
          </span>
        </div>
        
        <div class="participant-list-preview">
          <div 
            v-for="participant in encounterParticipants"
            :key="participant.id"
            class="participant-preview-item"
          >
            <div class="participant-info">
              <div class="participant-name-section">
                <span v-if="isControlledByCurrentUser(participant)" class="control-indicator">🔵</span>
                <span class="participant-name">{{ participant.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center text-gray-500 text-sm">
        No participants in encounter. Add characters or actors first.
      </div>
      
      <!-- Primary action: Always available, universal -->
      <div class="flex justify-center">
        <button @click="rollInitiative" class="standard-button bg-blue-600 hover:bg-blue-700" :disabled="encounterParticipants.length === 0">
          🎲 Roll Initiative
        </button>
      </div>
    </div>
    
    <div v-else class="turn-order-active flex flex-col flex-1">
      <!-- Top content area -->
      <div class="flex-1 space-y-4">
        <!-- Centered Round Header -->
        <div class="text-center">
          <h3 class="text-xl font-bold">Round {{ turnManager?.round }}</h3>
        </div>
        
        <!-- Main feature: Drag-and-drop initiative tracker (always available) -->
        <div class="initiative-tracker">
          <div v-if="allowsManualReordering" class="text-center mb-2">
            <span class="drag-hint text-sm text-gray-500 italic">
              🔄 Drag to reorder
            </span>
          </div>
          
          <div 
            v-for="(participant, index) in turnManager?.participants || []"
            :key="participant.id"
            :draggable="allowsManualReordering && gameStateStore.canUpdate"
            @dragstart="onDragStart($event, index)"
            @dragover.stop="onDragOver"
            @dragenter.stop
            @dragleave.stop
            @drop.stop="onDrop($event, index)"
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
              <div class="participant-name-section">
                <span v-if="isControlledByCurrentUser(participant)" class="control-indicator">🔵</span>
                <span class="participant-name">{{ participant.name }}</span>
                <span v-if="participant.hasActed" class="acted-checkmark">✓</span>
              </div>
              <span 
                v-if="participant.turnOrder > 0" 
                class="initiative-score"
                :title="String(participant.participantData?.initiativeMethod || 'Unknown method')"
              >
                {{ participant.turnOrder }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Turn Controls -->
        <div class="turn-controls-section">
          <div v-if="isInTurnOrder" class="flex justify-center">
            <button @click="endTurn" class="standard-button bg-green-600 hover:bg-green-700">
              ➤ End Turn
            </button>
          </div>
        </div>
      </div>
      
      <!-- Roll Initiative - Pushed to very bottom of tab -->
      <div v-if="showCalculateButton" class="flex-shrink-0 border-t border-gray-200 pt-4 mt-4">
        <div class="flex justify-center">
          <button @click="calculateInitiative" class="standard-button bg-blue-600 hover:bg-blue-700">
            🎲 Re-roll Initiative
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';
import { useAuthStore } from '../../../stores/auth.store.mjs';
import { turnManagerService } from '../../../services/turn-manager.service.mjs';
import { gameActionClientService } from '../../../services/game-action-client.service.mjs';
import { useNotificationStore } from '../../../stores/notification.store.mjs';

const gameStateStore = useGameStateStore();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

const turnManager = computed(() => gameStateStore.gameState?.turnManager);
const isInTurnOrder = computed(() => turnManager.value?.isActive ?? false);

// Get encounter participants for preview when turn order is not active
const encounterParticipants = computed(() => {
  if (!gameStateStore.currentEncounter?.participants) return [];
  
  return gameStateStore.currentEncounter.participants.map(participantId => {
    const document = gameStateStore.gameState?.documents[participantId];
    
    return {
      id: `participant_${participantId}`,
      name: document?.name || 'Unknown',
      actorId: participantId
    };
  }).filter(participant => participant.name !== 'Unknown'); // Filter out missing documents
});

// Get plugin capabilities for UI behavior
const plugin = computed(() => turnManagerService.getPlugin());
const allowsManualReordering = computed(() => {
  const result = plugin.value?.allowsManualReordering() ?? true;
  console.log('[TurnOrder] allowsManualReordering:', result, 'plugin:', !!plugin.value, 'canUpdate:', gameStateStore.canUpdate);
  return result;
});
// Always show the roll initiative button at the bottom when turn order is active
const showCalculateButton = computed(() => isInTurnOrder.value);

// Drag-and-drop state
const draggedIndex = ref<number | null>(null);

// Check if current user controls this participant's document
function isControlledByCurrentUser(participant: { actorId?: string }): boolean {
  if (!participant.actorId) return false;
  
  const document = gameStateStore.gameState?.documents[participant.actorId];
  return document?.ownerId === authStore.user?.id;
}

// Remove the old startTurnBasedMode function - now using rollInitiative directly

async function rollInitiative() {
  try {
    // Validate we have participants
    if (encounterParticipants.value.length === 0) {
      notificationStore.addNotification({ 
        message: 'No participants in encounter. Add characters or actors first.', 
        type: 'warning' 
      });
      return;
    }
    
    const response = await gameActionClientService.requestRollInitiative();
    
    if (response.success) {
      // Success notification will come from game state updates
      console.log('Roll initiative request approved - turn order started');
    } else {
      const errorMessage = response.error?.message || 'Failed to roll initiative';
      console.error('Roll initiative request failed:', errorMessage);
      notificationStore.addNotification({ message: errorMessage, type: 'error' });
    }
  } catch (error) {
    console.error('Failed to send roll initiative request:', error);
    notificationStore.addNotification({ message: 'Failed to send roll initiative request', type: 'error' });
  }
}

// Keep the old calculateInitiative function for the existing "Roll Initiative" button during active turn order
async function calculateInitiative() {
  try {
    const response = await gameActionClientService.requestRollInitiative();
    
    if (response.success) {
      // Success notification will come from game state updates
      console.log('Roll initiative request approved');
    } else {
      const errorMessage = response.error?.message || 'Failed to roll initiative';
      console.error('Roll initiative request failed:', errorMessage);
      notificationStore.addNotification({ message: errorMessage, type: 'error' });
    }
  } catch (error) {
    console.error('Failed to send roll initiative request:', error);
    notificationStore.addNotification({ message: 'Failed to send roll initiative request', type: 'error' });
  }
}

// Drag-and-drop handlers for manual reordering
function onDragStart(event: DragEvent, index: number) {
  console.log('[TurnOrder] Drag start:', index, turnManager.value?.participants[index]?.name);
  draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    // Set specific drag data type to distinguish from token drags
    event.dataTransfer.setData('application/turnorder-participant', JSON.stringify({
      type: 'turnorder-participant',
      index,
      participantId: turnManager.value?.participants[index]?.id
    }));
    // Fallback for compatibility
    event.dataTransfer.setData('text/plain', index.toString());
  }
  // Stop event propagation to prevent EncounterView from handling this drag
  event.stopPropagation();
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

async function onDrop(event: DragEvent, dropIndex: number) {
  event.preventDefault();
  console.log('[TurnOrder] Drop at index:', dropIndex, 'dragged from:', draggedIndex.value);
  
  if (draggedIndex.value === null || !turnManager.value) {
    console.log('[TurnOrder] Drop aborted: no dragged index or turn manager');
    return;
  }
  
  if (draggedIndex.value === dropIndex) {
    console.log('[TurnOrder] Drop aborted: same position');
    draggedIndex.value = null;
    return;
  }
  
  const participants = [...turnManager.value.participants];
  const draggedItem = participants.splice(draggedIndex.value, 1)[0];
  participants.splice(dropIndex, 0, draggedItem);
  
  console.log('[TurnOrder] Reordered participants:', participants.map(p => p.name));
  
  try {
    await turnManagerService.updateParticipantOrder(participants);
    console.log('[TurnOrder] Successfully updated participant order');
  } catch (error) {
    console.error('[TurnOrder] Failed to update participant order:', error);
  }
  
  draggedIndex.value = null;
}

async function endTurn() {
  try {
    const response = await gameActionClientService.requestEndTurn();
    
    if (response.success) {
      // Success notification will come from game state updates
      console.log('Turn end request approved');
    } else {
      const errorMessage = response.error?.message || 'Failed to end turn';
      console.error('Turn end request failed:', errorMessage);
      notificationStore.addNotification({ message: errorMessage, type: 'error' });
    }
  } catch (error) {
    console.error('Failed to send end turn request:', error);
    notificationStore.addNotification({ message: 'Failed to send turn end request', type: 'error' });
  }
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

.participant-info {
  @apply flex-1 flex justify-between items-center;
}

.participant-name-section {
  @apply flex items-center gap-1;
}

.control-indicator {
  @apply text-blue-500 text-sm;
}

.acted-checkmark {
  @apply text-green-500 font-bold;
}

.initiative-score {
  @apply bg-gray-100 text-gray-900 px-2 py-1 rounded text-sm font-mono;
}

/* Standardized button styling for all turn order buttons */
.standard-button {
  @apply px-4 py-2 text-base font-medium text-white;
  @apply rounded-lg shadow-md hover:shadow-lg;
  @apply transition-all duration-200;
  @apply border border-transparent;
  @apply min-w-32;
}

.standard-button:hover:not(:disabled) {
  @apply transform scale-105;
}

.standard-button:disabled {
  @apply opacity-50 cursor-not-allowed;
  @apply bg-gray-400 hover:bg-gray-400;
}

/* Preview styles for participants when turn order is not active */
.participants-preview {
  @apply border border-gray-200 rounded-lg p-4 bg-gray-50;
}

.participant-list-preview {
  @apply space-y-2 max-h-40 overflow-y-auto;
}

.participant-preview-item {
  @apply flex items-center p-2 bg-white border border-gray-100 rounded;
}

.participant-preview-item .participant-info {
  @apply flex-1 flex justify-between items-center;
}

.participant-preview-item .participant-name {
  @apply text-gray-900 font-medium;
}
</style>