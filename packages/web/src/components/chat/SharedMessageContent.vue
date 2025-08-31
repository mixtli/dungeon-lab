<template>
  <!-- Roll card for roll messages -->
  <RollCard v-if="message.type === 'roll' && message.rollData" :rollData="message.rollData" />
  <!-- Approval card for approval request messages -->
  <ApprovalCard v-else-if="message.type === 'approval-request' && message.approvalData" 
    :approvalData="message.approvalData" 
    :timestamp="message.timestamp"
    :messageId="message.id"
    :class="cardClass" />
  <!-- Roll request card for roll request messages -->
  <RollRequestMessage v-else-if="message.type === 'roll-request' && message.rollRequestData"
    :message="message" />
  <!-- Roll result card for roll result messages -->
  <RollResultMessage v-else-if="message.type === 'roll-result' && message.rollResultData"
    v-bind="message.rollResultData"
    :rollData="message.rollData" />
  <!-- Regular text content for text messages -->
  <slot v-else name="text-message" :message="message" :formatContent="formatMessageContent">
    <div :class="textContentClass" v-html="formatMessageContent(message.content)"></div>
  </slot>
</template>

<script setup lang="ts">
import { type ChatMessage } from '../../stores/chat.store.mts';
import RollCard from './RollCard.vue';
import ApprovalCard from './ApprovalCard.vue';
import RollRequestMessage from './RollRequestMessage.vue';
import RollResultMessage from './RollResultMessage.vue';

interface Props {
  message: ChatMessage;
  formatContent?: (content: string) => string;
  textContentClass?: string;
  cardClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  textContentClass: '',
  cardClass: ''
});

// Default content formatting (can be overridden by parent)
function formatMessageContent(content: string): string {
  if (props.formatContent) {
    return props.formatContent(content);
  }
  return content;
}
</script>

<style scoped>
/* No styles needed - all styling handled by parent components */
</style>