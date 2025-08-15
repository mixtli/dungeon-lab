<template>
  <div v-if="show" class="character-sheet-container">
    <!-- Plugin Container with Style Isolation -->
    <PluginContainer
      width="100%"
      height="100%"
      background-color="#ffffff"
    >
      <!-- Character/Actor Sheet Component -->
      <component
        :is="characterSheetComponent"
        v-if="characterSheetComponent && props.character"
        v-bind="getComponentProps()"
        @update:items="handleItemsChange"
        @update:character="handleCharacterUpdate"
        @update:actor="handleActorUpdate"
        @save="handleSave"
        @toggle-edit-mode="toggleEditMode"
        @roll="handleRoll"
        @close="$emit('close')"
        @drag-start="handleDragStart"
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
import { ref, watch, computed, shallowRef } from 'vue';
import type { Component } from 'vue';
import type { IActor, IItem } from '@dungeon-lab/shared/types/index.mjs';
import { pluginRegistry } from '../../services/plugin-registry.mts';
import { useDocumentState } from '../../composables/useDocumentState.mjs';
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
  (e: 'drag-start', event: MouseEvent): void;
}>();

// Component state
const characterSheetComponent = shallowRef<Component | null>(null);
const editMode = ref(false);

// Unified document state management for both characters and actors
// Always create composable at setup level to avoid lifecycle issues
const documentState = props.character ? useDocumentState(props.character, {
  enableWebSocket: props.readonly, // Game mode uses WebSocket
  enableAutoSave: false, // Disable auto-save - manual save only
  readonly: props.readonly
}) : null;

// Computed wrapper for reactivity
const characterState = computed(() => documentState);

// Reactive character and items from composable (only for characters)
const reactiveCharacter = computed(() => characterState.value?.character || null);
const reactiveItems = computed(() => characterState.value?.items || ref([]));
const hasUnsavedChanges = computed(() => characterState.value?.hasUnsavedChanges?.value ?? false);

// Watch for character changes to reinitialize state
// The composable handles the actual state management
watch(() => props.character, () => {
  // Character state will be recreated via computed when character changes
  console.log('[CharacterSheetContainer] Character changed, state will be recomputed');
}, { immediate: true });

// Watch for character changes and load the appropriate component based on documentType
watch(() => [props.character?.pluginId, props.character?.documentType], async ([pluginId, documentType]) => {
  console.log('[CharacterSheetContainer] Character game system ID:', pluginId, 'documentType:', documentType);
  
  if (!pluginId) {
    characterSheetComponent.value = null;
    return;
  }

  try {
    // Determine component type based on documentType
    const componentType = documentType === 'actor' ? 'actor-sheet' : 'character-sheet';
    
    // Use the new async getComponent API
    const component = await pluginRegistry.getComponent(pluginId, componentType);
    if (component) {
      console.log(`[CharacterSheetContainer] ${componentType} component loaded successfully`);
      characterSheetComponent.value = component;
    } else {
      console.warn(`[CharacterSheetContainer] ${componentType} component not found for plugin:`, pluginId);
      characterSheetComponent.value = null;
    }
  } catch (error) {
    console.error('[CharacterSheetContainer] Failed to load sheet component:', error);
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

const handleDragStart = (event: MouseEvent) => {
  emit('drag-start', event);
};

// Get appropriate props based on component type (character vs actor sheet)
const getComponentProps = () => {
  if (!props.character) return {};
  
  const isActorSheet = props.character.documentType === 'actor';
  
  if (isActorSheet) {
    // Actor sheet: Use unified reactive state just like character sheets
    return {
      actor: reactiveCharacter.value || props.character, // Use reactive if available, fallback to props
      readonly: props.readonly
    };
  } else {
    // Character sheet: Use unified reactive state
    return {
      character: reactiveCharacter.value || props.character, // Use reactive if available, fallback to props
      items: reactiveItems.value,
      editMode: editMode.value,
      readonly: props.readonly
    };
  }
};

// Handle updates from character sheet
const handleCharacterUpdate = (updatedCharacter: IActor) => {
  emit('update:character', updatedCharacter);
};

// Handle updates from actor sheet
const handleActorUpdate = (updatedActor: IActor) => {
  emit('update:character', updatedActor);
};

function getActiveGameSystem() {
  return localStorage.getItem('activeGameSystem') || localStorage.getItem('activeGameSession') || 'none';
}
</script>

<style scoped>
.character-sheet-container {
  width: fit-content;
  height: fit-content;
}

/* Plugin Container sizes to content */
.character-sheet-container .plugin-container {
  width: fit-content;
  height: fit-content;
}
</style>