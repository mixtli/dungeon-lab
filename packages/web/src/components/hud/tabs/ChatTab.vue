<template>
  <div class="chat-tab">
    <div class="chat-header">
      <h4>Chat</h4>
      <div class="chat-controls">
        <button class="control-button" title="Chat Settings">
          <i class="mdi mdi-cog"></i>
        </button>
      </div>
    </div>

    <div class="chat-messages">
      <div class="message-list" ref="messageList">
        <!-- Real chat messages -->
        <div v-for="message in filteredMessages" :key="message.id" :class="getMessageClass(message)">
          <span v-if="!message.isSystem" class="message-sender">{{ message.senderName }}</span>
          <span class="message-text">{{ message.content }}</span>
          <span class="message-time">{{ formatTime(message.timestamp) }}</span>
        </div>
        
        <!-- No messages state -->
        <div v-if="filteredMessages.length === 0" class="message message-system">
          <span class="message-text">No messages yet. Start the conversation!</span>
        </div>
      </div>
    </div>

    <div class="chat-input">
      <div class="input-group">
        <input
          v-model="currentMessage"
          type="text"
          placeholder="Type your message..."
          class="message-input"
          @keypress.enter="sendMessage"
        />
        <button class="send-button" @click="sendMessage" :disabled="!currentMessage.trim()">
          <i class="mdi mdi-send"></i>
        </button>
      </div>
      
      <div class="chat-options">
        <button class="option-button" title="Roll Dice">
          <i class="mdi mdi-dice-multiple"></i>
        </button>
        <button class="option-button" title="Whisper">
          <i class="mdi mdi-account-voice"></i>
        </button>
        <button class="option-button" title="Out of Character">
          <i class="mdi mdi-comment-text"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useChatStore, type ChatMessage } from '../../../stores/chat.store.mts';
import { useSocketStore } from '../../../stores/socket.store.mts';
import { useGameStateStore } from '../../../stores/game-state.store.mjs';
import { useGameSessionStore } from '../../../stores/game-session.store.mts';

const chatStore = useChatStore();
const socketStore = useSocketStore();
const gameStateStore = useGameStateStore();
const gameSessionStore = useGameSessionStore();

const currentMessage = ref('');
const messageList = ref<HTMLElement>();

// Filter messages to show only session-wide messages (no private messages)
const filteredMessages = computed(() => {
  return chatStore.messages.filter(message => 
    !message.recipientType || 
    message.recipientType === 'session'
  );
});

// Determine message class based on sender type
function getMessageClass(message: ChatMessage): string {
  if (message.isSystem) {
    return 'message message-system';
  }
  
  // Check if message is from current user
  const isOwnMessage = message.senderId === socketStore.userId || 
                      message.senderId === gameStateStore.selectedCharacter?.id;
  
  if (isOwnMessage) {
    return 'message message-player-own';
  }
  
  // Check if message is from GM
  if (gameSessionStore.currentSession?.gameMasterId === message.senderId) {
    return 'message message-gm';
  }
  
  // Default to player message
  return 'message message-player';
}

// Format timestamp
function formatTime(timestamp: Date): string {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

// Send message using chat store
function sendMessage(): void {
  if (!currentMessage.value.trim()) return;
  
  // Send to session (all players)
  chatStore.sendMessage(currentMessage.value);
  currentMessage.value = '';
}

// Auto-scroll to bottom when new messages arrive
function scrollToBottom() {
  nextTick(() => {
    if (messageList.value) {
      messageList.value.scrollTop = messageList.value.scrollHeight;
    }
  });
}

// Watch for new messages and auto-scroll
watch(
  () => filteredMessages.value.length,
  () => {
    scrollToBottom();
  }
);
</script>

<style scoped>
.chat-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-header h4 {
  color: white;
  margin: 0;
  font-weight: 600;
}

.chat-controls {
  display: flex;
  gap: 8px;
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

.chat-messages {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid transparent;
}

.message-system {
  border-left-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
}

.message-gm {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.message-player {
  border-left-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.message-player-own {
  border-left-color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.message-sender {
  font-weight: 600;
  color: white;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.message-text {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
}

.message-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  align-self: flex-end;
}

.chat-input {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
}

.input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.message-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px 12px;
  color: white;
  font-size: 14px;
  transition: all 0.2s ease;
}

.message-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(255, 255, 255, 0.15);
}

.message-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.send-button {
  width: 36px;
  height: 36px;
  background: rgba(59, 130, 246, 0.6);
  border: 1px solid rgba(59, 130, 246, 0.8);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-button:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.8);
  transform: translateY(-1px);
}

.send-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.chat-options {
  display: flex;
  gap: 4px;
}

.option-button {
  width: 32px;
  height: 32px;
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

.option-button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

/* Scrollbar styling */
.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>