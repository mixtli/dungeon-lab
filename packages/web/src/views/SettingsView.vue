<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { pluginRegistry } from '@/services/plugin-registry.mts';
import { useGameSessionStore } from '@/stores/game-session.store.mjs';
import { useSocketStore } from '@/stores/socket.store.mjs';
import { useNotificationStore } from '@/stores/notification.store.mjs';

const selectedGameSystem = ref<string>(localStorage.getItem('activeGameSystem') || '');
const previousGameSystem = ref<string>('');
const loading = ref(true);
const gameSystemPluginOptions = ref<{ id: string; name: string }[]>([]);

// Debug operations state
const hashResetLoading = ref(false);

// Store instances
const gameSessionStore = useGameSessionStore();
const socketStore = useSocketStore();
const notificationStore = useNotificationStore();

onMounted(async () => {
  try {
    // Ensure plugin registry is initialized
    await pluginRegistry.initialize();
    
    // Get available plugins from the frontend plugin registry
    const plugins = pluginRegistry.getPlugins();
    gameSystemPluginOptions.value = plugins.map(plugin => ({
      id: plugin.manifest.id,
      name: plugin.manifest.name
    }));
    
    console.log('Available game system plugins:', gameSystemPluginOptions.value);
    previousGameSystem.value = selectedGameSystem.value;
  } catch (error) {
    console.error('Failed to load plugin list:', error);
  } finally {
    loading.value = false;
  }
});

async function handleGameSystemChange(event: Event) {
  const select = event.target as HTMLSelectElement;
  const newGameSystemId = select.value;

  // If there was a previous game system, call its onUnload handler
  if (previousGameSystem.value) {
    const oldPlugin = pluginRegistry.getGameSystemPlugin(previousGameSystem.value);
    if (oldPlugin?.onUnload) {
      await oldPlugin.onUnload();
    }
  }

  // Call onLoad handler for the new game system
  // Only load the selected plugin now
  // Load plugin - the registry will create the proper context and call onLoad
  await pluginRegistry.loadPlugin(newGameSystemId);

  // Update localStorage and previous game system reference
  localStorage.setItem('activeGameSystem', newGameSystemId);
  previousGameSystem.value = newGameSystemId;
}

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
      socketStore.emit('gameState:resetHash', gameSessionStore.currentSession!.id, (response: any) => {
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
</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-6 text-dragon">Settings</h1>

    <div class="bg-stone dark:bg-stone-700 rounded-lg shadow-xl border border-stone-300 dark:border-stone-600 p-6 mb-6">
      <div class="border-b border-stone-300 dark:border-stone-600 pb-4 mb-4">
        <h2 class="text-xl font-semibold text-dragon dark:text-gold">Game System</h2>
      </div>

      <div class="game-system-settings">
        <label for="gameSystem" class="block text-sm font-medium text-onyx dark:text-parchment mb-2">
          Active Game System
        </label>
        <div v-if="loading" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-dragon"></div>
        </div>
        <select
          v-else
          id="gameSystem"
          v-model="selectedGameSystem"
          @change="handleGameSystemChange"
          class="block w-full px-3 py-2 bg-parchment dark:bg-stone-600 border border-stone-300 dark:border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-dragon focus:border-dragon text-onyx dark:text-parchment"
        >
          <option value="" disabled>Select a game system</option>
          <option
            v-for="plugin in gameSystemPluginOptions"
            :key="plugin.id"
            :value="plugin.id"
          >
            {{ plugin.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Debug Operations Section (GM only) -->
    <div v-if="gameSessionStore.isGameMaster && gameSessionStore.currentSession" class="bg-stone dark:bg-stone-700 rounded-lg shadow-xl border border-stone-300 dark:border-stone-600 p-6 mb-6">
      <div class="border-b border-stone-300 dark:border-stone-600 pb-4 mb-4">
        <h2 class="text-xl font-semibold text-dragon dark:text-gold">Debug Operations</h2>
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
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-container {
  max-width: 800px;
  margin: 0 auto;
}

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
