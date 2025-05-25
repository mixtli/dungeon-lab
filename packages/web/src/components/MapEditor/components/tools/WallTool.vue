<template>
  <div>
    <!-- Wall Tool - This component doesn't need UI as it's functionality-focused -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineExpose } from 'vue';
import type { Point, WallObject, GridConfig } from '../../../../../../shared/src/types/mapEditor.mjs';
import { useGridSystem } from '../../composables/useGridSystem.mjs';

// Props
const props = defineProps<{
  gridConfig: GridConfig;
  isActive: boolean;
  wallType?: 'regular' | 'object'; // Add prop to specify wall type
}>();

// Emits
const emit = defineEmits<{
  (e: 'wall-created', wall: WallObject): void;
}>();

// Drawing state
const currentPoints = ref<number[]>([]);
const isDrawing = ref(false);
const multiPointMode = ref(false);
const isCurrentlyActive = computed(() => props.isActive);

// Computed props with defaults
const currentWallType = computed(() => props.wallType || 'regular');

// Use grid system for snapping
const gridSystem = useGridSystem(props.gridConfig);

// Methods
const startDrawing = (pos: Point) => {
  console.log('WallTool.startDrawing called with pos:', pos);
  console.log('isActive:', isCurrentlyActive.value);
  console.log('wallType:', currentWallType.value);
  console.log('Snap enabled:', props.gridConfig.snap); // Log snap state
  
  if (!isCurrentlyActive.value) return;
  
  const pointToUse = props.gridConfig.snap ? gridSystem.snapToGrid(pos) : pos;
  console.log('Point to use (snapped or raw):', pointToUse);
  
  // Ensure position values are valid numbers
  const x = typeof pointToUse.x === 'number' && !isNaN(pointToUse.x) ? pointToUse.x : 0;
  const y = typeof pointToUse.y === 'number' && !isNaN(pointToUse.y) ? pointToUse.y : 0;
  
  // Start with two identical points - as we move, we'll update the second one
  currentPoints.value = [x, y];
  isDrawing.value = true;
  console.log('Drawing started, points:', currentPoints.value);
  console.log('isDrawing set to:', isDrawing.value);
};

const updateDrawing = (pos: Point) => {
  if (!isDrawing.value || !isCurrentlyActive.value) return;
  
  console.log('WallTool.updateDrawing called with pos:', pos);
  const pointToUse = props.gridConfig.snap ? gridSystem.snapToGrid(pos) : pos;
  const x = typeof pointToUse.x === 'number' && !isNaN(pointToUse.x) ? pointToUse.x : 0;
  const y = typeof pointToUse.y === 'number' && !isNaN(pointToUse.y) ? pointToUse.y : 0;
  
  // Create a copy of the current points array
  const updatedPoints = [...currentPoints.value];
  
  if (updatedPoints.length === 0) {
    // If empty, add the starting point twice (shouldn't happen, but just in case)
    updatedPoints.push(x, y, x, y);
  } else if (updatedPoints.length === 2) {
    // If we only have a starting point, add the end point
    updatedPoints.push(x, y);
  } else {
    // Update the last point's position with mouse coords
    // Ensure we update the last point without affecting previous points
    updatedPoints[updatedPoints.length - 2] = x;
    updatedPoints[updatedPoints.length - 1] = y;
  }
  
  // Update the current points for rendering
  currentPoints.value = updatedPoints;
  console.log('Updated drawing points:', currentPoints.value);
};

const extendDrawing = (pos: Point) => {
  if (!isDrawing.value || !isCurrentlyActive.value) return;
  
  console.log('WallTool.extendDrawing called with pos:', pos);
  const pointToUse = props.gridConfig.snap ? gridSystem.snapToGrid(pos) : pos;
  const x = typeof pointToUse.x === 'number' && !isNaN(pointToUse.x) ? pointToUse.x : 0;
  const y = typeof pointToUse.y === 'number' && !isNaN(pointToUse.y) ? pointToUse.y : 0;
  
  // Add the new point to our wall
  currentPoints.value.push(x, y);
  console.log('Wall extended, current points:', currentPoints.value);
  
  // Enter multi-point mode if not already in it
  if (!multiPointMode.value) {
    multiPointMode.value = true;
    console.log('Entering multi-point mode');
  }
};

const endDrawing = () => {
  if (!isDrawing.value || !isCurrentlyActive.value) return;
  
  console.log('WallTool.endDrawing called');
  
  // Only finish if we have at least 4 points (2 coordinate pairs)
  if (currentPoints.value.length >= 4) {
    // Get the ID prefix and stroke color based on wall type
    const idPrefix = currentWallType.value === 'object' ? 'object-wall' : 'wall';
    const strokeColor = currentWallType.value === 'object' ? '#3399ff' : '#ff3333';
    
    // Create the wall object
    const newWall: WallObject = {
      id: `${idPrefix}-${Date.now()}`,
      objectType: 'wall',
      points: [...currentPoints.value], // Clone points array
      stroke: strokeColor,
      strokeWidth: 3,
      visible: true
    };
    
    console.log('Wall created:', newWall);
    
    // Emit the wall created event
    emit('wall-created', newWall);
  } else {
    console.warn('Not enough points to create a wall');
  }
  
  // Reset state
  isDrawing.value = false;
  currentPoints.value = [];
  multiPointMode.value = false;
  console.log('Drawing ended, state reset');
};

const cancelDrawing = () => {
  isDrawing.value = false;
  currentPoints.value = [];
  multiPointMode.value = false;
  console.log('Drawing cancelled, state reset');
};

const toggleMultiPointMode = () => {
  multiPointMode.value = !multiPointMode.value;
  console.log('Multi-point mode toggled to:', multiPointMode.value);
};

// Expose the methods for parent components to use
defineExpose({
  startDrawing,
  updateDrawing,
  extendDrawing,
  endDrawing,
  cancelDrawing,
  toggleMultiPointMode,
  // Expose reactive properties for monitoring
  isDrawing,
  currentPoints,
  multiPointMode
});
</script> 