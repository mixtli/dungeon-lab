<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useGameSessionStore } from '../../stores/game-session.store.mjs';
import { useSocketStore } from '../../stores/socket.store.mjs';
import { useChatStore } from '../../stores/chat.store.mts';
import { useActorStore } from '../../stores/actor.store.mts';

interface Props {
  showHeader?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  height?: string;
}

withDefaults(defineProps<Props>(), {
  showHeader: true,
  headerTitle: 'Game Chat',
  headerSubtitle: 'Select a conversation from the sidebar',
  height: 'h-full'
});

interface ChatContext {
  id: string;
  name: string;
  type: 'campaign' | 'user' | 'actor';
  participantId?: string;
  unreadCount?: number;
}

const route = useRoute();
const gameSessionStore = useGameSessionStore();
const socketStore = useSocketStore();
const chatStore = useChatStore();
const actorStore = useActorStore();

const messageInput = ref('');
const chatContexts = ref<ChatContext[]>([]);
const activeChatContext = ref<ChatContext | null>(null);

// Track messages from the store
const messages = computed(() => {
  if (!activeChatContext.value) return [];
  
  const allMessages = chatStore.messages;
  const currentUserId = socketStore.userId;
  const currentActorId = actorStore.currentActor?.id;
  
  // Filter messages based on active chat context
  if (activeChatContext.value.type === 'campaign') {
    // Campaign room: show messages with session recipient type or no specific recipient
    return allMessages.filter(message => 
      !message.recipientType || 
      message.recipientType === 'session'
    );
  } else {
    // Direct chat: show messages between current user and the selected participant
    const targetParticipantId = activeChatContext.value.participantId;
    const targetParticipantType = activeChatContext.value.type;
    
    return allMessages.filter(message => {
      // Messages sent by current user to this specific participant
      if (message.senderId === currentUserId && 
          message.recipientId === targetParticipantId && 
          message.recipientType === targetParticipantType) {
        return true;
      }
      
      // Messages sent by current user's actor to this specific participant
      if (currentActorId && 
          message.senderId === currentActorId && 
          message.recipientId === targetParticipantId && 
          message.recipientType === targetParticipantType) {
        return true;
      }
      
      // Messages sent by this participant to current user
      if (message.senderId === targetParticipantId && 
          message.recipientId === currentUserId && 
          message.recipientType === 'user') {
        return true;
      }
      
      // Messages sent by this participant to current user's actor
      if (currentActorId &&
          message.senderId === targetParticipantId && 
          message.recipientId === currentActorId && 
          message.recipientType === 'actor') {
        return true;
      }
      
      return false;
    });
  }
});

// Get display name for current chat
const currentChatName = computed(() => {
  return activeChatContext.value?.name || 'Select a conversation';
});

// Handle roll command
function handleRollCommand(formula: string) {
  if (!socketStore.socket) return;

  socketStore.socket.emit('roll', {
    formula,
    gameSessionId: route.params.id as string
  }, (response: { success: boolean, error?: string }) => {
    if (!response.success) {
      console.error('Error processing roll command:', response.error);
    }
  });
}

// Send a message
function sendMessage() {
  if (!messageInput.value.trim() || !activeChatContext.value) return;
  
  // Check for roll command
  if (messageInput.value.startsWith('/roll ')) {
    const formula = messageInput.value.slice(6).trim();
    handleRollCommand(formula);
    messageInput.value = '';
    return;
  }

  let recipientId: string | undefined;
  
  // Determine recipient based on active chat context
  if (activeChatContext.value.type !== 'campaign') {
    recipientId = `${activeChatContext.value.type}:${activeChatContext.value.participantId}`;
  }

  console.log('ChatComponent sending message:', {
    content: messageInput.value,
    recipientId,
    activeChatContext: activeChatContext.value,
    currentUserId: socketStore.userId,
    currentActorId: actorStore.currentActor?.id
  });

  // Use the chat store to send the message
  chatStore.sendMessage(messageInput.value, recipientId);
  messageInput.value = '';
}

// Switch to a different chat context
function switchChatContext(context: ChatContext) {
  activeChatContext.value = context;
  // Reset unread count for this context
  context.unreadCount = 0;
  
  // Auto-scroll to bottom when switching contexts
  nextTick(() => {
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });
}

