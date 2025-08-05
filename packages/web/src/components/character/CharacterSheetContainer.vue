<template>
  <div v-if="show" class="character-sheet-container">
    <!-- Plugin Container with Style Isolation -->
    <PluginContainer
      width="100%"
      height="100%"
      background-color="#ffffff"
    >
      <!-- Character Sheet Component -->
      <component
        :is="characterSheetComponent"
        v-if="characterSheetComponent && reactiveCharacter"
        :character="reactiveCharacter"
        :items="reactiveItems"
        :edit-mode="editMode"
        :readonly="readonly"
        @update:items="handleItemsChange"
        @save="handleSave"
        @toggle-edit-mode="toggleEditMode"
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
import { ref, watch, computed } from 'vue';
import type { Component } from 'vue';
import type { IActor, IItem } from '@dungeon-lab/shared/types/index.mjs';
import { pluginRegistry } from '../../services/plugin-registry.mts';
import { useCharacterState } from '../../composables/useCharacterState.mjs';
import PluginContainer from '../common/PluginContainer.vue';

const props = defineProps<{
  show: boolean;
  character: IActor | null;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:character', character: IActor): void;
  (e: 'roll', rollType: string, data: Record<string, unknown>): void;
}>();

// Component state
const characterSheetComponent = ref<Component | null>(null);
const editMode = ref(false);

// Character state management using composable
const characterState = computed(() => {
  if (!props.character) return null;
  
  return useCharacterState(props.character, {
    enableWebSocket: props.readonly, // Game mode uses WebSocket
    enableAutoSave: false, // Disable auto-save - manual save only
    readonly: props.readonly
  });
});

// Reactive character and items from composable
const reactiveCharacter = computed(() => characterState.value?.character || null);
const reactiveItems = computed(() => characterState.value?.items || ref([]));
const hasUnsavedChanges = computed(() => characterState.value?.hasUnsavedChanges?.value ?? false);

// Watch for character changes to reinitialize state
// The composable handles the actual state management
watch(() => props.character, () => {
  // Character state will be recreated via computed when character changes
  console.log('[CharacterSheetContainer] Character changed, state will be recomputed');
}, { immediate: true });

// Watch for character changes and load the appropriate component
watch(() => props.character?.pluginId, async (pluginId) => {
  console.log('[CharacterSheetContainer] Character game system ID:', pluginId);
  
  if (!pluginId) {
    characterSheetComponent.value = null;
    return;
  }

  try {
    // Use the new async getComponent API
    const component = await pluginRegistry.getComponent(pluginId, 'character-sheet');
    if (component) {
      console.log('[CharacterSheetContainer] Character sheet component loaded successfully');
      characterSheetComponent.value = component;
    } else {
      console.warn('[CharacterSheetContainer] Character sheet component not found for plugin:', pluginId);
      characterSheetComponent.value = null;
    }
  } catch (error) {
    console.error('[CharacterSheetContainer] Failed to load character sheet component:', error);
    characterSheetComponent.value = null;
  }
}, { immediate: true });

// Edit mode controls
const toggleEditMode = () => {
  if (editMode.value && hasUnsavedChanges.value) {
    // Ask for confirmation if there are unsaved changes
    if (confirm('You have unsaved changes. Do you want to discard them?')) {
      handleCancel();
    }
  } else {
    editMode.value = !editMode.value;
  }
};

// Character changes are handled automatically through direct v-model binding in the plugin component
// No longer need handleCharacterChange - changes are applied directly to the reactive character ref

const handleItemsChange = (newItems: IItem[]) => {
  // Items changes would be handled through the composable
  // For now, just track the change
  console.log('[CharacterSheetContainer] Items changed:', newItems.length);
};

// Save functionality delegated to composable
const handleSave = async () => {
  if (!characterState.value) return;
  
  try {
    await characterState.value.save();
    
    // Emit to parent for reactive updates
    if (reactiveCharacter.value?.value) {
      emit('update:character', reactiveCharacter.value.value);
    }
  } catch (error) {
    console.error('[CharacterSheetContainer] Save failed:', error);
    // TODO: Show user-friendly error message
  }
};

const handleCancel = () => {
  if (!characterState.value) return;
  
  characterState.value.reset();
  editMode.value = false;
};

const handleRoll = (rollType: string, data: Record<string, unknown>) => {
  emit('roll', rollType, data);
};

function getActiveGameSystem() {
  return localStorage.getItem('activeGameSystem') || localStorage.getItem('activeGameSession') || 'none';
}
</script>

<style scoped>
.character-sheet-container {
  width: 100%;
  height: 100%;
}

/* Plugin Container takes full space */
.character-sheet-container .plugin-container {
  width: 100%;
  height: 100%;
}
</style>