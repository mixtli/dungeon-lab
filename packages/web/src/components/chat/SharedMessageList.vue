<template>
  <div class="shared-message-list" :class="[`theme-${theme}`, `alignment-${alignment}`]">
    <div v-for="message in messages" :key="message.id" 
         class="message-container" 
         :class="getMessageContainerClasses(message)">
      
      <!-- Approval Card for approval request messages -->
      <ApprovalCard v-if="message.type === 'approval-request' && message.approvalData" 
        :approvalData="message.approvalData" 
        :timestamp="message.timestamp" 
        class="message-card" />
      
      <!-- Roll request card for roll request messages -->
      <RollRequestMessage v-else-if="message.type === 'roll-request' && message.rollRequestData"
        :message="message" 
        class="message-card" />
      
      <!-- Roll result card for roll result messages -->
      <RollResultMessage v-else-if="message.type === 'roll-result' && message.rollResultData"
        v-bind="message.rollResultData" 
        class="message-card" />
      
      <!-- Roll card for roll messages -->
      <RollCard v-else-if="message.type === 'roll' && message.rollData" 
        :rollData="message.rollData" 
        class="message-card" />
      
      <!-- Regular text message -->
      <div v-else :class="getMessageClasses(message)" class="text-message">
        <div v-if="alignment === 'left-right'" class="message-wrapper">
          <div class="message-bubble">
            <span v-if="!message.isSystem" class="message-sender">{{ message.senderName }}</span>
            <div class="message-content" v-html="formatMessageContent(message.content)"></div>
            <span class="message-time">{{ formatTime ? formatTime(message.timestamp) : defaultFormatTime(message.timestamp) }}</span>
          </div>
        </div>
        <div v-else class="message-simple">
          <span v-if="!message.isSystem" class="message-sender">{{ message.senderName }}</span>
          <span class="message-text" v-html="formatMessageContent(message.content)"></span>
          <span class="message-time">{{ formatTime ? formatTime(message.timestamp) : defaultFormatTime(message.timestamp) }}</span>
        </div>
      </div>
    </div>
    
    <!-- No messages state -->
    <div v-if="messages.length === 0" class="no-messages" :class="getMessageClasses({ isSystem: true, senderName: 'System', content: '', senderId: 'system', id: '', timestamp: '' })">
      <span class="message-text">No messages yet. Start the conversation!</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { type ChatMessage } from '../../stores/chat.store.mts';
import ApprovalCard from './ApprovalCard.vue';
import RollRequestMessage from './RollRequestMessage.vue';
import RollResultMessage from './RollResultMessage.vue';
import RollCard from './RollCard.vue';

interface Props {
  messages: ChatMessage[];
  alignment: 'left-right' | 'single-column';
  theme: 'light' | 'dark';
  getMessageClasses: (message: ChatMessage) => string | string[];
  formatTime?: (timestamp: string) => string;
  formatMessageContent?: (content: string) => string;
  currentUserId?: string;
  selectedCharacterId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  alignment: 'single-column',
  theme: 'light'
});

// Get container classes for message alignment
function getMessageContainerClasses(message: ChatMessage): string[] {
  const classes = ['message-item'];
  
  if (props.alignment === 'left-right') {
    // For left-right alignment, determine if message should be on right (own message) or left
    const isOwnMessage = message.senderId === props.currentUserId || message.senderId === props.selectedCharacterId;
    classes.push(isOwnMessage ? 'message-right' : 'message-left');
  }
  
  return classes;
}

// Default time formatting
function defaultFormatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

// Default message content formatting (can be overridden by parent)
function formatMessageContent(content: string): string {
  if (props.formatMessageContent) {
    return props.formatMessageContent(content);
  }
  return content;
}
</script>

<style scoped>
.shared-message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Single column layout (HUD style) */
.alignment-single-column .message-item {
  display: block;
}

/* Left-right layout (main chat style) */
.alignment-left-right {
  gap: 16px;
}

.alignment-left-right .message-item {
  display: flex;
  width: 100%;
}

.alignment-left-right .message-left {
  justify-content: flex-start;
}

.alignment-left-right .message-right {
  justify-content: flex-end;
}

/* Message cards (approval, roll request, etc.) - always full width */
.message-card {
  width: 100%;
  margin: 0;
}

/* Text message styling */
.text-message {
  width: 100%;
}

/* Left-right message wrapper */
.message-wrapper {
  max-width: 70%;
  display: flex;
  flex-direction: column;
}

.message-bubble {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 18px;
  background: var(--message-bg, #f1f5f9);
  border: 1px solid var(--message-border, #e2e8f0);
}

.message-right .message-bubble {
  background: var(--own-message-bg, #3b82f6);
  color: var(--own-message-text, white);
}

/* Simple message styling (HUD style) */
.message-simple {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 8px;
}

/* Common message elements */
.message-sender {
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--sender-text, #64748b);
}

.message-content,
.message-text {
  line-height: 1.4;
  color: var(--message-text, #0f172a);
}

.message-time {
  font-size: 11px;
  color: var(--time-text, #94a3b8);
  align-self: flex-end;
}

.message-simple .message-time {
  align-self: flex-start;
}

/* Theme-specific styling */
.theme-light {
  --message-bg: #f8fafc;
  --message-border: #e2e8f0;
  --message-text: #0f172a;
  --sender-text: #64748b;
  --time-text: #94a3b8;
  --own-message-bg: #3b82f6;
  --own-message-text: white;
}

.theme-dark {
  --message-bg: rgba(255, 255, 255, 0.05);
  --message-border: rgba(255, 255, 255, 0.1);
  --message-text: rgba(255, 255, 255, 0.9);
  --sender-text: rgba(255, 255, 255, 0.7);
  --time-text: rgba(255, 255, 255, 0.5);
  --own-message-bg: rgba(59, 130, 246, 0.6);
  --own-message-text: white;
}

/* No messages state */
.no-messages {
  padding: 20px;
  text-align: center;
  opacity: 0.7;
}
</style>