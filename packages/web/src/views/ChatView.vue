<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useGameSessionStore } from '../stores/game-session.mjs';
import { useSocketStore } from '../stores/socket.mjs';
import { IChatMessage, IRollCommandMessage, IRollResultMessage } from '@dungeon-lab/shared/src/schemas/websocket-messages.schema.mjs';
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/vue';
import api from '../network/axios.mjs';

const route = useRoute();
const gameSessionStore = useGameSessionStore();
const socketStore = useSocketStore();

const messages = ref<IChatMessage[]>([]);
const messageInput = ref('');
const participants = ref<{ id: string; name: string }[]>([]);
const selectedParticipant = ref<{ id: string; name: string } | null>(null);
const isDirectMessage = ref(false);

// When @ is typed, show participant list for autocomplete
const showParticipantList = ref(false);
const participantQuery = ref('');

// Handle incoming messages
function handleMessage(message: IChatMessage) {
  if (message.type === 'chat') {
    messages.value.push(message);
    // If we don't have character info yet, try to load it
    if (!gameSessionStore.currentCharacter) {
      gameSessionStore.getGameSession(route.params.id as string);
    }
    // Scroll to bottom
    nextTick(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    });
  }
}

// Handle roll command
function handleRollCommand(formula: string) {
  const message: IRollCommandMessage = {
    type: 'roll-command',
    formula,
    gameSessionId: route.params.id as string
  };
  socketStore.socket?.emit('message', message);
}

// Handle roll results
function handleRollResult(result: IRollResultMessage) {
  // Create a chat message to display the roll result
  const message: IChatMessage = {
    id: crypto.randomUUID(),
    type: 'chat',
    timestamp: new Date(),
    sender: result.result.userId,
    gameSessionId: result.gameSessionId,
    recipient: 'all',
    data: {
      content: `🎲 Rolled ${result.result.formula}: [${result.result.rolls.map(r => r.result).join(', ')}]${result.result.modifier ? ` + ${result.result.modifier}` : ''} = ${result.result.total}`,
      isEmote: false,
      isWhisper: false,
      displayName: gameSessionStore.isGameMaster 
        ? 'Game Master' 
        : (gameSessionStore.currentCharacter?.name || 'Loading character...'),
    },
  };
  messages.value.push(message);
}

// Send a message
function sendMessage() {
  if (!messageInput.value.trim()) return;

  // Check for roll command
  if (messageInput.value.startsWith('/roll ')) {
    const formula = messageInput.value.slice(6).trim();
    handleRollCommand(formula);
    messageInput.value = '';
    selectedParticipant.value = null;
    isDirectMessage.value = false;
    return;
  }

  // If we don't have character info yet, try to load it
  if (!gameSessionStore.currentCharacter && !gameSessionStore.isGameMaster) {
    console.log('Reloading game session to get character info...');
    gameSessionStore.getGameSession(route.params.id as string);
  }

  const recipient = selectedParticipant.value?.id || 'all';
  const message: IChatMessage = {
    id: crypto.randomUUID(),
    type: 'chat',
    timestamp: new Date(),
    sender: socketStore.userId!,
    gameSessionId: route.params.id as string,
    recipient,
    data: {
      content: messageInput.value,
      isEmote: false,
      isWhisper: isDirectMessage.value,
      displayName: gameSessionStore.isGameMaster 
        ? 'Game Master' 
        : (gameSessionStore.currentCharacter?.name || 'Loading character...'),
    },
  };

  socketStore.socket?.emit('message', message);
  messageInput.value = '';
  selectedParticipant.value = null;
  isDirectMessage.value = false;
}

// Handle input changes for @ mentions
function handleInput(event: Event) {
  const input = (event.target as HTMLInputElement).value;
  if (input.startsWith('@')) {
    isDirectMessage.value = true;
    participantQuery.value = input.slice(1);
    showParticipantList.value = true;
  } else {
    isDirectMessage.value = false;
    showParticipantList.value = false;
  }
}

