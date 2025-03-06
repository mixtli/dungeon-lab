<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

// Define interface for game data
interface Player {
  id: string;
  username: string;
  displayName: string;
}

interface GameData {
  id: string;
  name: string;
  system: string;
  description: string;
  dm: Player;
  players: Player[];
}

const route = useRoute();
const gameId = route.params.id as string;
const isLoading = ref(true);
const gameData = ref<GameData | null>(null);
const customRoll = ref('');
const chatMessage = ref('');

// Placeholder for game data loading
onMounted(async () => {
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock data
    gameData.value = {
      id: gameId,
      name: 'The Lost Mines of Phandelver',
      system: 'dnd5e',
      description: 'A D&D 5e adventure for levels 1-5',
      dm: {
        id: '1',
        username: 'DungeonMaster',
        displayName: 'The DM',
      },
      players: [
        { id: '2', username: 'player1', displayName: 'Aragorn' },
        { id: '3', username: 'player2', displayName: 'Legolas' },
        { id: '4', username: 'player3', displayName: 'Gimli' },
      ],
    };
  } catch (error) {
    console.error('Error loading game data:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="p-4">
    <div class="flex gap-6">
      <!-- Game Info Sidebar -->
      <div class="w-1/4 h-[calc(100vh-150px)] overflow-y-auto">
        <!-- Loading State -->
        <div v-if="isLoading" class="bg-white rounded-lg shadow p-6">
          <div class="animate-pulse space-y-4">
            <div class="h-6 bg-gray-200 rounded w-3/4"></div>
            <div class="h-4 bg-gray-200 rounded"></div>
            <div class="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
        
        <!-- Game Info Card -->
        <div v-else class="bg-white rounded-lg shadow">
          <div class="p-4 border-b border-gray-200">
            <div class="flex justify-between items-center">
              <h2 class="text-xl font-bold text-gray-900">{{ gameData?.name }}</h2>
              <span class="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md">
                {{ gameData?.system }}
              </span>
            </div>
          </div>
          
          <div class="p-4">
            <p class="mb-4 text-gray-600">{{ gameData?.description }}</p>
            
            <div class="mb-4">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Game Master</h3>
              <div class="flex items-center">
                <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium mr-2">
                  DM
                </div>
                <span class="text-gray-900">{{ gameData?.dm.displayName }}</span>
              </div>
            </div>
            
            <div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Players</h3>
              <ul class="space-y-3">
                <li v-for="player in gameData?.players" :key="player.id" class="flex items-center">
                  <div class="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center text-sm font-medium mr-2">
                    {{ player.displayName.charAt(0) }}
                  </div>
                  <span class="text-gray-900">{{ player.displayName }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Game Table Main Area -->
      <div class="flex-1">
        <div class="bg-white rounded-lg shadow h-[calc(100vh-150px)] flex flex-col">
          <div class="p-4 border-b border-gray-200">
            <div class="flex justify-between items-center">
              <h2 class="text-xl font-bold text-gray-900">Game Table</h2>
              <div class="flex gap-2">
                <button class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Token
                </button>
                <button class="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Session
                </button>
              </div>
            </div>
          </div>
          
          <!-- Loading State -->
          <div v-if="isLoading" class="flex-1 flex items-center justify-center">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          </div>
          
          <!-- Game Content -->
          <div v-else class="flex-1 flex flex-col p-4">
            <div class="flex-1 bg-gray-50 rounded-lg flex items-center justify-center">
              <p class="text-center text-gray-500">
                Game map will be displayed here.
                <br>
                This is a placeholder for the interactive game table.
              </p>
            </div>
            
            <div class="mt-4 grid grid-cols-3 gap-4">
              <!-- Dice Roller -->
              <div class="bg-white rounded-lg shadow p-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Dice Roller</h3>
                <div class="flex flex-wrap gap-2 mb-2">
                  <button class="px-3 py-1.5 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">D4</button>
                  <button class="px-3 py-1.5 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">D6</button>
                  <button class="px-3 py-1.5 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">D8</button>
                  <button class="px-3 py-1.5 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">D10</button>
                  <button class="px-3 py-1.5 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">D12</button>
                  <button class="px-3 py-1.5 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">D20</button>
                </div>
                <input
                  v-model="customRoll"
                  type="text"
                  placeholder="Custom roll (e.g. 2d6+3)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <!-- Initiative Tracker -->
              <div class="bg-white rounded-lg shadow p-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Initiative Tracker</h3>
                <p class="text-gray-500 mb-2">No combat in progress</p>
                <button class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  Start Combat
                </button>
              </div>
              
              <!-- Chat -->
              <div class="bg-white rounded-lg shadow p-4">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Chat</h3>
                <div class="h-20 border border-gray-200 rounded-md p-2 mb-2 overflow-y-auto">
                  <p class="text-gray-500">No messages yet</p>
                </div>
                <input
                  v-model="chatMessage"
                  type="text"
                  placeholder="Type a message..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-table-view {
  padding: 1rem;
}

.sidebar {
  height: calc(100vh - 150px);
  overflow-y: auto;
}

.game-table-card {
  height: calc(100vh - 150px);
  display: flex;
  flex-direction: column;
}

.game-table-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.game-map {
  flex: 1;
  background-color: rgb(243 244 246); /* bg-gray-100 */
  border-radius: 0.5rem;
  min-height: 400px;
}

.game-controls {
  height: 200px;
}

.control-card {
  height: 100%;
}

.chat-messages {
  height: 80px;
  overflow-y: auto;
  border: 1px solid rgb(229 231 235); /* border-gray-200 */
  border-radius: 0.25rem;
  padding: 0.5rem;
}

.skeleton-loader {
  padding: 1rem;
}

.skeleton-title {
  height: 24px;
  background-color: rgb(243 244 246); /* bg-gray-100 */
  margin-bottom: 1rem;
  border-radius: 0.25rem;
}

.skeleton-text {
  height: 16px;
  background-color: rgb(243 244 246); /* bg-gray-100 */
  margin-bottom: 0.5rem;
  border-radius: 0.25rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.game-table {
  background-color: rgb(243 244 246); /* bg-gray-100 */
}

.token {
  border: 1px solid rgb(229 231 235); /* border-gray-200 */
}

.token-selected {
  background-color: rgb(243 244 246); /* bg-gray-100 */
}

.token-dragging {
  background-color: rgb(243 244 246); /* bg-gray-100 */
}
</style> 