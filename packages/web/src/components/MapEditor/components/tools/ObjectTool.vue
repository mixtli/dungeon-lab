<template>
  <div>
    <!-- Object Tool - This component doesn't need UI as it's functionality-focused -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineExpose } from 'vue';
import type { Point, ObjectEditorObject, GridConfig } from '../../../../../../shared/src/types/mapEditor.mjs';
import { useGridSystem } from '../../composables/useGridSystem.mjs';
import { v4 as uuidv4 } from 'uuid';

// Props
const props = defineProps<{
  gridConfig: GridConfig;
  isActive: boolean;
}>();

// Emits
const emit = defineEmits<{
  (e: 'object-created', object: ObjectEditorObject): void;
}>();

// Drawing state
const currentPoints = ref<number[]>([]);
const isDrawing = ref(false);
const multiPointMode = ref(false);
const isCurrentlyActive = computed(() => props.isActive);

// Use grid system for snapping
const gridSystem = useGridSystem(props.gridConfig);

// Methods
const startDrawing = (pos: Point) => {
  console.log('ObjectTool.startDrawing called with pos:', pos);
  console.log('isActive:', isCurrentlyActive.value);
  
  if (!isCurrentlyActive.value) return;
  
  const pointToUse = props.gridConfig.snap ? gridSystem.snapToGrid(pos) : pos;
  console.log('Point to use (snapped or raw):', pointToUse);
  
  // Ensure position values are valid numbers
  const x = typeof pointToUse.x === 'number' && !isNaN(pointToUse.x) ? pointToUse.x : 0;
  const y = typeof pointToUse.y === 'number' && !isNaN(pointToUse.y) ? pointToUse.y : 0;
  
  console.log('Valid coordinates:', { x, y });
  
  if (!isDrawing.value) {
    // Start new polygon with the first point
    console.log('Starting new polygon');
    currentPoints.value = [x, y];
    isDrawing.value = true;
    multiPointMode.value = true;
  }
};

const addPoint = (pos: Point) => {
  if (!isCurrentlyActive.value || !isDrawing.value) return;
  
  const pointToUse = props.gridConfig.snap ? gridSystem.snapToGrid(pos) : pos;
  
  const x = typeof pointToUse.x === 'number' && !isNaN(pointToUse.x) ? pointToUse.x : 0;
  const y = typeof pointToUse.y === 'number' && !isNaN(pointToUse.y) ? pointToUse.y : 0;
  
  console.log('Adding point:', { x, y });
  
  // Simply add the new point to the array
  currentPoints.value.push(x, y);
};

const finishDrawing = () => {
  console.log('ObjectTool.finishDrawing called');
  console.log('Current points:', currentPoints.value);
  
  if (!isCurrentlyActive.value || !isDrawing.value || currentPoints.value.length < 6) {
    console.log('Not finishing - invalid state or too few points');
    return;
  }
  
  // Calculate center of mass for position
  let centerX = 0, centerY = 0;
  const numPoints = currentPoints.value.length / 2;
  
  for (let i = 0; i < currentPoints.value.length; i += 2) {
    centerX += currentPoints.value[i];
    centerY += currentPoints.value[i + 1];
  }
  
  const position = {
    x: centerX / numPoints,
    y: centerY / numPoints
  };
  
  // Make all points relative to the center position
  const relativePoints: number[] = [];
  for (let i = 0; i < currentPoints.value.length; i += 2) {
    relativePoints.push(
      currentPoints.value[i] - position.x,
      currentPoints.value[i + 1] - position.y
    );
  }
  
  const object: ObjectEditorObject = {
    id: uuidv4(),
    objectType: 'object',
    position,
    rotation: 0,
    points: relativePoints,
    shapeType: 'polygon',
    type: 'other',
    fill: 'rgba(0, 0, 0, 0)', // Transparent by default
    stroke: '#666666',
    strokeWidth: 2,
    blocking: {
      movement: true,
      sight: false,
      light: false
    }
  };
  
  console.log('Emitting object-created event with object:', object);
  emit('object-created', object);
  
  // Reset state
  currentPoints.value = [];
  isDrawing.value = false;
  multiPointMode.value = false;
};

const cancelDrawing = () => {
  console.log('ObjectTool.cancelDrawing called');
  currentPoints.value = [];
  isDrawing.value = false;
  multiPointMode.value = false;
};

const getCurrentPoints = () => {
  return currentPoints.value;
};

const getIsDrawing = () => {
  console.log('ObjectTool.getIsDrawing called, returning:', isDrawing.value);
  return isDrawing.value;
};

// Expose methods for parent component
defineExpose({
  startDrawing,
  addPoint,
  finishDrawing,
  cancelDrawing,
  getCurrentPoints,
  getIsDrawing
});
</script>