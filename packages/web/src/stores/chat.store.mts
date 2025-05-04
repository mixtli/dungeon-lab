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

    // Clear messages when session changes
    watch(
      () => gameSessionStore.currentSession,
      () => {
        clearMessages();
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
      const recipient = recipientId || gameSessionStore.currentSession?.id || 'broadcast';

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
  { persist: { storage: sessionStorage } }
) as () => ChatStore;
