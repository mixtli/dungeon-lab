<template>
  <div>
    <!-- Selection Tool - This component doesn't need UI as it's functionality-focused -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Point } from '../../../../../../shared/src/types/mapEditor.mjs';

// Props
const props = defineProps<{
  isActive: boolean;
}>();

// Emits
const emit = defineEmits<{
  (e: 'selection-started', pos: Point): void;
  (e: 'selection-ended', rect: { start: Point; end: Point }): void;
  (e: 'selection-moved', rect: { start: Point; end: Point }): void;
}>();

// Selection state
const isSelecting = ref(false);
const selectionRect = ref<{ start: Point; end: Point } | null>(null);
const dragStartPosition = ref<Point | null>(null);

// Methods
const startSelection = (pos: Point) => {
  if (!props.isActive) return;
  
  isSelecting.value = true;
  selectionRect.value = {
    start: { ...pos },
    end: { ...pos }
  };
  dragStartPosition.value = { ...pos };
  
  emit('selection-started', pos);
};

const updateSelection = (pos: Point) => {
  if (!isSelecting.value || !props.isActive || !selectionRect.value) return;
  
  selectionRect.value.end = { ...pos };
  
  emit('selection-moved', selectionRect.value);
};

const endSelection = () => {
  if (!isSelecting.value || !props.isActive || !selectionRect.value) return;
  
  // Only emit if the rectangle has some size
  const width = Math.abs(selectionRect.value.end.x - selectionRect.value.start.x);
  const height = Math.abs(selectionRect.value.end.y - selectionRect.value.start.y);
  
  if (width > 5 && height > 5) {
    emit('selection-ended', selectionRect.value);
  }
  
  isSelecting.value = false;
  dragStartPosition.value = null;
};

const cancelSelection = () => {
  isSelecting.value = false;
  selectionRect.value = null;
  dragStartPosition.value = null;
};

// Expose to parent component using getters for reactive properties
const publicAPI = {
  startSelection,
  updateSelection,
  endSelection,
  cancelSelection,
  get isSelecting() { return isSelecting.value; },
  get selectionRect() { return selectionRect.value; },
  get dragStartPosition() { return dragStartPosition.value; }
};

defineExpose(publicAPI);
</script> 