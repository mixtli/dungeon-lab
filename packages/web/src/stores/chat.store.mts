import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useSocketStore } from './socket.store.mts';
import { Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';
import { useGameSessionStore } from './game-session.store.mts';
import { useActorStore } from './actor.store.mts';

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
    const actorStore = useActorStore();
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
      socket.on('chat', (metadata, message) => {
        console.log('chat message received', metadata, message);
        try {
          const senderName = getSenderName(metadata.sender.id, metadata.sender.type);
          
          const newMessage: ChatMessage = {
            id: generateId(),
            content: message,
            senderId: metadata.sender.id || 'system',
            senderName: senderName,
            timestamp: metadata.timestamp || new Date(),
            isSystem: metadata.sender.type === 'system'
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

    // Get the name of a sender based on their ID and type
    function getSenderName(senderId?: string, senderType?: string): string {
      if (senderType === 'system') return 'System';
      if (!senderId) return 'Unknown';
      
      // If sender is the current user
      if (senderId === socketStore.userId && senderType === 'user') {
        // If current user is game master, label messages as "You" to self
        if (gameSessionStore.isGameMaster) {
          return 'You';
        }
        return 'You';
      }
      
      // If sender is the current actor for the current user
      if (actorStore.currentActor?.id === senderId && senderType === 'actor') return 'You';
      
      // If sender is the game master for this session, show as "Game Master"
      if (gameSessionStore.currentSession?.gameMasterId === senderId && senderType === 'user') {
        return 'Game Master';
      }
      
      // If sender is an actor in the current session
      if (senderType === 'actor') {
        // Check game session characters
        const character = gameSessionStore.currentSession?.characters?.find(c => c.id === senderId);
        if (character) {
          return character.name;
        }
      }
      
      return 'Unknown User';
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

      // Check if current user is the game master
      const isGameMaster = gameSessionStore.isGameMaster;
      
      // Use the current actor if set in actor store (unless user is game master)
      const currentActor = !isGameMaster ? (actorStore.currentActor || gameSessionStore.currentCharacter) : null;
      
      // Create the metadata object
      const metadata = {
        sender: {
          // If user is game master, always send as user type
          type: isGameMaster ? 'user' as 'user' | 'system' | 'actor' | 'session' : 
                currentActor ? 'actor' as 'user' | 'system' | 'actor' | 'session' : 
                'user' as 'user' | 'system' | 'actor' | 'session',
          id: isGameMaster ? (socketStore.userId || undefined) : 
              (currentActor?.id || socketStore.userId || undefined)
        },
        recipient: {
          type: 'session' as 'user' | 'system' | 'actor' | 'session',
          id: currentSessionId.value || gameSessionStore.currentSession?.id || undefined
        },
        timestamp: new Date()
      };

      // If recipientId is provided, parse it to determine type
      if (recipientId) {
        const parts = recipientId.split(':');
        if (parts.length === 2) {
          const recipientType = parts[0];
          if (recipientType === 'user' || recipientType === 'actor' || recipientType === 'session' || recipientType === 'system') {
            metadata.recipient.type = recipientType;
            metadata.recipient.id = parts[1];
          }
        } else {
          // Default to session type
          metadata.recipient.type = 'session';
          metadata.recipient.id = recipientId;
        }
      }

      // Send the message
      socketStore.socket.emit('chat', metadata, content);

      // Also add the sent message to our local state
      // The server should echo back the message, but we add it locally for instant feedback
      const newMessage: ChatMessage = {
        id: generateId(),
        content,
        senderId: metadata.sender.id || 'unknown',
        senderName: 'You', // Always show "You" for messages sent by the current user/actor
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