// Update chat contexts from game session
async function updateChatContexts() {
  const contexts: ChatContext[] = [];
  
  // Add Campaign Room
  contexts.push({
    id: 'campaign',
    name: 'Campaign Room',
    type: 'campaign'
  });

  if (gameSessionStore.currentSession) {
    // Add Game Master
    contexts.push({
      id: `user:${gameSessionStore.currentSession.gameMasterId}`,
      name: 'Game Master',
      type: 'user',
      participantId: gameSessionStore.currentSession.gameMasterId
    });

    // Add Characters (excluding current user's own character)
    if (gameSessionStore.currentSession.characters) {
      const currentActorId = actorStore.currentActor?.id;
      for (const character of gameSessionStore.currentSession.characters) {
        if (character.id && character.id !== currentActorId) {
          contexts.push({
            id: `actor:${character.id}`,
            name: character.name,
            type: 'actor',
            participantId: character.id
          });
        }
      }
    }
  }

  chatContexts.value = contexts;
  
  // Set default active context to Campaign Room if none selected
  if (!activeChatContext.value && contexts.length > 0) {
    activeChatContext.value = contexts[0];
  }
}

onMounted(async () => {
  // Get chat contexts
  updateChatContexts();

  // Auto-scroll when new messages arrive
  watch(
    () => chatStore.messages.length,
    () => {
      nextTick(() => {
        const chatContainer = document.querySelector('.chat-messages');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      });
    }
  );

  // Watch for game session changes
  watch(
    () => gameSessionStore.currentSession,
    () => {
      updateChatContexts();
    },
    { deep: true }
  );
});

onUnmounted(() => {
  // No need to manually remove socket listeners - the chat store handles this
});
</script>

<template>
  <div :class="['chat-component flex bg-white', height]">
    <!-- Chat Sidebar -->
    <div class="w-64 border-r border-gray-200 flex flex-col">
      <!-- Sidebar Header -->
      <div class="p-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Conversations</h3>
      </div>
      
      <!-- Chat Context List -->
      <div class="flex-1 overflow-y-auto">
        <div class="space-y-1 p-2">
          <button
            v-for="context in chatContexts"
            :key="context.id"
            @click="switchChatContext(context)"
            :class="[
              'w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors',
              activeChatContext?.id === context.id
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-700 hover:bg-gray-100'
            ]"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <!-- Icon based on context type -->
                <div class="mr-2">
                  <svg v-if="context.type === 'campaign'" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else-if="context.type === 'user'" class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <span class="truncate">{{ context.name }}</span>
              </div>
              <!-- Unread count badge -->
              <span v-if="context.unreadCount && context.unreadCount > 0" 
                    class="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] text-center">
                {{ context.unreadCount }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Chat Content -->
    <div class="flex-1 flex flex-col">
      <!-- Chat Header -->
      <div v-if="showHeader" class="p-4 border-b border-gray-200">
        <h1 class="text-xl font-semibold text-gray-900">{{ currentChatName }}</h1>
        <p class="text-sm text-gray-500">
          <span v-if="activeChatContext?.type === 'campaign'">Group conversation with all participants</span>
          <span v-else-if="activeChatContext?.type === 'user'">Private conversation with Game Master</span>
          <span v-else-if="activeChatContext?.type === 'actor'">Private conversation with {{ activeChatContext?.name }}</span>
          <span v-else>Select a conversation from the sidebar</span>
        </p>
      </div>

      <!-- Chat Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 chat-messages">
        <template v-if="messages.length && activeChatContext">
          <div v-for="message in messages" :key="message.id" :class="[
            'flex',
            message.senderId === socketStore.userId || message.senderId === actorStore.currentActor?.id 
              ? 'justify-end' 
              : 'justify-start'
          ]">
            <div :class="[
              'p-3 rounded-lg max-w-[80%] shadow-sm',
              message.senderId === socketStore.userId || message.senderId === actorStore.currentActor?.id
                ? 'bg-green-500 text-white' 
                : 'bg-gray-100 text-gray-800'
            ]">
              <div class="flex items-start">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span :class="[
                      'font-medium text-sm',
                      message.senderId === socketStore.userId || message.senderId === actorStore.currentActor?.id
                        ? 'text-green-100' 
                        : 'text-gray-900'
                    ]">
                      {{ message.senderName }}
                    </span>
                    <span :class="[
                      'text-xs',
                      message.senderId === socketStore.userId || message.senderId === actorStore.currentActor?.id
                        ? 'text-green-200' 
                        : 'text-gray-500'
                    ]">
                      {{ new Date(message.timestamp).toLocaleTimeString() }}
                    </span>
                  </div>
                  <p class="mt-1">{{ message.content }}</p>
                </div>
              </div>
            </div>
          </div>
        </template>
        <div v-else-if="!activeChatContext" class="text-center text-gray-500">
          Select a conversation from the sidebar to start chatting
        </div>
        <div v-else class="text-center text-gray-500">
          No messages yet in this conversation
        </div>
      </div>

      <!-- Message Input -->
      <div v-if="activeChatContext" class="p-4 border-t border-gray-200">
        <div class="relative">
          <input 
            v-model="messageInput" 
            @keyup.enter="sendMessage" 
            type="text"
            :placeholder="`Type your message to ${currentChatName}...`"
            class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
          />
          <button @click="sendMessage"
            class="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Send
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-messages {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}
</style> 