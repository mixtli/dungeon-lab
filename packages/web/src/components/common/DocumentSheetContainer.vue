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
        @update:document="handleDocumentUpdate"
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
import { ref, watch, computed, shallowRef, reactive, toRaw } from 'vue';
import type { Component } from 'vue';
import type { BaseDocument, IItem } from '@dungeon-lab/shared/types/index.mjs';
import { pluginRegistry } from '../../services/plugin-registry.mts';
import { useDocumentState } from '../../composables/useDocumentState.mts';
import { useGameDocumentState } from '../../composables/useGameDocumentState.mts';
import { useNotificationStore } from '../../stores/notification.store.mjs';
import { PlayerActionService } from '../../services/player-action.service.mjs';
import type { UpdateDocumentParameters } from '@dungeon-lab/shared/types/game-actions.mjs';
import { generateDocumentPatch } from '@dungeon-lab/shared/utils/index.mjs';
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

// Services for GM request system
const playerActionService = new PlayerActionService();
const notificationStore = useNotificationStore();

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

// Document copy for form editing - enables v-model while preserving GM authority
const documentCopy = ref<BaseDocument | null>(null);

// Initialize document copy from original when document changes
const initializeDocumentCopy = () => {
  const doc = reactiveDocument.value;
  if (!doc) {
    console.warn('[DocumentSheetContainer] Cannot initialize document copy - no document available');
    documentCopy.value = null;
    return;
  }
  
  // Create simple JSON copy for editing (Vue-compatible approach)
  // This creates a mutable copy that character sheet can edit with v-model
  const copy = JSON.parse(JSON.stringify(doc));
  documentCopy.value = reactive(copy) as BaseDocument;
  
  console.log('[DocumentSheetContainer] Document copy initialized for editing:', doc.name);
};

// Check if form has unsaved changes by comparing copy to original
const hasUnsavedChanges = computed(() => {
  if (!reactiveDocument.value || !documentCopy.value) return false;
  
  // Simple JSON comparison using toRaw() to extract raw data from Vue proxies
  return JSON.stringify(toRaw(reactiveDocument.value)) !== JSON.stringify(toRaw(documentCopy.value));
});

// Reset document copy to original state
const resetDocumentCopy = () => {
  initializeDocumentCopy();
};

// Cancel changes - restore copy from original
const cancelChanges = () => {
  initializeDocumentCopy();
  editMode.value = false;
};

// Watch for document changes to reinitialize state
watch(() => [props.documentId, props.documentType, props.context], () => {
  // Document state will be recreated via computed when dependencies change
  console.log('[DocumentSheetContainer] Document context changed, state will be recomputed');
}, { immediate: true });

// Watch for document changes and reinitialize document copy
watch(() => reactiveDocument.value, (newDocument) => {
  if (newDocument) {
    initializeDocumentCopy();
  } else {
    documentCopy.value = null;
  }
}, { immediate: true, deep: true });

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

// Save functionality - implements GM request/approval system
const handleSave = async () => {
  if (!reactiveDocument.value || !documentCopy.value) {
    console.warn('[DocumentSheetContainer] Cannot save - missing document or copy');
    return;
  }

  // For game context, send GM request; for admin context, save directly
  if (isGameContext.value) {
    await handleGameContextSave();
  } else {
    await handleAdminContextSave();
  }
};

// Handle save in game context (requires GM approval)
const handleGameContextSave = async () => {
  if (!props.documentId || !reactiveDocument.value || !documentCopy.value) {
    console.error('[DocumentSheetContainer] Cannot save - missing required data');
    notificationStore.addNotification({
      type: 'error',
      message: 'Cannot save - invalid document',
      duration: 5000
    });
    return;
  }

  // Generate JSON Patch operations using generateDocumentPatch with toRaw()
  // toRaw() extracts raw data from Vue proxies for proper comparison
  console.log('[DocumentSheetContainer] Generating document patch with toRaw:', {
    documentId: props.documentId,
    originalDocument: reactiveDocument.value?.name,
    editedCopy: documentCopy.value?.name
  });
  
  const operations = generateDocumentPatch(
    toRaw(reactiveDocument.value) as Record<string, unknown>,
    toRaw(documentCopy.value) as Record<string, unknown>,
    props.documentId
  );
  
  console.log('[DocumentSheetContainer] Generated JsonPatchOperations:', operations);
  
  if (operations.length === 0) {
    console.log('[DocumentSheetContainer] No changes detected');
    editMode.value = false;
    return;
  }

  // Exit edit mode immediately
  editMode.value = false;

  // Show immediate feedback
  notificationStore.addNotification({
    type: 'info',
    message: 'Change request sent to Game Master',
    duration: 4000
  });

  try {
    // Use PlayerActionService to request document update
    const result = await playerActionService.requestAction(
      'update-document',
      {
        documentId: props.documentId,
        operations,
        documentName: reactiveDocument.value?.name || 'Unknown Document',
        documentType: props.documentType
      } as UpdateDocumentParameters,
      {
        description: generateChangesSummary(operations)
      }
    );

    console.log('[DocumentSheetContainer] Action request result:', result);
    
    if (result.success && result.approved) {
      notificationStore.addNotification({
        type: 'success',
        message: 'Your changes have been approved and applied',
        duration: 4000
      });
    } else if (result.success && !result.approved) {
      notificationStore.addNotification({
        type: 'warning',
        message: `Changes denied: ${result.error || 'No reason provided'}`,
        duration: 6000
      });
    } else {
      notificationStore.addNotification({
        type: 'error',
        message: `Request failed: ${result.error || 'Unknown error'}`,
        duration: 6000
      });
    }
  } catch (error) {
    console.error('[DocumentSheetContainer] Failed to send action request:', error);
    notificationStore.addNotification({
      type: 'error',
      message: 'Failed to send change request',
      duration: 5000
    });
  }
};

