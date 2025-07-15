<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useGameSessionStore } from '../../stores/game-session.store.mjs';
import { useSocketStore } from '../../stores/socket.store.mjs';
import { useChatStore, type ChatMessage } from '../../stores/chat.store.mts';
import { useActorStore } from '../../stores/actor.store.mts';
import { ChatbotsClient } from '@dungeon-lab/client/index.mjs';
import { useMentions } from '../../composables/useMentions.mjs';
import { useNotifications } from '../../composables/useNotifications.mjs';
import MentionInput from './MentionInput.vue';

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
  type: 'campaign' | 'user' | 'actor' | 'bot';
  participantId?: string;
  unreadCount?: number;
}

interface BotTypingState {
  botId: string;
  botName: string;
  isTyping: boolean;
}

interface BotErrorState {
  botId: string;
  botName: string;
  error: string;
  timestamp: Date;
}

const route = useRoute();
const gameSessionStore = useGameSessionStore();
const socketStore = useSocketStore();
const chatStore = useChatStore();
const actorStore = useActorStore();

const chatbotsClient = new ChatbotsClient();
const messageInput = ref('');
const chatContexts = ref<ChatContext[]>([]);
const activeChatContext = ref<ChatContext | null>(null);

// Initialize mention and notification systems
const { highlightMentions } = useMentions(chatContexts);
const {
  setActiveContext,
  getNotificationClasses
} = useNotifications();

// Bot state tracking
const botTypingStates = ref<Map<string, BotTypingState>>(new Map());
const botErrors = ref<Map<string, BotErrorState>>(new Map());

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

// Check if a message is from a bot
function isBotMessage(message: ChatMessage): boolean {
  return message.recipientType === 'bot' || 
         (message.isSystem === false && chatContexts.value.some(ctx => 
           ctx.type === 'bot' && ctx.participantId === message.senderId
         ));
}

// Check if a message is a system message
function isSystemMessage(message: ChatMessage): boolean {
  return message.isSystem === true || message.recipientType === 'system';
}

// Get message styling classes
function getMessageClasses(message: ChatMessage): string[] {
  const isOwnMessage = message.senderId === socketStore.userId || message.senderId === actorStore.currentActor?.id;
  
  if (isBotMessage(message)) {
    return [
      'bg-gradient-to-r from-secondary-600 to-primary-600 text-white',
      'border-l-4 border-secondary-300',
      'shadow-lg'
    ];
  } else if (isSystemMessage(message)) {
    return [
      'bg-accent-50 text-accent-800 border border-accent-200 dark:bg-accent-900 dark:text-accent-100 dark:border-accent-700',
      'italic'
    ];
  } else if (isOwnMessage) {
    return [
      'bg-nature-600 text-white dark:bg-nature-700'
    ];
  } else {
    return [
      'bg-stone-100 text-stone-800 dark:bg-stone-600 dark:text-stone-100'
    ];
  }
}

// Get sender name styling classes
function getSenderNameClasses(message: ChatMessage): string[] {
  const isOwnMessage = message.senderId === socketStore.userId || message.senderId === actorStore.currentActor?.id;
  
  if (isBotMessage(message)) {
    return ['text-secondary-100 font-semibold'];
  } else if (isSystemMessage(message)) {
    return ['text-accent-700 font-medium dark:text-accent-200'];
  } else if (isOwnMessage) {
    return ['text-nature-100'];
  } else {
    return ['text-stone-900 dark:text-stone-100'];
  }
}

// Get timestamp styling classes
function getTimestampClasses(message: ChatMessage): string[] {
  const isOwnMessage = message.senderId === socketStore.userId || message.senderId === actorStore.currentActor?.id;
  
  if (isBotMessage(message)) {
    return ['text-secondary-200'];
  } else if (isSystemMessage(message)) {
    return ['text-accent-600 dark:text-accent-300'];
  } else if (isOwnMessage) {
    return ['text-nature-200'];
  } else {
    return ['text-stone-500 dark:text-stone-300'];
  }
}

