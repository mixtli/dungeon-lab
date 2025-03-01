<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const gameId = route.params.id as string;
const isLoading = ref(true);
const gameData = ref(null);

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
  <div class="game-table-view">
    <el-row :gutter="20">
      <!-- Game Info Sidebar -->
      <el-col :span="6" class="sidebar">
        <el-card v-if="isLoading" v-loading="isLoading">
          <div class="skeleton-loader">
            <div class="skeleton-title"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text"></div>
          </div>
        </el-card>
        
        <el-card v-else>
          <template #header>
            <div class="card-header">
              <h2 class="text-xl font-bold">{{ gameData?.name }}</h2>
              <el-tag>{{ gameData?.system }}</el-tag>
            </div>
          </template>
          
          <p class="mb-4">{{ gameData?.description }}</p>
          
          <div class="mb-4">
            <h3 class="text-lg font-semibold mb-2">Game Master</h3>
            <div class="flex items-center">
              <el-avatar :size="32" class="mr-2">DM</el-avatar>
              <span>{{ gameData?.dm.displayName }}</span>
            </div>
          </div>
          
          <div>
            <h3 class="text-lg font-semibold mb-2">Players</h3>
            <el-list>
              <el-list-item v-for="player in gameData?.players" :key="player.id">
                <div class="flex items-center">
                  <el-avatar :size="32" class="mr-2">{{ player.displayName.charAt(0) }}</el-avatar>
                  <span>{{ player.displayName }}</span>
                </div>
              </el-list-item>
            </el-list>
          </div>
        </el-card>
      </el-col>
      
      <!-- Game Table Main Area -->
      <el-col :span="18">
        <el-card class="game-table-card">
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-xl font-bold">Game Table</h2>
              <div class="flex gap-2">
                <el-button type="primary" size="small">
                  <el-icon><Plus /></el-icon> Add Token
                </el-button>
                <el-button type="success" size="small">
                  <el-icon><VideoPlay /></el-icon> Start Session
                </el-button>
              </div>
            </div>
          </template>
          
          <div v-if="isLoading" class="game-table-loading" v-loading="isLoading">
            <p>Loading game table...</p>
          </div>
          
          <div v-else class="game-table-content">
            <div class="game-map">
              <p class="text-center text-gray-500 py-16">
                Game map will be displayed here.
                <br>
                This is a placeholder for the interactive game table.
              </p>
            </div>
            
            <div class="game-controls mt-4">
              <el-row :gutter="10">
                <el-col :span="8">
                  <el-card shadow="hover" class="control-card">
                    <h3 class="text-lg font-semibold mb-2">Dice Roller</h3>
                    <div class="flex gap-2 mb-2">
                      <el-button>D4</el-button>
                      <el-button>D6</el-button>
                      <el-button>D8</el-button>
                      <el-button>D10</el-button>
                      <el-button>D12</el-button>
                      <el-button>D20</el-button>
                    </div>
                    <el-input placeholder="Custom roll (e.g. 2d6+3)"></el-input>
                  </el-card>
                </el-col>
                
                <el-col :span="8">
                  <el-card shadow="hover" class="control-card">
                    <h3 class="text-lg font-semibold mb-2">Initiative Tracker</h3>
                    <p class="text-gray-500">No combat in progress</p>
                    <el-button type="primary" class="mt-2">Start Combat</el-button>
                  </el-card>
                </el-col>
                
                <el-col :span="8">
                  <el-card shadow="hover" class="control-card">
                    <h3 class="text-lg font-semibold mb-2">Chat</h3>
                    <div class="chat-messages">
                      <p class="text-gray-500">No messages yet</p>
                    </div>
                    <el-input placeholder="Type a message..." class="mt-2"></el-input>
                  </el-card>
                </el-col>
              </el-row>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
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
  background-color: var(--el-fill-color-light);
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
  border: 1px solid var(--el-border-color);
  border-radius: 0.25rem;
  padding: 0.5rem;
}

.skeleton-loader {
  padding: 1rem;
}

.skeleton-title {
  height: 24px;
  background-color: var(--el-fill-color);
  margin-bottom: 1rem;
  border-radius: 0.25rem;
}

.skeleton-text {
  height: 16px;
  background-color: var(--el-fill-color);
  margin-bottom: 0.5rem;
  border-radius: 0.25rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style> 