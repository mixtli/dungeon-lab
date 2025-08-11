<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameSessionStore } from '../../stores/game-session.store.mjs';
import { useGameStateStore } from '../../stores/game-state.store.mjs';

const gameSessionStore = useGameSessionStore();
const gameStateStore = useGameStateStore();
const isDropdownOpen = ref(false);

// Toggle dropdown visibility
function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
}

// Close dropdown when clicking outside
function closeDropdown() {
  isDropdownOpen.value = false;
}

// Computed property to get all active characters and GM
const activeParticipants = computed(() => {
  const participants: Array<{
    id: string;
    name: string;
    isGameMaster: boolean;
    isCurrentCharacter?: boolean;
  }> = [];
  
  // Add game master
  if (gameSessionStore.currentSession?.gameMasterId) {
    participants.push({
      id: gameSessionStore.currentSession.gameMasterId,
      name: 'Game Master',
      isGameMaster: true
    });
  }
  
  // Add characters
  if (gameSessionStore.currentSession?.characters) {
    gameSessionStore.currentSession.characters.forEach(character => {
      if (character.id) {
        participants.push({
          id: character.id,
          name: character.name,
          isGameMaster: false,
          isCurrentCharacter: character.id === gameSessionStore.currentCharacter?.id
        });
      }
    });
  }
  
  return participants;
});
</script>

<template>
  <div class="relative">
    <!-- Session info trigger button -->
    <button 
      @click="toggleDropdown" 
      class="px-3 py-2 rounded-md text-sm font-medium bg-gray-50 dark:bg-gray-700 flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-600"
    >
      <div class="flex flex-col">
        <span class="text-xs text-gray-500 dark:text-gray-400">
          {{ gameSessionStore.currentSession?.name }}
        </span>
        <div class="flex items-center space-x-1">
          <span class="text-sm text-gray-700 dark:text-gray-200">
            {{ gameStateStore.gameState?.campaign?.name || 'No Campaign' }}
          </span>
          <span
            v-if="!gameSessionStore.isGameMaster && gameSessionStore.currentCharacter"
            class="text-xs text-gray-500 dark:text-gray-400"
          >
            ({{ gameSessionStore.currentCharacter.name }})
          </span>
          <span v-else-if="gameSessionStore.isGameMaster" class="text-xs text-primary-500">
            (GM)
          </span>
        </div>
      </div>
      <!-- Dropdown arrow icon -->
      <svg 
        class="w-4 h-4 ml-1" 
        :class="{ 'transform rotate-180': isDropdownOpen }"
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 20 20" 
        fill="currentColor"
      >
        <path 
          fill-rule="evenodd" 
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
          clip-rule="evenodd" 
        />
      </svg>
    </button>

    <!-- Dropdown content -->
    <div 
      v-if="isDropdownOpen" 
      v-click-outside="closeDropdown"
      class="absolute left-0 mt-2 w-60 py-2 bg-white dark:bg-gray-700 rounded-md shadow-lg"
      style="z-index: 70;"
    >
      <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
        <h3 class="font-medium text-gray-700 dark:text-gray-200">Session Participants</h3>
      </div>
      
      <div class="max-h-60 overflow-y-auto">
        <div 
          v-for="participant in activeParticipants" 
          :key="participant.id"
          class="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center"
        >
          <div 
            class="w-2 h-2 rounded-full mr-2" 
            :class="participant.isGameMaster ? 'bg-purple-500' : 'bg-green-500'"
          ></div>
          
          <div class="flex-1">
            <div class="flex items-center">
              <span class="text-sm text-gray-700 dark:text-gray-200">{{ participant.name }}</span>
              <span 
                v-if="participant.isGameMaster" 
                class="ml-2 text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-100 rounded"
              >
                GM
              </span>
              <span 
                v-else-if="participant.isCurrentCharacter" 
                class="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-100 rounded"
              >
                You
              </span>
            </div>
          </div>
          
          <!-- Always show the character as online if they are in the session participants list -->
          <div 
            class="w-2 h-2 rounded-full bg-green-500"
            title="Online"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.max-h-60 {
  max-height: 15rem;
}
</style> 