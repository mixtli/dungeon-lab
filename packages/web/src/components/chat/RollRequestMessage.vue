<template>
  <div class="roll-request-message">
    <div class="request-header">
      <span class="request-icon">🎲</span>
      <div class="request-content">
        <span class="request-text">{{ rollRequest?.message || 'Unknown request' }}</span>
        <div class="request-details">
          <code class="dice-expression">{{ diceExpression }}</code>
          <span v-if="rollRequest?.metadata?.isCriticalHit" class="critical-indicator">
            ⚡ CRITICAL
          </span>
        </div>
      </div>
    </div>
    
    <div class="request-actions" v-if="!completed">
      <button 
        @click="acceptRollRequest" 
        :disabled="processing"
        class="accept-btn"
      >
        {{ processing ? 'Rolling...' : buttonText }}
      </button>
      
      <button 
        @click="declineRollRequest" 
        :disabled="processing"
        class="decline-btn"
      >
        Decline
      </button>
    </div>
    
    <div class="completion-status" v-if="completed">
      <span class="completed-icon">✅</span>
      <span class="completed-text">Completed</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useSocketStore } from '../../stores/socket.store.mjs';
import { useChatStore } from '../../stores/chat.store.mts';
import type { ChatMessage } from '../../stores/chat.store.mjs';
import type { RollServerResult } from '@dungeon-lab/shared/types/socket/index.mjs';
import { diceArrayToExpression } from '@dungeon-lab/shared/utils/dice-parser.mjs';

interface Props {
  message: ChatMessage;
}


const props = defineProps<Props>();
const socketStore = useSocketStore();
const chatStore = useChatStore();
const processing = ref(false);
const completed = ref(false);

// Extract roll request from message
const rollRequest = props.message.rollRequestData;

// Convert dice array to expression for display
const diceExpression = computed(() => {
  if (!rollRequest || !rollRequest.dice) {
    return 'Unknown dice';
  }
  
  try {
    return diceArrayToExpression(rollRequest.dice, 0);
  } catch (error) {
    console.error('[RollRequestMessage] Failed to convert dice array to expression:', error);
    return 'Invalid dice';
  }
});

// Dynamic button text based on roll type
const buttonText = computed(() => {
  if (!rollRequest?.rollType) {
    return 'Roll';
  }
  
  switch (rollRequest.rollType) {
    case 'spell-attack':
    case 'weapon-attack':
      return 'Roll Attack';
    case 'spell-damage':
    case 'weapon-damage':
      return 'Roll Damage';
    case 'saving-throw':
      return 'Roll Save';
    case 'ability-check':
      return 'Roll Check';
    default:
      return 'Roll';
  }
});

function acceptRollRequest(): void {
  if (!rollRequest) {
    console.error('[RollRequestMessage] No roll request data available');
    return;
  }
  
  processing.value = true;
  
  try {
    // Use the existing rollId from the roll request for proper correlation
    const rollId = rollRequest.rollId;
    
    // Create roll object using the new roll schema format
    const roll = {
      rollId: rollId,  // Use existing rollId for promise correlation
      rollType: rollRequest.rollType,
      pluginId: 'dnd-5e-2024',
      dice: rollRequest.dice, // Use dice array directly from roll request
      recipients: 'public' as const,
      arguments: { 
        customModifier: 0,
        pluginArgs: {}
      },
      modifiers: [],
      metadata: {
        title: 'Weapon Damage',
        ...rollRequest.metadata,
        responseToRequestId: rollRequest.rollId
      }
    };
    
    // Send roll with proper schema format
    socketStore.socket?.emit('roll', roll, (response: { success: boolean, error?: string }) => {
      if (!response.success) {
        console.error('[RollRequestMessage] Failed to process roll:', response.error);
      }
    });
    
    console.log('[RollRequestMessage] Accepted roll request:', rollRequest.rollId);
  } catch (error) {
    console.error('[RollRequestMessage] Failed to accept roll request:', error);
    processing.value = false;
  }
  
  // Note: processing will be reset when the roll completes or fails
  // The roll result will come back through the normal roll handler
}

function declineRollRequest(): void {
  if (!rollRequest) {
    console.error('[RollRequestMessage] No roll request data available');
    return;
  }
  
  console.log('[RollRequestMessage] Declined roll request:', rollRequest.rollId);
  
  // Remove the roll request card when declined
  setTimeout(() => {
    chatStore.removeMessage(props.message.id);
  }, 500);
}

// Auto-cleanup when roll result comes back
let unsubscribe: (() => void) | null = null;

onMounted(() => {
  if (!rollRequest) return;
  
  // Listen for roll results that match this request
  const handleRollResult = (result: RollServerResult) => {
    if (result.rollId === rollRequest.rollId) {
      console.log('[RollRequestMessage] Received matching roll result, completing request');
      
      // Show completed state briefly
      processing.value = false;
      completed.value = true;
      
      // Remove after brief delay to show completion
      setTimeout(() => {
        chatStore.removeMessage(props.message.id);
      }, 2000);
    }
  };
  
  // Subscribe to roll results via socket store
  const socket = socketStore.socket;
  if (socket) {
    socket.on('roll:result', handleRollResult);
    
    unsubscribe = () => {
      socket.off('roll:result', handleRollResult);
    };
  }
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});
</script>

<style scoped>
.roll-request-message {
  background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
  border: 2px solid #9c27b0;
  border-radius: 12px;
  padding: 16px;
  margin: 8px 0;
  box-shadow: 0 4px 8px rgba(156, 39, 176, 0.2);
}

.request-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.request-icon {
  font-size: 24px;
  background: #9c27b0;
  color: white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.request-content {
  flex: 1;
}

.request-text {
  font-weight: 600;
  color: #4a1a4a;
  display: block;
  margin-bottom: 8px;
  font-size: 16px;
}

.request-details {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.dice-expression {
  background: rgba(156, 39, 176, 0.1);
  color: #6a1b9a;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  border: 1px solid rgba(156, 39, 176, 0.3);
}

.critical-indicator {
  background: linear-gradient(135deg, #ff9800, #ff5722);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  box-shadow: 0 2px 4px rgba(255, 152, 0, 0.3);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.request-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.accept-btn, .decline-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.accept-btn {
  background: linear-gradient(135deg, #4caf50, #388e3c);
  color: white;
  box-shadow: 0 2px 4px rgba(76, 175, 80, 0.3);
}

.accept-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #66bb6a, #4caf50);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.4);
}

.accept-btn:disabled {
  background: #bdbdbd;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.decline-btn {
  background: linear-gradient(135deg, #f44336, #d32f2f);
  color: white;
  box-shadow: 0 2px 4px rgba(244, 67, 54, 0.3);
}

.decline-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #ef5350, #f44336);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(244, 67, 54, 0.4);
}

.decline-btn:disabled {
  background: #bdbdbd;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.completion-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
  border-radius: 8px;
  margin-top: 8px;
}

.completed-icon {
  font-size: 20px;
  animation: bounceIn 0.5s ease;
}

.completed-text {
  color: #155724;
  font-weight: 600;
  font-size: 16px;
}

@keyframes bounceIn {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .request-actions {
    flex-direction: column;
  }
  
  .accept-btn, .decline-btn {
    width: 100%;
  }
  
  .request-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>