// Setup chatbot socket listeners
function setupChatbotListeners() {
  if (!socketStore.socket) return;

  // Listen for bot typing indicators
  socketStore.socket.on('chatbot:typing', (data) => {
    botTypingStates.value.set(data.botId, {
      botId: data.botId,
      botName: data.botName,
      isTyping: true
    });
    
    // Clear any existing errors for this bot
    botErrors.value.delete(data.botId);
  });

  // Listen for bot typing stop
  socketStore.socket.on('chatbot:typing-stop', (data) => {
    botTypingStates.value.delete(data.botId);
  });

  // Listen for bot errors
  socketStore.socket.on('chatbot:error', (data) => {
    botErrors.value.set(data.botId, {
      botId: data.botId,
      botName: data.botName,
      error: data.error,
      timestamp: new Date()
    });
    
    // Clear typing state for this bot
    botTypingStates.value.delete(data.botId);
    
    // Auto-clear error after 10 seconds
    setTimeout(() => {
      botErrors.value.delete(data.botId);
    }, 10000);
  });

  // Listen for bot responses (to clear typing state)
  socketStore.socket.on('chatbot:response', (data) => {
    botTypingStates.value.delete(data.botId);
    botErrors.value.delete(data.botId);
  });
}

// Cleanup chatbot listeners
function cleanupChatbotListeners() {
  if (!socketStore.socket) return;
  
  socketStore.socket.off('chatbot:typing');
  socketStore.socket.off('chatbot:typing-stop');
  socketStore.socket.off('chatbot:error');
  socketStore.socket.off('chatbot:response');
}

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
  chatStore.sendMessage(messageInput.value, recipientId, chatContexts.value);
  messageInput.value = '';
}