// Update participants list from game session
async function updateParticipants() {
  if (gameSessionStore.currentSession?.participants && gameSessionStore.currentCampaign) {
    const participantList = await Promise.all(gameSessionStore.currentSession.participants.map(async p => {
      // Make sure we have a string ID by checking the type properly
      let userId: string;
      if (typeof p === 'string') {
        userId = p;
      } else {
        // Use a safer conversion to string
        userId = String(p);
      }
      
      // For game master, use "Game Master" as the name
      const gameMasterId = gameSessionStore.currentSession?.gameMasterId;
      const gameMasterIdStr = gameMasterId ? String(gameMasterId) : '';
      if (userId === gameMasterIdStr) {
        return {
          id: userId,
          name: 'Game Master'
        };
      }

      // Find the member's actor ID in the campaign
      const actorId = gameSessionStore.currentCampaign?.members.find(m => m === userId);
      
      if (actorId) {
        try {
          const response = await api.get(`/api/actors/${actorId}`);
          return {
            id: userId,
            name: response.data.name
          };
        } catch (error) {
          console.error('Error fetching actor:', error);
          return {
            id: userId,
            name: 'Unknown'
          };
        }
      }
      return {
        id: userId,
        name: 'Unknown'
      };
    }));

    participants.value = participantList;
  }
}

onMounted(async () => {
  // Join the game session
  if (route.params.id) {
    socketStore.socket?.emit('join-session', route.params.id);
  }

  // Listen for messages
  socketStore.socket?.on('message', handleMessage);
  
  // Listen for roll results
  socketStore.socket?.on('roll-result', handleRollResult);

  // Get participants
  await gameSessionStore.getGameSession(route.params.id as string);
  updateParticipants();
});

onUnmounted(() => {
  socketStore.socket?.off('message', handleMessage);
  socketStore.socket?.off('roll-result', handleRollResult);
  if (route.params.id) {
    socketStore.socket?.emit('leave-session', route.params.id);
  }
});
</script>

<template>
  <div class="chat-view h-full flex flex-col bg-white">
    <!-- No Active Session State -->
    <div v-if="!gameSessionStore.currentSession" class="flex-1 flex flex-col items-center justify-center p-8">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-400 mb-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
      </svg>
      <h2 class="text-2xl font-semibold text-gray-900 mb-2">No Active Game Session</h2>
      <p class="text-gray-600 mb-6 text-center max-w-md">
        You need to be in an active game session to use the chat. Join a game session or create a new one to start chatting.
      </p>
      <div class="flex gap-4">
        <RouterLink
          to="/game-sessions"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          View Game Sessions
        </RouterLink>
        <RouterLink
          to="/campaigns"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Browse Campaigns
        </RouterLink>
      </div>
    </div>

    <!-- Chat Interface -->
    <template v-else>
      <!-- Chat Header -->
      <div class="p-4 border-b">
        <h1 class="text-xl font-semibold text-gray-900">Game Chat</h1>
        <p class="text-sm text-gray-500">
          Type @ to send a direct message to a participant
        </p>
      </div>

      <!-- Chat Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 chat-messages">
        <template v-if="messages.length">
          <div
            v-for="message in messages"
            :key="message.id"
            :class="[
              'p-2 rounded-lg',
              message.sender === socketStore.userId
                ? 'bg-blue-100 ml-auto'
                : 'bg-gray-100'
            ]"
            class="max-w-[80%]"
          >
            <div class="flex items-start">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900">
                    {{ message.sender === socketStore.userId ? 'You' : (message.data.displayName || message.sender) }}
                  </span>
                  <span class="text-xs text-gray-500">
                    {{ new Date(message.timestamp).toLocaleTimeString() }}
                  </span>
                </div>
                <p class="text-gray-800 mt-1">{{ message.data.content }}</p>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="text-center text-gray-500">
          No messages yet
        </div>
      </div>

      <!-- Message Input -->
      <div class="p-4 border-t">
        <div class="relative">
          <Combobox v-if="showParticipantList" v-model="selectedParticipant">
            <div class="relative mt-1">
              <ComboboxInput
                class="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                :displayValue="(participant: any) => participant?.name"
                @change="(event) => participantQuery = (event.target as HTMLInputElement).value"
              />
              <ComboboxOptions class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                <ComboboxOption
                  v-for="participant in participants"
                  :key="participant.id"
                  :value="participant"
                  v-slot="{ active, selected }"
                >
                  <div
                    :class="[
                      'relative cursor-default select-none py-2 pl-3 pr-9',
                      active ? 'bg-blue-600 text-white' : 'text-gray-900'
                    ]"
                  >
                    <span :class="['block truncate', selected && 'font-semibold']">
                      {{ participant.name }}
                    </span>
                  </div>
                </ComboboxOption>
              </ComboboxOptions>
            </div>
          </Combobox>
          <input
            v-model="messageInput"
            @input="handleInput"
            @keyup.enter="sendMessage"
            type="text"
            placeholder="Type your message..."
            class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            @click="sendMessage"
            class="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Send
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.chat-view {
  height: calc(100vh - 64px); /* Adjust based on your header height */
}

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