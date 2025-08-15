<template>
  <div v-if="show" class="document-sheet-container">
    <!-- Plugin Container with Style Isolation -->
    <PluginContainer
      width="100%"
      height="100%"
      background-color="#ffffff"
    >
      <!-- Document Sheet Component -->
      <component
        :is="documentSheetComponent"
        v-if="documentSheetComponent && props.document"
        v-bind="getComponentProps()"
        @update:items="handleItemsChange"
        @update:character="handleDocumentUpdate"
        @update:actor="handleDocumentUpdate"
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
          <i class="mdi mdi-file-document-alert text-4xl text-gray-400 mb-4"></i>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Document Sheet Unavailable</h3>
          <p class="text-sm text-gray-600 mb-4">
            {{ document ? `The document sheet component for game system "${document.pluginId}" is not available.` : 'No document data provided.' }}
          </p>
          <details class="mb-4 text-left">
            <summary class="text-sm text-gray-500 cursor-pointer">Debug Information</summary>
            <div class="mt-2 text-xs text-gray-400 font-mono">
              <div>Document Type: {{ document?.documentType || 'none' }}</div>
              <div>Document Game System: {{ document?.pluginId || 'none' }}</div>
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
import type { BaseDocument, IItem } from '@dungeon-lab/shared/types/index.mjs';
import { pluginRegistry } from '../../services/plugin-registry.mts';
import { useDocumentState } from '../../composables/useDocumentState.mjs';
import PluginContainer from './PluginContainer.vue';

const props = defineProps<{
  show: boolean;
  document: BaseDocument | null;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:document', document: BaseDocument): void;
  (e: 'roll', rollType: string, data: Record<string, unknown>): void;
  (e: 'drag-start', event: MouseEvent): void;
}>();

// Component state
const documentSheetComponent = shallowRef<Component | null>(null);
const editMode = ref(false);

// Unified document state management for both characters and actors
// Always create composable at setup level to avoid lifecycle issues
const documentState = props.document ? useDocumentState(props.document, {
  enableWebSocket: props.readonly, // Game mode uses WebSocket
  enableAutoSave: false, // Disable auto-save - manual save only
  readonly: props.readonly
}) : null;

// Computed wrapper for reactivity
const characterState = computed(() => documentState);

// Reactive document and items from composable
const reactiveDocument = computed(() => characterState.value?.character || null);
const reactiveItems = computed(() => characterState.value?.items || ref([]));
const hasUnsavedChanges = computed(() => characterState.value?.hasUnsavedChanges?.value ?? false);

// Watch for document changes to reinitialize state
watch(() => props.document, () => {
  // Document state will be recreated via computed when document changes
  console.log('[DocumentSheetContainer] Document changed, state will be recomputed');
}, { immediate: true });

// Watch for document changes and load the appropriate component based on documentType
watch(() => [props.document?.pluginId, props.document?.documentType], async ([pluginId, documentType]) => {
  console.log('[DocumentSheetContainer] Document game system ID:', pluginId, 'documentType:', documentType);
  
  if (!pluginId) {
    documentSheetComponent.value = null;
    return;
  }

  try {
    // Determine component type based on documentType
    const componentType = documentType === 'actor' ? 'actor-sheet' : 'character-sheet';
    
    // Use the new async getComponent API
    const component = await pluginRegistry.getComponent(pluginId, componentType);
    if (component) {
      console.log(`[DocumentSheetContainer] ${componentType} component loaded successfully`);
      documentSheetComponent.value = component;
    } else {
      console.warn(`[DocumentSheetContainer] ${componentType} component not found for plugin:`, pluginId);
      documentSheetComponent.value = null;
    }
  } catch (error) {
    console.error('[DocumentSheetContainer] Failed to load sheet component:', error);
    documentSheetComponent.value = null;
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

const handleItemsChange = (newItems: IItem[]) => {
  // Items changes would be handled through the composable
  // For now, just track the change
  console.log('[DocumentSheetContainer] Items changed:', newItems.length);
};

// Save functionality delegated to composable
const handleSave = async () => {
  if (!characterState.value) return;
  
  try {
    await characterState.value.save();
    
    // Emit to parent for reactive updates
    if (reactiveDocument.value?.value) {
      emit('update:document', reactiveDocument.value.value);
    }
  } catch (error) {
    console.error('[DocumentSheetContainer] Save failed:', error);
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
  if (!props.document) return {};
  
  const isActorSheet = props.document.documentType === 'actor';
  
  if (isActorSheet) {
    // Actor sheet: Use unified reactive state just like character sheets
    return {
      actor: reactiveDocument.value || props.document, // Use reactive if available, fallback to props
      readonly: props.readonly
    };
  } else {
    // Character sheet: Use unified reactive state
    return {
      character: reactiveDocument.value || props.document, // Use reactive if available, fallback to props
      items: reactiveItems.value,
      editMode: editMode.value,
      readonly: props.readonly
    };
  }
};

// Handle updates from document sheet components
const handleDocumentUpdate = (updatedDocument: BaseDocument) => {
  emit('update:document', updatedDocument);
};

function getActiveGameSystem() {
  return localStorage.getItem('activeGameSystem') || localStorage.getItem('activeGameSession') || 'none';
}
</script>

<style scoped>
.document-sheet-container {
  width: fit-content;
  height: fit-content;
}

/* Plugin Container sizes to content */
.document-sheet-container .plugin-container {
  width: fit-content;
  height: fit-content;
}
</style>