// Handle save in admin context (direct save)
const handleAdminContextSave = async () => {
  if (!documentState.value || !reactiveDocument.value || !documentCopy.value) {
    console.warn('[DocumentSheetContainer] Cannot save - missing document state or copy');
    return;
  }
  
  try {
    // For admin mode, we can either:
    // 1. Use Immer patches with REST API (future enhancement)
    // 2. Use direct save with updated document copy (current approach)
    
    // Generate patches for logging/debugging purposes
    const patches = generateDocumentPatch(
      toRaw(reactiveDocument.value) as Record<string, unknown>,
      toRaw(documentCopy.value) as Record<string, unknown>,
      props.documentId || 'unknown'
    );
    
    console.log('[DocumentSheetContainer] Admin save patches generated:', patches);
    
    // For now, update the document state with the copy and save
    // Future: Could send patches to REST API for more efficient updates
    
    // Update the document state's document ref with our changes
    if (adminDocumentState.value?.document) {
      Object.assign(adminDocumentState.value.document.value, documentCopy.value);
      adminDocumentState.value.markAsChanged();
    }
    
    await documentState.value.save();
    
    editMode.value = false;
    
    notificationStore.addNotification({
      type: 'success',
      message: 'Changes saved successfully',
      duration: 3000
    });
  } catch (error) {
    console.error('[DocumentSheetContainer] Admin save failed:', error);
    notificationStore.addNotification({
      type: 'error',
      message: 'Failed to save changes',
      duration: 5000
    });
  }
};

// Generate human-readable summary of changes for GM approval
const generateChangesSummary = (operations: any[]): string => {
  const summaries: string[] = [];
  
  operations.forEach((op: any) => {
    // Convert JSON Pointer path to readable format
    const path = op.path.replace(/^\/documents\/[^\/]+\//, '').replace(/\//g, '.');
    
    switch (op.op) {
      case 'add':
        summaries.push(`${path}: added ${op.value}`);
        break;
      case 'remove':
        summaries.push(`${path}: removed`);
        break;
      case 'replace':
        summaries.push(`${path}: changed to ${op.value}`);
        break;
      case 'move':
        summaries.push(`${path}: moved from ${op.from}`);
        break;
      case 'copy':
        summaries.push(`${path}: copied from ${op.from}`);
        break;
      default:
        summaries.push(`${path}: ${op.op} operation`);
    }
  });
  
  return summaries.join(', ');
};

const handleCancel = () => {
  cancelChanges();
};

const handleRoll = (rollType: string, data: Record<string, unknown>) => {
  emit('roll', rollType, data);
};

const handleDragStart = (event: MouseEvent) => {
  emit('drag-start', event);
};

// Unified props interface - all document sheet components receive the same props
const getComponentProps = () => {
  console.log(`[DocumentSheetContainer] getComponentProps - docType: ${props.documentType}, context: ${context.value}`);
  
  // Unified props structure for all document types with copy management
  const componentProps = {
    document: reactiveDocument,          // Original document (for view mode)
    documentCopy: computed(() => documentCopy.value), // Editable copy (for edit mode)
    items: reactiveItems.value,
    editMode: editMode.value,
    hasUnsavedChanges: hasUnsavedChanges.value,
    readonly: props.readonly,
    // Methods for save/cancel functionality
    save: handleSave,
    cancel: cancelChanges,
    reset: resetDocumentCopy
  };
  
  console.log(`[DocumentSheetContainer] getComponentProps - Enhanced props:`, {
    document: reactiveDocument.value ? { id: reactiveDocument.value.id, name: reactiveDocument.value.name, type: reactiveDocument.value.documentType } : null,
    documentCopy: documentCopy.value ? { id: documentCopy.value.id, name: documentCopy.value.name } : null,
    items: reactiveItems.value?.value?.length || 0,
    editMode: editMode.value,
    hasUnsavedChanges: hasUnsavedChanges.value,
    readonly: props.readonly
  });
  
  return componentProps;
};

// Handle updates from document sheet components (unified for all document types)
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