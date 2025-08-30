<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { DocumentsClient } from '@dungeon-lab/client/index.mjs';
import { useSocketStore } from '@/stores/socket.store.mjs';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import type { ICharacter, IAsset } from '@dungeon-lab/shared/types/index.mjs';

const documentsClient = new DocumentsClient();
const socketStore = useSocketStore();

interface Props {
  campaignId: string;
  existingCharacterIds?: string[];
}

interface Emits {
  (e: 'close'): void;
  (e: 'character-selected', characterId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isLoading = ref(true);
const error = ref<string | null>(null);
const characters = ref<ICharacter[]>([]);
const selectedCharacterId = ref<string | null>(null);

onMounted(async () => {
  await loadCharacters();
});

async function loadCharacters() {
  try {
    isLoading.value = true;
    error.value = null;
    
    // Get all characters owned by the current user
    const allCharacters = await documentsClient.searchDocuments({
      documentType: 'character',
      ownerId: socketStore.userId
    }) as ICharacter[];
    
    // Filter out characters already in the campaign
    const existingIds = new Set(props.existingCharacterIds || []);
    characters.value = allCharacters.filter(char => !existingIds.has(char.id));
    
  } catch (err) {
    console.error('Error loading characters:', err);
    error.value = 'Failed to load characters. Please try again.';
  } finally {
    isLoading.value = false;
  }
}

function selectCharacter(characterId: string) {
  selectedCharacterId.value = characterId;
}

function handleConfirm() {
  if (selectedCharacterId.value) {
    emit('character-selected', selectedCharacterId.value);
  }
}

function handleCancel() {
  emit('close');
}
</script>

<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-parchment dark:bg-obsidian rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
      <!-- Header -->
      <div class="flex justify-between items-center p-6 border-b border-stone-300 dark:border-stone-600">
        <h2 class="text-xl font-bold text-dragon">Select Character</h2>
        <button 
          @click="handleCancel"
          class="p-2 text-ash hover:text-dragon focus:outline-none transition-colors duration-200"
        >
          <XMarkIcon class="h-5 w-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex justify-center items-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-4 border-dragon border-t-transparent"></div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-8">
          <p class="text-error-700 mb-4">{{ error }}</p>
          <button 
            @click="loadCharacters"
            class="px-4 py-2 bg-dragon text-parchment rounded-md hover:bg-dragon-dark transition-colors"
          >
            Try Again
          </button>
        </div>

        <!-- Empty State -->
        <div v-else-if="characters.length === 0" class="text-center py-8">
          <p class="text-ash dark:text-stone-300 mb-4">No available characters found.</p>
          <p class="text-sm text-ash dark:text-stone-400">Create a character first, then add it to your campaign.</p>
        </div>

        <!-- Character List -->
        <div v-else class="space-y-3 max-h-60 overflow-y-auto">
          <div 
            v-for="character in characters" 
            :key="character.id"
            @click="selectCharacter(character.id)"
            class="flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200"
            :class="[
              selectedCharacterId === character.id
                ? 'border-gold bg-gold bg-opacity-10'
                : 'border-stone-300 dark:border-stone-600 hover:border-gold hover:bg-stone-100 dark:hover:bg-stone-700'
            ]"
          >
            <!-- Token Image -->
            <div class="w-12 h-12 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-600 mr-4 border-2 border-gold flex-shrink-0">
              <img
                v-if="character.tokenImageId && typeof character.tokenImage === 'object'"
                :src="(character.tokenImage as unknown as IAsset).url"
                :alt="character.name"
                class="w-full h-full object-cover"
              />
              <img
                v-else-if="character.avatarId && typeof character.avatar === 'object'"
                :src="(character.avatar as unknown as IAsset).url"
                :alt="character.name"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-2xl text-ash">
                👤
              </div>
            </div>

            <!-- Character Name -->
            <div class="flex-1">
              <h3 class="text-onyx dark:text-parchment font-medium">{{ character.name }}</h3>
            </div>

            <!-- Selection Indicator -->
            <div 
              v-if="selectedCharacterId === character.id"
              class="w-5 h-5 bg-gold rounded-full flex items-center justify-center flex-shrink-0"
            >
              <div class="w-2 h-2 bg-parchment rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end space-x-3 p-6 border-t border-stone-300 dark:border-stone-600 bg-stone dark:bg-stone-700">
        <button 
          @click="handleCancel"
          class="px-4 py-2 text-ash hover:text-dragon border border-stone-300 dark:border-stone-600 rounded-md transition-colors"
        >
          Cancel
        </button>
        <button 
          @click="handleConfirm"
          :disabled="!selectedCharacterId"
          class="px-4 py-2 bg-dragon text-parchment rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dragon-dark disabled:hover:bg-dragon"
        >
          Add to Campaign
        </button>
      </div>
    </div>
  </div>
</template>