<template>
  <div v-if="show" :class="['document-sheet-container', { 'full-size': context === 'admin' }]">
    <!-- Plugin Container with Style Isolation -->
    <PluginContainer
      width="100%"
      height="100%"
      background-color="#ffffff"
    >
      <!-- Document Sheet Component -->
      <component
        :is="documentSheetComponent"
        v-if="documentSheetComponent && reactiveDocument"
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
            {{ reactiveDocument ? `The document sheet component for game system "${documentInfo.pluginId}" is not available.` : 'No document data provided.' }}
          </p>
          <details class="mb-4 text-left">
            <summary class="text-sm text-gray-500 cursor-pointer">Debug Information</summary>
            <div class="mt-2 text-xs text-gray-400 font-mono">
              <div>Context: {{ context }}</div>
              <div>Document Type: {{ documentInfo.documentType || 'none' }}</div>
              <div>Document Game System: {{ documentInfo.pluginId || 'none' }}</div>
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
import { useDocumentState } from '../../composables/useDocumentState.mts';
import { useGameDocumentState } from '../../composables/useGameDocumentState.mts';
import PluginContainer from './PluginContainer.vue';

const props = defineProps<{
  show: boolean;
  documentId?: string;
  documentType?: 'character' | 'actor';
  context?: 'admin' | 'game';
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

// Context-aware document state management
const context = computed(() => props.context || 'admin');
const isGameContext = computed(() => context.value === 'game');

// Initialize appropriate composable based on context
//const adminDocumentState = ref<ReturnType<typeof useDocumentState> | null>(null);

// Initialize admin state only when we have valid props
const adminDocumentState = computed(() => {
  if (!isGameContext.value && props.documentId && props.documentType) {
    return useDocumentState(props.documentId, props.documentType, {
      readonly: props.readonly
    });
  }
  return null;
});

const gameDocumentState = computed(() => {
  if (isGameContext.value && props.documentId && props.documentType) {
    return useGameDocumentState(props.documentId, props.documentType, {
      readonly: props.readonly
    });
  }
  return null;
});

// Unified interface for both contexts
const documentState = computed(() => {
  return isGameContext.value ? gameDocumentState.value : adminDocumentState.value;
});

// Reactive document and items from appropriate composable
const reactiveDocument = computed(() => {
  console.log(`[DocumentSheetContainer] Computing reactiveDocument, context: ${context.value}`);
  
  if (isGameContext.value) {
    // IMPORTANT: gameDocumentState.value.document is already a ComputedRef, so we need to unwrap it
    const gameDoc = gameDocumentState.value?.document?.value || null;
    return gameDoc;
  } else {
    const adminDoc = adminDocumentState.value?.document?.value || null;
    return adminDoc;
  }
});

const reactiveItems = computed(() => documentState.value?.items || ref([]));
const hasUnsavedChanges = computed(() => documentState.value?.hasUnsavedChanges?.value ?? false);

// Watch for document changes to reinitialize state
watch(() => [props.documentId, props.documentType, props.context], () => {
  // Document state will be recreated via computed when dependencies change
  console.log('[DocumentSheetContainer] Document context changed, state will be recomputed');
}, { immediate: true });

// Get document info for component loading (works for both contexts)
const documentInfo = computed(() => {
  // Get from reactive document regardless of context
  const doc = reactiveDocument.value;
  return {
    pluginId: doc?.pluginId,
    documentType: props.documentType
  };
});

// Watch for document changes and load the appropriate component based on documentType
watch(() => [documentInfo.value.pluginId, documentInfo.value.documentType], async ([pluginId, documentType]) => {
  console.log('[DocumentSheetContainer] Document game system ID:', pluginId, 'documentType:', documentType, 'context:', context.value);
  
  if (!pluginId || !documentType) {
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
  if (!documentState.value) return;
  
  try {
    await documentState.value.save();
    toggleEditMode();
    
    // Emit to parent for reactive updates  
  } catch (error) {
    console.error('[DocumentSheetContainer] Save failed:', error);
    // TODO: Show user-friendly error message
  }
};

const handleCancel = () => {
  if (!documentState.value) return;
  
  documentState.value.reset();
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
  const docType = props.documentType;
  console.log(`[DocumentSheetContainer] getComponentProps - docType: ${docType}, context: ${context.value}`);
  
  if (!docType) {
    console.log(`[DocumentSheetContainer] getComponentProps - no docType, returning empty props`);
    return {};
  }
  
  const isActorSheet = docType === 'actor';
  
  if (isActorSheet) {
    // Actor sheet: Pass the reactive document ref
    const componentProps = {
      actor: reactiveDocument,
      readonly: props.readonly
    };
    console.log(`[DocumentSheetContainer] getComponentProps - Actor props:`, {
      actor: reactiveDocument.value ? { id: reactiveDocument.value.id, name: reactiveDocument.value.name } : null,
      readonly: props.readonly
    });
    return componentProps;
  } else {
    // Character sheet: Pass the reactive document ref
    const componentProps = {
      character: reactiveDocument,
      items: reactiveItems.value,
      editMode: editMode.value,
      readonly: props.readonly
    };
    console.log(`[DocumentSheetContainer] getComponentProps - Character props:`, {
      character: reactiveDocument.value ? { id: reactiveDocument.value.id, name: reactiveDocument.value.name } : null,
      items: reactiveItems.value,
      editMode: editMode.value,
      readonly: props.readonly
    });
    return componentProps;
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
/* Default fit-content for floating mode */
.document-sheet-container {
  width: fit-content;
  height: fit-content;
}

/* Full size for admin context */
.document-sheet-container.full-size {
  width: 100%;
  height: 100%;
}

.document-sheet-container.full-size :deep(.plugin-container-wrapper) {
  width: 100%;
  height: 100%;
}

.document-sheet-container.full-size :deep(.plugin-content) {
  width: 100% !important;
  height: 100% !important;
}

/* Plugin Container sizes to content */
.document-sheet-container .plugin-container {
  width: fit-content;
  height: fit-content;
}
</style>