// Switch to a different chat context
function switchChatContext(context: ChatContext) {
  activeChatContext.value = context;
  // Reset unread count for this context
  context.unreadCount = 0;
  
  // Update notification system
  setActiveContext(context.id);
  
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

    // Add Chatbots for this campaign
    try {
      const campaignBots = await chatbotsClient.getCampaignBots(gameSessionStore.currentSession.campaignId);
      for (const bot of campaignBots) {
        if (bot.enabled && bot.healthStatus === 'healthy') {
          contexts.push({
            id: `bot:${bot.id}`,
            name: bot.name,
            type: 'bot',
            participantId: bot.id
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load campaign bots:', error);
      // Continue without bots if there's an error
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

  // Setup chatbot listeners
  setupChatbotListeners();

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

  // Watch for socket changes to re-setup listeners
  watch(
    () => socketStore.socket,
    (newSocket, oldSocket) => {
      if (oldSocket) {
        cleanupChatbotListeners();
      }
      if (newSocket) {
        setupChatbotListeners();
      }
    }
  );
});

onUnmounted(() => {
  cleanupChatbotListeners();
});
</script>

<template>
  <div :class="['chat-component flex bg-stone dark:bg-stone-700', height]">
    <!-- Chat Sidebar -->
    <div class="w-64 border-r border-stone-300 dark:border-stone-600 flex flex-col">
      <!-- Sidebar Header -->
      <div class="p-4 border-b border-stone-300 dark:border-stone-600">
        <h3 class="text-lg font-semibold text-onyx dark:text-parchment">Conversations</h3>
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
              ...getNotificationClasses(context.id, activeChatContext?.id === context.id)
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
                  <svg v-else-if="context.type === 'bot'" class="h-4 w-4 text-secondary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                  </svg>
                  <svg v-else class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <span class="truncate">{{ context.name }}</span>
                <!-- Bot typing indicator in sidebar -->
                <div v-if="context.type === 'bot' && botTypingStates.has(context.participantId || '')" 
                     class="ml-2 flex items-center">
                  <div class="flex space-x-1">
                    <div class="w-1 h-1 bg-secondary-500 rounded-full animate-bounce"></div>
                    <div class="w-1 h-1 bg-secondary-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                    <div class="w-1 h-1 bg-secondary-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                  </div>
                </div>
              </div>
              <!-- Unread count badge -->
              <span v-if="context.unreadCount && context.unreadCount > 0" 
                    class="bg-secondary-600 text-white text-xs rounded-full px-2 py-1 min-w-[1.25rem] text-center">
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
      <div v-if="showHeader" class="p-4 border-b border-stone-300 dark:border-stone-600">
        <h1 class="text-xl font-semibold text-onyx dark:text-parchment">{{ currentChatName }}</h1>
        <p class="text-sm text-ash dark:text-stone-300">
          <span v-if="activeChatContext?.type === 'campaign'">Group conversation with all participants</span>
          <span v-else-if="activeChatContext?.type === 'user'">Private conversation with Game Master</span>
          <span v-else-if="activeChatContext?.type === 'actor'">Private conversation with {{ activeChatContext?.name }}</span>
          <span v-else-if="activeChatContext?.type === 'bot'">Chat with AI Assistant: {{ activeChatContext?.name }}</span>
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
              'p-3 rounded-lg max-w-[80%] shadow-sm transition-all duration-200',
              ...getMessageClasses(message)
            ]">
              <div class="flex items-start">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <!-- Bot icon for bot messages -->
                    <div v-if="isBotMessage(message)" class="flex items-center">
                      <svg class="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                      </svg>
                    </div>
                    <!-- System icon for system messages -->
                    <div v-else-if="isSystemMessage(message)" class="flex items-center">
                      <svg class="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <span :class="[
                      'font-medium text-sm',
                      ...getSenderNameClasses(message)
                    ]">
                      {{ message.senderName }}
                    </span>
                    <span :class="[
                      'text-xs',
                      ...getTimestampClasses(message)
                    ]">
                      {{ new Date(message.timestamp).toLocaleTimeString() }}
                    </span>
                  </div>
                  <div class="mt-1 leading-relaxed" v-html="highlightMentions(message.content)"></div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Bot typing indicators -->
        <div v-for="[botId, typingState] in botTypingStates" :key="`typing-${botId}`" 
             class="flex justify-start">
          <div class="bg-gradient-to-r from-secondary-600 to-primary-600 text-white p-3 rounded-lg max-w-[80%] shadow-sm border-l-4 border-secondary-300">
            <div class="flex items-center gap-2">
              <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
              </svg>
              <span class="text-secondary-100 font-semibold text-sm">{{ typingState.botName }}</span>
              <span class="text-secondary-200 text-xs">is thinking...</span>
            </div>
            <div class="mt-2 flex items-center space-x-1">
              <div class="w-2 h-2 bg-secondary-200 rounded-full animate-bounce"></div>
              <div class="w-2 h-2 bg-secondary-200 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
              <div class="w-2 h-2 bg-secondary-200 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
          </div>
        </div>

        <!-- Bot error indicators -->
        <div v-for="[botId, errorState] in botErrors" :key="`error-${botId}`" 
             class="flex justify-start">
          <div class="bg-error-100 border text-error-800 p-3 rounded-lg max-w-[80%] shadow-sm border-l-4 border-error-500 dark:bg-error-900 dark:text-error-100 dark:border-error-700">
            <div class="flex items-center gap-2">
              <svg class="h-4 w-4 text-error-600 dark:text-error-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span class="text-error-700 font-semibold text-sm dark:text-error-200">{{ errorState.botName }}</span>
              <span class="text-error-600 text-xs dark:text-error-300">Error</span>
            </div>
            <p class="mt-1 text-sm">{{ errorState.error }}</p>
          </div>
        </div>

        <div v-if="!messages.length && !activeChatContext" class="text-center text-ash dark:text-stone-300">
          Select a conversation from the sidebar to start chatting
        </div>
        <div v-else-if="!messages.length" class="text-center text-ash dark:text-stone-300">
          No messages yet in this conversation
        </div>
      </div>

      <!-- Message Input -->
      <div v-if="activeChatContext" class="p-4 border-t border-stone-300 dark:border-stone-600">
        <div class="relative">
          <MentionInput
            v-model="messageInput"
            :chat-contexts="chatContexts"
            :placeholder="`Type your message to ${currentChatName}...`"
            @submit="sendMessage"
          />
          <button @click="sendMessage"
            class="absolute right-2 top-1/2 transform -translate-y-1/2 btn btn-secondary">
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

/* Custom animations for bot typing indicators */
@keyframes bounce {
  0%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-0.25rem);
  }
}

.animate-bounce {
  animation: bounce 1s infinite;
}

/* Smooth transitions for message appearance */
.transition-all {
  transition: all 0.2s ease-in-out;
}

/* Bot message gradient animation */
.bg-gradient-to-r.from-secondary-600.to-primary-600 {
  background: linear-gradient(135deg, rgb(var(--color-secondary)) 0%, rgb(var(--color-primary)) 100%);
}

/* Hover effects for interactive elements */
.chat-component button:hover {
  transform: translateY(-1px);
  transition: transform 0.1s ease-in-out;
}

/* Mention highlighting styles */
:deep(.mention) {
  background-color: rgb(var(--color-secondary) / 0.1);
  color: rgb(var(--color-secondary));
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

:deep(.mention-user) {
  background-color: rgb(var(--color-secondary) / 0.1);
  color: rgb(var(--color-secondary));
}

:deep(.mention-actor) {
  background-color: rgb(var(--color-accent) / 0.1);
  color: rgb(var(--color-accent));
}

:deep(.mention-bot) {
  background-color: rgb(var(--color-primary) / 0.1);
  color: rgb(var(--color-primary));
}
</style> 