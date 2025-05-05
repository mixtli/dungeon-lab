import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useSocketStore } from './socket.store.mts';
import { Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';
import { useGameSessionStore } from './game-session.store.mts';

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  isSystem?: boolean;
}

interface ChatStore {
  messages: ChatMessage[];
  sendMessage: (message: string, recipientId?: string) => void;
  clearMessages: () => void;
}

export const useChatStore = defineStore(
  'chat',
  () => {
    const messages = ref<ChatMessage[]>([]);
    const socketStore = useSocketStore();
    const gameSessionStore = useGameSessionStore();
    const currentSessionId = ref<string | null>(null);

    // Watch for socket changes to setup listeners
    watch(
      () => socketStore.socket,
      (socket) => {
        if (socket) {
          setupSocketListeners(socket);
        }
      },
      { immediate: true }
    );

    // Only clear messages when the session ID changes, not on reload
    watch(
      () => gameSessionStore.currentSession?.id,
      (newSessionId, oldSessionId) => {
        console.log('Session ID changed:', oldSessionId, '->', newSessionId);
        
        // Store the current session ID
        currentSessionId.value = newSessionId || null;
        
        // Only clear messages if the session ID actually changed
        // (not on initial load or when it's the same session reloading)
        if (oldSessionId !== undefined && newSessionId !== oldSessionId) {
          console.log('Clearing messages due to session change');
          clearMessages();
        }
      }
    );

    // Setup socket listeners for chat events
    function setupSocketListeners(socket: Socket<ServerToClientEvents, ClientToServerEvents>) {
      // Remove any existing listeners to prevent duplicates
      socket.off('chat');

      // Listen for chat messages
      socket.on('chat', (senderId: string, message: string) => {
        console.log('chat message received', senderId, message);
        try {
          const newMessage: ChatMessage = {
            id: generateId(),
            content: message,
            senderId: senderId,
            senderName: senderId,
            timestamp: new Date(Date.now())
          };

          messages.value.push(newMessage);
        } catch (err) {
          console.error('Error parsing chat message:', err);
          // Fallback for simple string messages
          const newMessage: ChatMessage = {
            id: generateId(),
            content: message,
            senderId: 'system',
            senderName: 'System',
            timestamp: new Date(),
            isSystem: true
          };

          messages.value.push(newMessage);
        }
      });
    }

    // Send a message
    function sendMessage(content: string, recipientId?: string) {
      if (!socketStore.socket) {
        console.error('Socket not connected, cannot send message');
        return;
      }

      if (!content.trim()) {
        return; // Don't send empty messages
      }

      // Determine recipient - if not specified, send to the current game session
      const recipient = recipientId || currentSessionId.value || gameSessionStore.currentSession?.id || 'broadcast';

      // Send the message
      socketStore.socket.emit('chat', recipient, content);

      // Also add the sent message to our local state
      // The server should echo back the message, but we add it locally for instant feedback
      const newMessage: ChatMessage = {
        id: generateId(),
        content,
        senderId: socketStore.userId || 'unknown',
        senderName: 'You', // Could be improved by getting name from auth store
        timestamp: new Date(),
        isSystem: false
      };

      messages.value.push(newMessage);
    }

    // Clear all messages
    function clearMessages() {
      messages.value = [];
    }

    // Generate a unique ID for messages
    function generateId(): string {
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    return {
      messages,
      sendMessage,
      clearMessages
    };
  },
  { 
    persist: { 
      storage: sessionStorage,
      serializer: {
        serialize: (state) => {
          // Custom serializer that properly handles Date objects
          return JSON.stringify(state, (_, value) => {
            // Convert Date objects to a special format with a type marker
            if (value instanceof Date) {
              return { __type: 'Date', value: value.toISOString() };
            }
            return value;
          });
        },
        deserialize: (state) => {
          // Custom deserializer that properly restores Date objects
          return JSON.parse(state, (_, value) => {
            // Check for our special Date object marker
            if (value && typeof value === 'object' && value.__type === 'Date') {
              return new Date(value.value);
            }
            return value;
          });
        }
      }
    } 
  }
) as () => ChatStore;
