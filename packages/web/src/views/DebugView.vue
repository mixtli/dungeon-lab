<script setup lang="ts">
import { ref } from 'vue';
import { useGameSessionStore } from '@/stores/game-session.store.mjs';
import { useSocketStore } from '@/stores/socket.store.mjs';
import { useNotificationStore } from '@/stores/notification.store.mjs';
import { useGameStateStore } from '@/stores/game-state.store.mjs';

// Debug operations state
const hashResetLoading = ref(false);
const reinitializeLoading = ref(false);
const checkStatusLoading = ref(false);
const statusResult = ref<{ isHashValid: boolean; storedHash?: string; calculatedHash?: string } | null>(null);

// Store instances
const gameSessionStore = useGameSessionStore();
const socketStore = useSocketStore();
const notificationStore = useNotificationStore();
const gameStateStore = useGameStateStore();

async function resetGameStateHash() {
  if (!gameSessionStore.currentSession?.id) {
    notificationStore.addNotification({
      message: 'No active game session',
      type: 'error'
    });
    return;
  }

  if (!gameSessionStore.isGameMaster) {
    notificationStore.addNotification({
      message: 'Only the Game Master can reset the game state hash',
      type: 'error'
    });
    return;
  }

  try {
    hashResetLoading.value = true;
    
    return new Promise<void>((resolve, reject) => {
      socketStore.emit('gameState:resetHash', gameSessionStore.currentSession!.id, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          notificationStore.addNotification({
            message: 'Game state hash reset successfully',
            type: 'success'
          });
          resolve();
        } else {
          const error = response.error || 'Failed to reset game state hash';
          notificationStore.addNotification({
            message: error,
            type: 'error'
          });
          reject(new Error(error));
        }
      });
    });
  } catch (error) {
    console.error('Failed to reset game state hash:', error);
    notificationStore.addNotification({
      message: 'Failed to reset game state hash',
      type: 'error'
    });
  } finally {
    hashResetLoading.value = false;
  }
}

async function reinitializeGameState() {
  if (!gameSessionStore.currentSession?.id) {
    notificationStore.addNotification({
      message: 'No active game session',
      type: 'error'
    });
    return;
  }

  if (!gameSessionStore.isGameMaster) {
    notificationStore.addNotification({
      message: 'Only the Game Master can re-initialize the game state',
      type: 'error'
    });
    return;
  }

  try {
    reinitializeLoading.value = true;
    
    return new Promise<void>((resolve, reject) => {
      socketStore.emit('gameState:reinitialize', gameSessionStore.currentSession!.id, async (response: { success: boolean; error?: string }) => {
        if (response.success) {
          // CRITICAL: Refresh client state after server re-initializes
          try {
            await gameStateStore.requestFullState();
            notificationStore.addNotification({
              message: 'Game state re-initialized successfully',
              type: 'success'
            });
            resolve();
          } catch (refreshError) {
            console.error('Failed to refresh game state after reinitialize:', refreshError);
            notificationStore.addNotification({
              message: 'Game state re-initialized but failed to refresh. Please refresh the page.',
              type: 'warning'
            });
            resolve(); // Still resolve because the server operation succeeded
          }
        } else {
          const error = response.error || 'Failed to re-initialize game state';
          notificationStore.addNotification({
            message: error,
            type: 'error'
          });
          reject(new Error(error));
        }
      });
    });
  } catch (error) {
    console.error('Failed to re-initialize game state:', error);
    notificationStore.addNotification({
      message: 'Failed to re-initialize game state',
      type: 'error'
    });
  } finally {
    reinitializeLoading.value = false;
  }
}

