<template>
  <div class="coordinate-display">
    <div class="coordinate-row">
      <span class="coordinate-label">World:</span>
      <span class="coordinate-value">{{ formatPixelCoordinates(pixelCoordinates) }}</span>
    </div>
    <div class="coordinate-row">
      <span class="coordinate-label">Grid:</span>
      <span class="coordinate-value">{{ formatGridCoordinates(gridCoordinates) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Point } from '@dungeon-lab/shared/types/index.mjs';

// Props
defineProps<{
  pixelCoordinates: Point | null;
  gridCoordinates: Point | null;
}>();

// Format pixel coordinates to show integers
const formatPixelCoordinates = (coords: Point | null): string => {
  if (!coords) return '---';
  return `${Math.round(coords.x)}, ${Math.round(coords.y)}`;
};

// Format grid coordinates to show with 1 decimal place
const formatGridCoordinates = (coords: Point | null): string => {
  if (!coords) return '---';
  return `${coords.x.toFixed(1)}, ${coords.y.toFixed(1)}`;
};
</script>

<style scoped>
.coordinate-display {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.3;
  z-index: 1000;
  user-select: none;
  pointer-events: none;
  min-width: 120px;
}

.coordinate-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.coordinate-label {
  font-weight: bold;
  margin-right: 8px;
  color: #ccc;
}

.coordinate-value {
  color: #0ff;
  text-align: right;
  font-weight: bold;
}
</style> 