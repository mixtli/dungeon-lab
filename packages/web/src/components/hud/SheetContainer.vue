<template>
  <div
    class="sheet-container"
    :class="{
      'sheet-mobile': context === 'mobile',
      'sheet-desktop': context === 'desktop'
    }"
  >
    <!-- Use existing DocumentSheetContainer for actual sheet rendering -->
    <DocumentSheetContainer
      :show="show"
      :document-id="document?.id || documentId"
      :document-type="document?.documentType || documentType"
      :context="mappedContext"
      @close="handleClose"
      @error="handleError"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import DocumentSheetContainer from '../common/DocumentSheetContainer.vue';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';

// Props
interface Props {
  /** Whether to show the sheet */
  show: boolean;

  /** Document object (preferred) */
  document?: BaseDocument;

  /** Document ID (fallback if document not provided) */
  documentId?: string;

  /** Document type (fallback if document not provided) */
  documentType?: string;

  /** Context for rendering (affects layout and behavior) */
  context: 'desktop' | 'mobile';
}

const props = withDefaults(defineProps<Props>(), {
  document: undefined,
  documentId: undefined,
  documentType: undefined
});

// Emits
const emit = defineEmits<{
  close: [];
  error: [error: Error];
}>();

// Map HUD context to document sheet context
const mappedContext = computed((): 'admin' | 'game' => {
  return props.context === 'desktop' ? 'admin' : 'game';
});

// Computed properties for validation
const hasValidDocument = computed(() => {
  return props.document || (props.documentId && props.documentType);
});

// Event handlers
function handleClose(): void {
  emit('close');
}

function handleError(error: Error): void {
  emit('error', error);
}

// Warn about missing required props
if (!hasValidDocument.value) {
  console.warn('[SheetContainer] Missing required document information. Provide either "document" or both "documentId" and "documentType".');
}
</script>

<style scoped>
.sheet-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sheet-mobile {
  /* Mobile sheets should fill the entire container */
  position: relative;
}

.sheet-desktop {
  /* Desktop sheets are handled by DocumentSheetContainer positioning */
  position: relative;
}

/* Ensure the document sheet container fills the space properly */
:deep(.document-sheet-container) {
  width: 100%;
  height: 100%;
}

/* Mobile-specific overrides */
.sheet-mobile :deep(.document-sheet-container) {
  /* Ensure mobile sheets don't have conflicting positioning */
  position: static !important;
}

/* Ensure proper scrolling on mobile */
.sheet-mobile :deep(.sheet-content) {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>