<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useGameSessionStore } from '../../stores/game-session.store.mjs';
import { useSocketStore } from '../../stores/socket.store.mjs';
import { useChatStore } from '../../stores/chat.store.mts';
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/vue';
import { IActor } from '@dungeon-lab/shared/types/index.mjs';

interface Props {
  showHeader?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  height?: string;
}

withDefaults(defineProps<Props>(), {
  showHeader: true,
  headerTitle: 'Game Chat',
  headerSubtitle: 'Type @ to send a direct message to a participant',
  height: 'h-full'
});

const route = useRoute();
const gameSessionStore = useGameSessionStore();
const socketStore = useSocketStore();
const chatStore = useChatStore();

const messageInput = ref('');
const participants = ref<{ id: string; name: string; type: string }[]>([]);
const selectedParticipant = ref<{ id: string; name: string; type: string } | null>(null);
const isDirectMessage = ref(false);

// When @ is typed, show participant list for autocomplete
const showParticipantList = ref(false);
const participantQuery = ref('');

// Track messages from the store
const messages = computed(() => chatStore.messages);

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
  if (!messageInput.value.trim()) return;
  let recipientId: string | undefined;

  // Check for roll command
  if (messageInput.value.startsWith('/roll ')) {
    const formula = messageInput.value.slice(6).trim();
    handleRollCommand(formula);
    messageInput.value = '';
    selectedParticipant.value = null;
    isDirectMessage.value = false;
    return;
  }

  // Determine recipient if direct message
  if (selectedParticipant.value) {
    recipientId = `${selectedParticipant.value.type}:${selectedParticipant.value.id}`;
  }

  // Use the chat store to send the message
  chatStore.sendMessage(messageInput.value, recipientId);

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
  if (gameSessionStore.currentSession?.characters) {
    const participantList = await Promise.all(
      gameSessionStore.currentSession.characters.map(async (character: IActor) => {
        // Find the member's actor ID in the campaign
        if (character.id) {
          try {
            return {
              id: character.id,
              name: character.name,
              type: 'actor'
            };
          } catch (error) {
            console.error('Error fetching actor:', error);
            return {
              id: character.id,
              name: 'Unknown',
              type: 'actor'
            };
          }
        }
      })
    );

    // For game master, use "Game Master" as the name
    participantList.push({
      id: gameSessionStore.currentSession?.gameMasterId,
      name: 'Game Master',
      type: 'user'
    });
    participants.value = participantList.filter((participant): participant is { id: string; name: string; type: string } =>
      participant !== undefined
    );
  }
}

onMounted(async () => {
  // Get participants
  updateParticipants();

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
});

onUnmounted(() => {
  // No need to manually remove socket listeners - the chat store handles this
});
</script>

<template>
  <div :class="['chat-component flex flex-col bg-white', height]">
    <!-- Chat Header -->
    <div v-if="showHeader" class="p-4 border-b">
      <h1 class="text-xl font-semibold text-gray-900">{{ headerTitle }}</h1>
      <p class="text-sm text-gray-500">{{ headerSubtitle }}</p>
    </div>

    <!-- Chat Messages -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 chat-messages">
      <template v-if="messages.length">
        <div v-for="message in messages" :key="message.id" :class="[
          'p-2 rounded-lg',
          message.senderId === socketStore.userId ? 'bg-blue-100 ml-auto' : 'bg-gray-100',
        ]" class="max-w-[80%]">
          <div class="flex items-start">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900">
                  {{ message.senderName }}
                </span>
                <span class="text-xs text-gray-500">
                  {{ new Date(message.timestamp).toLocaleTimeString() }}
                </span>
              </div>
              <p class="text-gray-800 mt-1">{{ message.content }}</p>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="text-center text-gray-500">No messages yet</div>
    </div>

    <!-- Message Input -->
    <div class="p-4 border-t">
      <div class="relative">
        <Combobox v-if="showParticipantList" v-model="selectedParticipant">
          <div class="relative mt-1">
            <ComboboxInput
              class="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              :displayValue="(participant: any) => participant?.name"
              @change="event => (participantQuery = (event.target as HTMLInputElement).value)" />
            <ComboboxOptions
              class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              <ComboboxOption v-for="participant in participants" :key="participant.id" :value="participant"
                v-slot="{ active, selected }">
                <div :class="[
                  'relative cursor-default select-none py-2 pl-3 pr-9',
                  active ? 'bg-blue-600 text-white' : 'text-gray-900',
                ]">
                  <span :class="['block truncate', selected && 'font-semibold']">
                    {{ participant.name }}
                  </span>
                </div>
              </ComboboxOption>
            </ComboboxOptions>
          </div>
        </Combobox>
        <input v-model="messageInput" @input="handleInput" @keyup.enter="sendMessage" type="text"
          placeholder="Type your message..."
          class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        <button @click="sendMessage"
          class="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          Send
        </button>
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