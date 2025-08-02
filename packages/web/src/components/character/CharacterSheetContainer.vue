<template>
  <div v-if="show" class="character-sheet-container">
    <!-- Plugin Container with Style Isolation -->
    <PluginContainer
      width="100%"
      height="100%"
      background-color="#ffffff"
    >
      <!-- D&D 5e Character Sheet Component -->
      <component
        :is="characterSheetComponent"
        v-if="characterSheetComponent && character"
        :character="characterSheetData"
        :context="pluginContext"
        :readonly="readonly"
        @update:character="handleCharacterUpdate"
        @save="handleSave"
        @roll="handleRoll"
        @close="$emit('close')"
      />
      
      <!-- Fallback for when plugin/component not available -->
      <div
        v-else
        class="w-full h-full bg-white rounded-lg border-2 border-gray-300 p-6 flex flex-col items-center justify-center"
      >
        <div class="text-center">
          <i class="mdi mdi-account-alert text-4xl text-gray-400 mb-4"></i>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Character Sheet Unavailable</h3>
          <p class="text-sm text-gray-600 mb-4">
            {{ character ? `The character sheet component for game system "${character.pluginId}" is not available.` : 'No character data provided.' }}
          </p>
          <details class="mb-4 text-left">
            <summary class="text-sm text-gray-500 cursor-pointer">Debug Information</summary>
            <div class="mt-2 text-xs text-gray-400 font-mono">
              <div>Character Game System: {{ character?.pluginId || 'none' }}</div>
              <div>Active Game System: {{ getActiveGameSystem() }}</div>
            </div>
          </details>
          <button
            @click="$emit('close')"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </PluginContainer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Component } from 'vue';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';
import { pluginRegistry } from '../../services/plugin-registry.mts';
import PluginContainer from '../common/PluginContainer.vue';

const props = defineProps<{
  show: boolean;
  character: IActor | null;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:character', character: IActor): void;
  (e: 'save', character: IActor): void;
  (e: 'roll', rollType: string, data: Record<string, unknown>): void;
}>();

// Get the character sheet component from the plugin registry (async)
const characterSheetComponent = ref<Component | null>(null);

// Watch for character changes and load the appropriate component
watch(() => props.character?.pluginId, async (pluginId) => {
  console.log('[CharacterSheetModal] Character game system ID:', pluginId);
  
  if (!pluginId) {
    characterSheetComponent.value = null;
    return;
  }

  try {
    // Use the new async getComponent API
    const component = await pluginRegistry.getComponent(pluginId, 'character-sheet');
    if (component) {
      console.log('[CharacterSheetModal] Character sheet component loaded successfully');
      characterSheetComponent.value = component;
    } else {
      console.warn('[CharacterSheetModal] Character sheet component not found for plugin:', pluginId);
      characterSheetComponent.value = null;
    }
  } catch (error) {
    console.error('[CharacterSheetModal] Failed to load character sheet component:', error);
    characterSheetComponent.value = null;
  }
}, { immediate: true });

// Pass the raw character data directly to the plugin component
// The plugin is responsible for interpreting and providing fallbacks for its own data structure
const characterSheetData = computed(() => {
  if (!props.character) return null;
  
  // Just pass the raw IActor - the plugin component should handle its own data transformation
  return props.character;
});

// Get plugin context for event communication
const pluginContext = computed(() => {
  if (!props.character?.pluginId) return null;
  
  // Map game system ID to plugin ID
  let pluginId = props.character.pluginId;
  if (pluginId === 'dnd5e-2024' || pluginId === 'dnd-5e-2024') {
    pluginId = 'dnd-5e-2024';
  }
  
  return pluginRegistry.getPluginContext(pluginId);
});

function handleCharacterUpdate(updatedCharacter: Record<string, unknown>) {
  if (!props.character) return;
  
  // Convert back to IActor format and emit
  const updatedActor: IActor = {
    ...props.character,
    name: (updatedCharacter.name as string) || props.character.name,
    pluginData: {
      ...props.character.pluginData,
      ...updatedCharacter,
    },
  };
  
  emit('update:character', updatedActor);
}

function handleSave(character: Record<string, unknown>) {
  if (!props.character) return;
  
  const updatedActor: IActor = {
    ...props.character,
    name: (character.name as string) || props.character.name,
    pluginData: {
      ...props.character.pluginData,
      ...character,
    },
  };
  
  emit('save', updatedActor);
}

function handleRoll(rollType: string, data: Record<string, unknown>) {
  emit('roll', rollType, data);
}

function getActiveGameSystem() {
  return localStorage.getItem('activeGameSystem') || localStorage.getItem('activeGameSession') || 'none';
}
</script>

<style scoped>
.character-sheet-container {
  width: 100%;
  height: 100%;
  display: block;
}
</style>