async function checkGameStateStatus() {
  if (!gameSessionStore.currentSession?.id) {
    notificationStore.addNotification({
      message: 'No active game session',
      type: 'error'
    });
    return;
  }

  if (!gameSessionStore.isGameMaster) {
    notificationStore.addNotification({
      message: 'Only the Game Master can check the game state status',
      type: 'error'
    });
    return;
  }

  try {
    checkStatusLoading.value = true;
    statusResult.value = null; // Clear previous result
    
    return new Promise<void>((resolve, reject) => {
      socketStore.emit('gameState:checkStatus', gameSessionStore.currentSession!.id, (response: { success: boolean; error?: string; isHashValid?: boolean; storedHash?: string; calculatedHash?: string }) => {
        if (response.success && response.isHashValid !== undefined) {
          statusResult.value = {
            isHashValid: response.isHashValid,
            storedHash: response.storedHash,
            calculatedHash: response.calculatedHash
          };
          
          const statusMessage = response.isHashValid 
            ? 'Game state hash is valid ✓'
            : 'Game state hash is invalid ✗ - State may be corrupted';
          
          notificationStore.addNotification({
            message: statusMessage,
            type: response.isHashValid ? 'success' : 'warning'
          });
          
          resolve();
        } else {
          const error = response.error || 'Failed to check game state status';
          notificationStore.addNotification({
            message: error,
            type: 'error'
          });
          reject(new Error(error));
        }
      });
    });
  } catch (error) {
    console.error('Failed to check game state status:', error);
    notificationStore.addNotification({
      message: 'Failed to check game state status',
      type: 'error'
    });
  } finally {
    checkStatusLoading.value = false;
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-6 text-dragon">Debug Tools</h1>

    <!-- No Session Warning -->
    <div v-if="!gameSessionStore.currentSession" class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5 text-orange-600 dark:text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
        <div>
          <h3 class="font-semibold text-orange-800 dark:text-orange-200">No Active Game Session</h3>
          <p class="text-sm text-orange-700 dark:text-orange-300 mt-1">
            Debug tools require an active game session. Please join a game session first.
          </p>
        </div>
      </div>
    </div>

    <!-- Not GM Warning -->
    <div v-else-if="!gameSessionStore.isGameMaster" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" />
        </svg>
        <div>
          <h3 class="font-semibold text-red-800 dark:text-red-200">Game Master Access Required</h3>
          <p class="text-sm text-red-700 dark:text-red-300 mt-1">
            Debug tools are only available to Game Masters. Please ask your GM to access these tools.
          </p>
        </div>
      </div>
    </div>

    <!-- Debug Operations Section (GM only) -->
    <div v-else class="bg-stone dark:bg-stone-700 rounded-lg shadow-xl border border-stone-300 dark:border-stone-600 p-6 mb-6">
      <div class="border-b border-stone-300 dark:border-stone-600 pb-4 mb-4">
        <h2 class="text-xl font-semibold text-dragon dark:text-gold">Game State Debug Operations</h2>
        <p class="text-sm text-onyx dark:text-parchment mt-2">
          Advanced debugging tools for the current game session
        </p>
      </div>

      <div class="debug-operations">
        <div class="operation-item">
          <div class="operation-info">
            <h3 class="text-base font-medium text-onyx dark:text-parchment">Reset Game State Hash</h3>
            <p class="text-sm text-onyx/70 dark:text-parchment/70 mt-1">
              Recalculates the game state hash from current data. Use if you encounter "State integrity validation failed" errors.
            </p>
          </div>
          <button 
            @click="resetGameStateHash"
            :disabled="hashResetLoading"
            class="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <div v-if="hashResetLoading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>{{ hashResetLoading ? 'Resetting...' : 'Reset Hash' }}</span>
          </button>
        </div>

        <div class="operation-item">
          <div class="operation-info">
            <h3 class="text-base font-medium text-onyx dark:text-parchment">Re-initialize Game State</h3>
            <p class="text-sm text-onyx/70 dark:text-parchment/70 mt-1">
              Completely rebuilds game state from campaign data (characters, actors, items). This is a "nuclear option" - use only when game state is corrupted.
            </p>
          </div>
          <button 
            @click="reinitializeGameState"
            :disabled="reinitializeLoading"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <div v-if="reinitializeLoading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>{{ reinitializeLoading ? 'Re-initializing...' : 'Re-initialize Game State' }}</span>
          </button>
        </div>

        <div class="operation-item">
          <div class="operation-info">
            <h3 class="text-base font-medium text-onyx dark:text-parchment">Check Game State Status</h3>
            <p class="text-sm text-onyx/70 dark:text-parchment/70 mt-1">
              Validates whether the current game state hash matches the stored data. Use to diagnose "State integrity validation failed" errors.
            </p>
            <div v-if="statusResult" class="mt-2 p-2 rounded border">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium" 
                      :class="statusResult.isHashValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                  {{ statusResult.isHashValid ? '✓ Hash Valid' : '✗ Hash Invalid' }}
                </span>
              </div>
              <div v-if="statusResult.storedHash && statusResult.calculatedHash" class="text-xs text-onyx/60 dark:text-parchment/60 mt-1">
                <div>Stored: {{ statusResult.storedHash }}</div>
                <div>Current: {{ statusResult.calculatedHash }}</div>
              </div>
            </div>
          </div>
          <button 
            @click="checkGameStateStatus"
            :disabled="checkStatusLoading"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <div v-if="checkStatusLoading" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>{{ checkStatusLoading ? 'Checking...' : 'Check Status' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Session Info -->
    <div v-if="gameSessionStore.currentSession" class="bg-stone dark:bg-stone-700 rounded-lg shadow-xl border border-stone-300 dark:border-stone-600 p-6">
      <div class="border-b border-stone-300 dark:border-stone-600 pb-4 mb-4">
        <h2 class="text-xl font-semibold text-dragon dark:text-gold">Session Information</h2>
      </div>
      
      <div class="space-y-3">
        <div class="flex justify-between">
          <span class="text-sm font-medium text-onyx dark:text-parchment">Session ID:</span>
          <span class="text-sm text-onyx/70 dark:text-parchment/70 font-mono">{{ gameSessionStore.currentSession.id }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-sm font-medium text-onyx dark:text-parchment">Campaign:</span>
          <span class="text-sm text-onyx/70 dark:text-parchment/70">{{ gameSessionStore.currentSession.campaign?.name || 'Unknown' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-sm font-medium text-onyx dark:text-parchment">Role:</span>
          <span class="text-sm text-onyx/70 dark:text-parchment/70">{{ gameSessionStore.isGameMaster ? 'Game Master' : 'Player' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-sm font-medium text-onyx dark:text-parchment">Game State Version:</span>
          <span class="text-sm text-onyx/70 dark:text-parchment/70 font-mono">{{ gameStateStore.gameStateVersion || 'N/A' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.debug-operations {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.operation-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid rgba(120, 113, 108, 0.2);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.5);
}

.dark .operation-item {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(120, 113, 108, 0.3);
}

.operation-info {
  flex: 1;
}

@media (max-width: 768px) {
  .operation-item {
    flex-direction: column;
    align-items: stretch;
  }
  
  .operation-item button {
    align-self: flex-start;
  }
}
</style>