import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useSocketStore } from './socket.store.mts';
import { Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';
import { useGameSessionStore } from './game-session.store.mts';
import { useGameStateStore } from './game-state.store.mjs';
import { useAuthStore } from './auth.store.mts';
import type { ParsedMessage, Mention } from '@dungeon-lab/shared/types/chat.mjs';
import type { RollServerResult, RollRequest } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import type { GameActionRequest } from '@dungeon-lab/shared/types/game-actions.mjs';
import type { RollResultData } from '@dungeon-lab/shared-ui/types/action-context.mjs';

export interface ChatContext {
  id: string;
  name: string;
  type: 'campaign' | 'user' | 'actor' | 'bot';
  participantId?: string;
}

export interface ApprovalData {
  requestId: string;
  actionType: string;
  playerName: string;
  description: string;
  request: GameActionRequest;
  approvalStatus?: 'approved' | 'denied';
  processedAt?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  isSystem?: boolean;
  recipientId?: string;
  recipientType?: 'user' | 'actor' | 'session' | 'system' | 'bot';
  mentions?: ParsedMessage['mentions'];
  hasMentions?: boolean;
  type?: 'text' | 'roll' | 'approval-request' | 'roll-request' | 'roll-result';
  rollData?: RollServerResult;
  approvalData?: ApprovalData;
  rollRequestData?: RollRequest;
  rollResultData?: RollResultData;
}

interface ChatStore {
  messages: ChatMessage[];
  sendMessage: (message: string, recipientId?: string, chatContexts?: ChatContext[]) => void;
  sendApprovalRequest: (approvalData: ApprovalData) => void;
  updateApprovalMessage: (requestId: string, status: 'approved' | 'denied') => void;
  addRollRequest: (rollRequest: RollRequest) => void;
  addRollResult: (rollResultData: RollResultData) => void;
  removeMessage: (messageId: string) => void;
  clearMessages: () => void;
}

export const useChatStore = defineStore(
  'chat',
  () => {
    const messages = ref<ChatMessage[]>([]);
    const socketStore = useSocketStore();
    const gameSessionStore = useGameSessionStore();
    const gameStateStore = useGameStateStore();
    const authStore = useAuthStore();
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
          const senderName = getSenderName(metadata.sender.id, metadata.sender.type, metadata.sender.name);
          
          const newMessage: ChatMessage = {
            id: generateId(),
            content: message,
            senderId: metadata.sender.id || 'system',
            senderName: senderName,
            timestamp: metadata.timestamp || new Date().toISOString(),
            isSystem: metadata.sender.type === 'system',
            recipientId: metadata.recipient?.id,
            recipientType: metadata.recipient?.type,
            type: metadata.type || 'text',
            rollData: metadata.rollData,
            rollResultData: metadata.rollResultData
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
            timestamp: new Date().toISOString(),
            isSystem: true
          };

          messages.value.push(newMessage);
        }
      });
    }

    // Get the name of a sender based on their ID, type, and provided name
    function getSenderName(senderId?: string, senderType?: string, providedName?: string): string {
      if (senderType === 'system') return 'System';
      if (senderType === 'bot') return senderId || 'Bot'; // For bots, use the bot ID as name for now
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
      if (gameStateStore.selectedCharacter?.id === senderId && senderType === 'actor') return 'You';
      
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
      
      // Use provided name from metadata for other users
      if (providedName) {
        return providedName;
      }
      
      return 'Unknown User';
    }

    // Extract mentions from message content
    function extractMentions(content: string, chatContexts: ChatContext[]): Mention[] {
      const mentions: Mention[] = [];
      const mentionRegex = /@"([^"]+)"|@(\S+)/g;
      let match;

      while ((match = mentionRegex.exec(content)) !== null) {
        const mentionText = match[1] || match[2]; // Quoted or unquoted mention
        const startIndex = match.index;
        const endIndex = match.index + match[0].length;

        // Find matching participant
        const participant = chatContexts.find((ctx: ChatContext) => 
          ctx.name.toLowerCase() === mentionText.toLowerCase()
        );

        if (participant) {
          mentions.push({
            id: participant.id,
            name: participant.name,
            type: participant.type as 'user' | 'actor' | 'bot',
            participantId: participant.participantId || participant.id,
            startIndex,
            endIndex
          });
        }
      }

      return mentions;
    }

    // Send a message
    function sendMessage(content: string, recipientId?: string, chatContexts: ChatContext[] = []) {
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
      const currentActor = !isGameMaster ? (gameStateStore.selectedCharacter || gameSessionStore.currentCharacter) : null;
      
      // Extract mentions from the message content
      const mentions = extractMentions(content, chatContexts);

      // Determine sender name based on sender type
      let senderName: string | undefined;
      if (isGameMaster || (!currentActor && authStore.user)) {
        // User is sending as themselves (GM or regular user)
        senderName = authStore.user?.displayName || authStore.user?.username;
      } else if (currentActor) {
        // User is sending as their character/actor
        senderName = currentActor.name;
      }

      // Create the metadata object
      const metadata = {
        sender: {
          // If user is game master, always send as user type
          type: isGameMaster ? 'user' as 'user' | 'system' | 'actor' | 'session' | 'bot' : 
                currentActor ? 'actor' as 'user' | 'system' | 'actor' | 'session' | 'bot' : 
                'user' as 'user' | 'system' | 'actor' | 'session' | 'bot',
          id: isGameMaster ? (socketStore.userId || undefined) : 
              (currentActor?.id || socketStore.userId || undefined),
          name: senderName
        },
        recipient: {
          type: 'session' as 'user' | 'system' | 'actor' | 'session' | 'bot',
          id: currentSessionId.value || gameSessionStore.currentSession?.id || undefined
        },
        timestamp: new Date().toISOString(),
        mentions: mentions.length > 0 ? mentions : undefined
      };

      // If recipientId is provided, parse it to determine type
      if (recipientId) {
        const parts = recipientId.split(':');
        if (parts.length === 2) {
          const recipientType = parts[0];
          if (recipientType === 'user' || recipientType === 'actor' || recipientType === 'session' || recipientType === 'system' || recipientType === 'bot') {
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

      // Server will echo back the message, so we don't add it locally
      // This ensures single source of truth and prevents duplicate messages
    }

    // Send an approval request message
    function sendApprovalRequest(approvalData: ApprovalData) {
      if (!socketStore.socket) {
        console.error('Socket not connected, cannot send approval request');
        return;
      }

      // Create approval request message directly in store
      const approvalMessage: ChatMessage = {
        id: generateId(),
        content: `**Action Approval Required**\n${approvalData.description}`,
        senderId: 'system',
        senderName: 'System',
        timestamp: new Date().toISOString(),
        isSystem: true,
        recipientType: 'session',
        type: 'approval-request',
        approvalData: approvalData
      };

      // Add message to local store immediately (no server echo needed for system messages)
      messages.value.push(approvalMessage);

      console.log('[ChatStore] Approval request added to chat:', {
        requestId: approvalData.requestId,
        actionType: approvalData.actionType,
        playerName: approvalData.playerName
      });
    }

    // Clear all messages
    function clearMessages() {
      messages.value = [];
    }

    // Generate a unique ID for messages
    function generateId(): string {
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    function updateApprovalMessage(requestId: string, status: 'approved' | 'denied') {
      const messageIndex = messages.value.findIndex(
        message => message.type === 'approval-request' && 
                  message.approvalData?.requestId === requestId
      );
      
      if (messageIndex !== -1) {
        const message = messages.value[messageIndex];
        if (message.approvalData) {
          // Update the approval data with the new status
          message.approvalData.approvalStatus = status;
          message.approvalData.processedAt = new Date().toISOString();
          
          console.log(`[ChatStore] Updated approval message ${requestId} with status: ${status}`);
        }
      } else {
        console.warn(`[ChatStore] Could not find approval message with requestId: ${requestId}`);
      }
    }

    // Add a roll request to chat
    function addRollRequest(rollRequest: RollRequest) {
      const rollRequestMessage: ChatMessage = {
        id: generateId(),
        content: `**Roll Request**: ${rollRequest.message}`,
        senderId: 'system',
        senderName: 'System',
        timestamp: new Date().toISOString(),
        isSystem: true,
        type: 'roll-request',
        rollRequestData: rollRequest,
        recipientType: 'session'
      };

      messages.value.push(rollRequestMessage);
      console.log('[ChatStore] Added roll request to chat:', rollRequest.rollId);
    }

    // Add a roll result to chat
    function addRollResult(rollResultData: RollResultData) {
      const rollResultMessage: ChatMessage = {
        id: generateId(),
        content: rollResultData.message, // Simple message - component handles formatting
        senderId: 'system',
        senderName: 'System',
        timestamp: new Date().toISOString(),
        isSystem: true,
        type: 'roll-result',
        rollResultData: rollResultData,
        recipientType: 'session'
      };

      messages.value.push(rollResultMessage);
      console.log('[ChatStore] Added roll result to chat:', rollResultData.rollType);
    }

    // Remove a message by ID (for cleanup)
    function removeMessage(messageId: string) {
      const index = messages.value.findIndex(msg => msg.id === messageId);
      if (index !== -1) {
        messages.value.splice(index, 1);
        console.log('[ChatStore] Removed message:', messageId);
      } else {
        console.warn('[ChatStore] Could not find message to remove:', messageId);
      }
    }

    return {
      messages,
      sendMessage,
      sendApprovalRequest,
      updateApprovalMessage,
      addRollRequest,
      addRollResult,
      removeMessage,
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
