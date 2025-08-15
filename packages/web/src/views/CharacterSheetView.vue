<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { pluginRegistry } from '@/services/plugin-registry.mts';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';
import { ActorsClient } from '@dungeon-lab/client/index.mjs';
import { useGameStateStore } from '../stores/game-state.store.mjs';
import DocumentSheetContainer from '../components/common/DocumentSheetContainer.vue';

const route = useRoute();
const router = useRouter();
const gameStateStore = useGameStateStore();
const actorsClient = new ActorsClient();
const characterId = route.params.id as string;
const isLoading = ref(true);
const character = ref<IActor | null>(null);
const error = ref<string | null>(null);

// Get the plugin ID from the character's gameSystemId
const pluginId = ref('');
const isPluginLoaded = ref(false);

onMounted(async () => {
  try {
    // Fetch the character data directly using ActorsClient
    const fetchedCharacter = await actorsClient.getActor(characterId);

    if (fetchedCharacter) {
      character.value = fetchedCharacter;
      // Update the current character in the game state store
      gameStateStore.selectedCharacter = fetchedCharacter;
      console.log('character', character.value);

      // Get the plugin ID from the character's gameSystemId
      pluginId.value = fetchedCharacter.pluginId || '';

      // Check if plugin is loaded or available
      if (pluginId.value) {
        const plugin = pluginRegistry.getGameSystemPlugin(pluginId.value);
        if (plugin) {
          isPluginLoaded.value = true;
        } else {
          // Try to load the plugin
          try {
            await pluginRegistry.loadPlugin(pluginId.value);
            isPluginLoaded.value = true;
          } catch (e) {
            console.error('Failed to load plugin:', e);
            error.value = `Failed to load game system plugin: ${pluginId.value}`;
          }
        }
      } else {
        error.value = 'Character has no game system ID';
      }
    } else {
      error.value = 'Character not found';
    }
  } catch (e) {
    console.error('Error fetching character:', e);
    error.value = 'Error loading character data';
  } finally {
    isLoading.value = false;
  }
});

// Character sheet event handlers
function handleRoll(rollType: string, data: Record<string, unknown>) {
  // Handle dice rolls
  console.log('Roll:', rollType, data);
}
</script>

<template>
  <div class="character-sheet-standalone">
    <div v-if="isLoading" class="loading-standalone">
      <div class="spinner"></div>
      <p>Loading character...</p>
    </div>

    <div v-else-if="error" class="error-standalone">
      <h2>Error</h2>
      <p>{{ error }}</p>
    </div>

    <div v-else-if="!character" class="not-found-standalone">
      <h2>Character Not Found</h2>
      <p>The character you're looking for doesn't exist or has been deleted.</p>
    </div>

    <div v-else-if="!isPluginLoaded" class="plugin-error-standalone">
      <h2>Game System Not Available</h2>
      <p>The game system plugin required for this character is not available.</p>
    </div>

    <div v-else class="character-content-standalone">
      <DocumentSheetContainer
        :show="true"
        :document="character"
        :readonly="false"
        @close="router.push('/')"
        @roll="handleRoll"
      />
    </div>
  </div>
</template>

<style scoped>
/* Standalone Mode Styles */
.character-sheet-standalone {
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  overflow: hidden;
}

.character-content-standalone {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: auto;
}

.loading-standalone,
.error-standalone,
.not-found-standalone,
.plugin-error-standalone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  padding: 20px;
  background: #f5f5f5;
}

.error-standalone,
.not-found-standalone,
.plugin-error-standalone {
  color: #dc3545;
}

.error-standalone h2,
.not-found-standalone h2,
.plugin-error-standalone h2 {
  color: #dc3545;
  margin: 0 0 16px 0;
  font-size: 1.5rem;
}

.loading-standalone {
  color: #666;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #007bff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Character Sheet Width Constraints for Standalone Mode */
.character-content-standalone :deep(.dnd5e-character-sheet) {
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  /* Override the problematic min-width that causes overflow */
  min-width: 0;
}

.character-content-standalone :deep(.character-sheet-container) {
  max-width: 100%;
  box-sizing: border-box;
}
</style>