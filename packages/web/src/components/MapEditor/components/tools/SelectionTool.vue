<template>
  <div>
    <!-- Selection Tool Instructions -->
    <div class="selection-tool-help" v-if="isActive">
      <h4 class="sr-only">Selection Tool Usage</h4>
      <ul class="sr-only">
        <li>Click on a wall or portal to select it</li>
        <li>Click on a vertex (shown as a blue circle) when a wall is selected to select it</li>
        <li>Drag a vertex to move it</li>
        <li>Hold Shift and click a vertex to delete the segment after it</li>
        <li>Press Delete to remove selected objects or segments</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { Point } from '../../../../../../shared/src/types/mapEditor.mts';

// Props
const props = defineProps<{
  isActive: boolean;
}>();

// Emits
const emit = defineEmits<{
  (e: 'selection-started', pos: Point): void;
  (e: 'selection-ended', rect: { start: Point; end: Point }): void;
  (e: 'selection-moved', rect: { start: Point; end: Point }): void;
  (e: 'vertex-selected', objectId: string, vertexIndex: number): void;
  (e: 'vertex-moved', objectId: string, vertexIndex: number, newPos: Point): void;
  (e: 'object-deleted', objectIds: string[]): void;
  (e: 'segment-deleted', objectId: string, startIndex: number, endIndex: number): void;
}>();

// Selection state
const isSelecting = ref(false);
const selectionRect = ref<{ start: Point; end: Point } | null>(null);
const dragStartPosition = ref<Point | null>(null);

// Vertex selection state
const selectedVertexInfo = ref<{ objectId: string; vertexIndex: number } | null>(null);
const isVertexMode = ref(false);

// Methods for area selection
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

// Methods for vertex manipulation
const selectVertex = (objectId: string, vertexIndex: number) => {
  if (!props.isActive) return;
  
  selectedVertexInfo.value = { objectId, vertexIndex };
  isVertexMode.value = true;
  emit('vertex-selected', objectId, vertexIndex);
};

const moveVertex = (objectId: string, vertexIndex: number, newPos: Point) => {
  if (!props.isActive || !isVertexMode.value) return;
  
  emit('vertex-moved', objectId, vertexIndex, newPos);
};

const endVertexMove = () => {
  isVertexMode.value = false;
  selectedVertexInfo.value = null;
};

// Delete handling
const deleteSelected = (objectIds: string[]) => {
  if (!props.isActive || objectIds.length === 0) return;
  
  emit('object-deleted', objectIds);
};

// Delete a segment between two points in a wall
const deleteSegment = (wallId: string, startIndex: number, endIndex: number) => {
  if (!props.isActive) return;
  
  emit('segment-deleted', wallId, startIndex, endIndex);
};

// Handle key events
const handleKeyDown = (e: KeyboardEvent) => {
  if (!props.isActive) return;
  
  // Handle Delete or Backspace key press to delete selected objects
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // If a vertex is selected, we might want to handle that specially
    // Otherwise, we emit delete event for parent to handle
    if (selectedVertexInfo.value) {
      // For vertices, we might want special handling
      // Here we'll just notify that a segment should be deleted
      emit('segment-deleted', selectedVertexInfo.value.objectId, 
            selectedVertexInfo.value.vertexIndex, 
            selectedVertexInfo.value.vertexIndex + 1);
      selectedVertexInfo.value = null;
    }
  }
  
  // Handle Escape key to cancel selection or vertex mode
  if (e.key === 'Escape') {
    if (isVertexMode.value) {
      endVertexMove();
    } else if (isSelecting.value) {
      cancelSelection();
    }
  }
};

// Set up and clean up key listeners
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

// Expose to parent component using getters for reactive properties
const publicAPI = {
  startSelection,
  updateSelection,
  endSelection,
  cancelSelection,
  selectVertex,
  moveVertex,
  endVertexMove,
  deleteSelected,
  deleteSegment,
  get isSelecting() { return isSelecting.value; },
  get selectionRect() { return selectionRect.value; },
  get dragStartPosition() { return dragStartPosition.value; },
  get isVertexMode() { return isVertexMode.value; },
  get selectedVertex() { return selectedVertexInfo.value; }
};

defineExpose(publicAPI);
</script> 