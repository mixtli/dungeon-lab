<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useActorStore } from '../stores/actor.store.mjs';
import PluginUIContainer from '@/components/plugin/PluginUIContainer.vue';
import { pluginRegistry } from '@/services/plugin-registry.service.mts';
import type { IActor } from '@dungeon-lab/shared/dist/index.mjs';

const route = useRoute();
const actorStore = useActorStore();
const characterId = route.params.id as string;
const isLoading = ref(true);
const character = ref<IActor | null>(null);
const error = ref<string | null>(null);

// Get the plugin ID from the character's gameSystemId
const pluginId = ref('');
const isPluginLoaded = ref(false);

// Function to handle errors from the plugin component
const handleError = (errorMessage: string) => {
  error.value = errorMessage;
};

onMounted(async () => {
  try {
    // Fetch the character data
    const fetchedCharacter = await actorStore.fetchActor(characterId);

    if (fetchedCharacter) {
      character.value = fetchedCharacter;
      console.log('character', character.value);

      // Get the plugin ID from the character's gameSystemId
      pluginId.value = fetchedCharacter.gameSystemId || '';

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
</script>

<template>
  <div class="character-sheet-view">
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>Loading character...</p>
    </div>

    <div v-else-if="error" class="error">
      <h2>Error</h2>
      <p>{{ error }}</p>
    </div>

    <div v-else-if="!character" class="not-found">
      <h2>Character Not Found</h2>
      <p>The character you're looking for doesn't exist or has been deleted.</p>
    </div>

    <div v-else-if="!isPluginLoaded" class="plugin-error">
      <h2>Game System Not Available</h2>
      <p>The game system plugin required for this character is not available.</p>
    </div>

    <div v-else class="character-container">
      <PluginUIContainer
        :plugin-id="pluginId"
        component-id="characterSheet"
        :initial-data="{ character }"
        @error="handleError"
      />
    </div>
  </div>
</template>

<style scoped>
.character-sheet-view {
  padding: 20px;
  height: 100%;
}

.loading,
.error,
.not-found,
.plugin-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  text-align: center;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #7b1fa2;
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

.character-container {
  height: 100%;
}

.error,
.not-found,
.plugin-error {
  color: #d32f2f;
}
</style>
