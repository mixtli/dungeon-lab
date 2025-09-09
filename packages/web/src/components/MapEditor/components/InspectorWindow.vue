<template>
  <FloatingWindow
    v-if="visible && selectedObjects.length > 0"
    title="Inspector"
    :initial-x="windowState.x"
    :initial-y="windowState.y"
    :initial-width="windowState.width"
    :initial-height="windowState.height"
    :min-width="280"
    :min-height="200"
    :z-index="2000"
    @close="handleClose"
    @move="handleMove"
    @resize="handleResize"
  >
    <div class="inspector-content">
      <template v-if="selectedObjects.length === 1">
        <!-- Single object selected -->
        <div class="object-properties">
          <!-- Common properties -->
          <div class="property-group">
            <h4 class="group-title">General</h4>
            <div class="property-row">
              <label class="property-label">ID:</label>
              <span class="property-value">{{ selectedObject?.id }}</span>
            </div>
            <div class="property-row">
              <label class="property-label">Type:</label>
              <span class="property-value">{{ objectTypeLabel }}</span>
            </div>
          </div>

          <!-- Type-specific properties -->
          <template v-if="selectedObject?.objectType === 'wall'">
            <div class="property-group">
              <h4 class="group-title">Wall Properties</h4>
              <div class="property-row">
                <label class="property-label">Color:</label>
                <input 
                  type="color" 
                  class="property-input color-input"
                  :value="(selectedObject as WallObject).stroke || '#ff3333'"
                  @change="updateProperty('stroke', ($event.target as HTMLInputElement).value)" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Width:</label>
                <input 
                  type="number" 
                  class="property-input number-input"
                  :value="(selectedObject as WallObject).strokeWidth || 3" 
                  min="1" max="10"
                  @change="updateProperty('strokeWidth', parseInt(($event.target as HTMLInputElement).value))" 
                />
              </div>
            </div>
          </template>

          <template v-else-if="selectedObject?.objectType === 'door'">
            <div class="property-group">
              <h4 class="group-title">Door Geometry</h4>
              <div class="property-row">
                <label class="property-label">Start X:</label>
                <input 
                  type="number" 
                  class="property-input number-input"
                  :value="Math.round((selectedObject as DoorObject).coords[0] || 0)"
                  step="1"
                  @change="updateDoorCoord(0, parseInt(($event.target as HTMLInputElement).value))" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Start Y:</label>
                <input 
                  type="number" 
                  class="property-input number-input"
                  :value="Math.round((selectedObject as DoorObject).coords[1] || 0)"
                  step="1"
                  @change="updateDoorCoord(1, parseInt(($event.target as HTMLInputElement).value))" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">End X:</label>
                <input 
                  type="number" 
                  class="property-input number-input"
                  :value="Math.round((selectedObject as DoorObject).coords[2] || 0)"
                  step="1"
                  @change="updateDoorCoord(2, parseInt(($event.target as HTMLInputElement).value))" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">End Y:</label>
                <input 
                  type="number" 
                  class="property-input number-input"
                  :value="Math.round((selectedObject as DoorObject).coords[3] || 0)"
                  step="1"
                  @change="updateDoorCoord(3, parseInt(($event.target as HTMLInputElement).value))" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Length:</label>
                <span class="property-value">
                  {{ Math.round(getDoorLength(selectedObject as DoorObject)) }}
                </span>
              </div>
            </div>

            <div class="property-group">
              <h4 class="group-title">Door Properties</h4>
              <div class="property-row">
                <label class="property-label">State:</label>
                <select 
                  class="property-input select-input"
                  :value="(selectedObject as DoorObject).state || 'closed'"
                  @change="updateProperty('state', ($event.target as HTMLSelectElement).value)"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="locked">Locked</option>
                  <option value="stuck">Stuck</option>
                </select>
              </div>
              <div class="property-row">
                <label class="property-label">Material:</label>
                <select 
                  class="property-input select-input"
                  :value="(selectedObject as DoorObject).material || 'wood'"
                  @change="updateProperty('material', ($event.target as HTMLSelectElement).value)"
                >
                  <option value="wood">Wood</option>
                  <option value="metal">Metal</option>
                  <option value="stone">Stone</option>
                  <option value="glass">Glass</option>
                  <option value="magic">Magic</option>
                  <option value="force">Force</option>
                </select>
              </div>
              <div class="property-row">
                <label class="property-label">Color:</label>
                <input 
                  type="color" 
                  class="property-input color-input"
                  :value="(selectedObject as DoorObject).stroke || '#8B4513'"
                  @change="updateProperty('stroke', ($event.target as HTMLInputElement).value)" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Width:</label>
                <input 
                  type="number" 
                  class="property-input number-input"
                  :value="(selectedObject as DoorObject).strokeWidth || 3" 
                  min="1" max="20"
                  @change="updateProperty('strokeWidth', parseInt(($event.target as HTMLInputElement).value))" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Requires Key:</label>
                <input 
                  type="checkbox" 
                  class="property-input checkbox-input"
                  :checked="(selectedObject as DoorObject).requiresKey || false"
                  @change="updateProperty('requiresKey', ($event.target as HTMLInputElement).checked)" 
                />
              </div>
            </div>
          </template>

          <template v-else-if="selectedObject?.objectType === 'light'">
            <div class="property-group">
              <h4 class="group-title">Light Properties</h4>
              <div class="property-row">
                <label class="property-label">Color:</label>
                <input 
                  type="color" 
                  class="property-input color-input"
                  :value="(selectedObject as LightObject).color || '#ffffff'"
                  @change="updateProperty('color', ($event.target as HTMLInputElement).value)" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Bright Radius:</label>
                <input 
                  type="number" 
                  class="property-input number-input"
                  :value="(selectedObject as LightObject).brightRadius || 30" 
                  min="0" max="200" step="5"
                  @change="updateProperty('brightRadius', parseInt(($event.target as HTMLInputElement).value))" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Dim Radius:</label>
                <input 
                  type="number" 
                  class="property-input number-input"
                  :value="(selectedObject as LightObject).dimRadius || 60" 
                  min="0" max="400" step="5"
                  @change="updateProperty('dimRadius', parseInt(($event.target as HTMLInputElement).value))" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Intensity:</label>
                <input 
                  type="range" 
                  class="property-input range-input"
                  :value="(selectedObject as LightObject).intensity || 1" 
                  min="0" max="1" step="0.1"
                  @change="updateProperty('intensity', parseFloat(($event.target as HTMLInputElement).value))" 
                />
                <span class="range-value">{{ ((selectedObject as LightObject).intensity || 1).toFixed(1) }}</span>
              </div>
              <div class="property-row">
                <label class="property-label">Shadows:</label>
                <input 
                  type="checkbox" 
                  class="property-input"
                  :checked="(selectedObject as LightObject).shadows || true"
                  @change="updateProperty('shadows', ($event.target as HTMLInputElement).checked)" 
                />
              </div>
            </div>
          </template>

          <template v-else-if="selectedObject?.objectType === 'object'">
            <div class="property-group">
              <h4 class="group-title">Object Properties</h4>
              <div class="property-row">
                <label class="property-label">Type:</label>
                <select 
                  class="property-input select-input"
                  :value="(selectedObject as ObjectEditorObject).type || 'other'"
                  @change="updateProperty('type', ($event.target as HTMLSelectElement).value)"
                >
                  <option value="furniture">Furniture</option>
                  <option value="container">Container</option>
                  <option value="decoration">Decoration</option>
                  <option value="mechanism">Mechanism</option>
                  <option value="trap">Trap</option>
                  <option value="treasure">Treasure</option>
                  <option value="altar">Altar</option>
                  <option value="pillar">Pillar</option>
                  <option value="door">Door</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="property-row">
                <label class="property-label">Stroke Color:</label>
                <input 
                  type="color" 
                  class="property-input color-input"
                  :value="(selectedObject as ObjectEditorObject).stroke || '#666666'"
                  @change="updateProperty('stroke', ($event.target as HTMLInputElement).value)" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Stroke Width:</label>
                <input 
                  type="number" 
                  class="property-input number-input"
                  :value="(selectedObject as ObjectEditorObject).strokeWidth || 2" 
                  min="0" max="10" step="1"
                  @change="updateProperty('strokeWidth', parseInt(($event.target as HTMLInputElement).value))" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Fill Color:</label>
                <input 
                  type="color" 
                  class="property-input color-input"
                  :value="(selectedObject as ObjectEditorObject).fill || 'rgba(0, 0, 0, 0)'"
                  @change="updateProperty('fill', ($event.target as HTMLInputElement).value)" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Fill Opacity:</label>
                <input 
                  type="range" 
                  class="property-input range-input"
                  :value="getObjectFillOpacity(selectedObject as ObjectEditorObject)" 
                  min="0" max="1" step="0.1"
                  @change="updateObjectFillOpacity(parseFloat(($event.target as HTMLInputElement).value))" 
                />
                <span class="range-value">{{ getObjectFillOpacity(selectedObject as ObjectEditorObject).toFixed(1) }}</span>
              </div>
            </div>

            <div class="property-group">
              <h4 class="group-title">Blocking Properties</h4>
              <div class="property-row">
                <label class="property-label">Blocks Movement:</label>
                <input 
                  type="checkbox" 
                  class="property-input checkbox-input"
                  :checked="(selectedObject as ObjectEditorObject).blocking?.movement ?? true"
                  @change="updateBlockingProperty('movement', ($event.target as HTMLInputElement).checked)" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Blocks Sight:</label>
                <input 
                  type="checkbox" 
                  class="property-input checkbox-input"
                  :checked="(selectedObject as ObjectEditorObject).blocking?.sight ?? false"
                  @change="updateBlockingProperty('sight', ($event.target as HTMLInputElement).checked)" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Blocks Light:</label>
                <input 
                  type="checkbox" 
                  class="property-input checkbox-input"
                  :checked="(selectedObject as ObjectEditorObject).blocking?.light ?? false"
                  @change="updateBlockingProperty('light', ($event.target as HTMLInputElement).checked)" 
                />
              </div>
            </div>
          </template>

          <!-- Wall geometry (wall-specific) -->
          <template v-if="selectedObject?.objectType === 'wall'">
            <div class="property-group">
              <h4 class="group-title">Wall Geometry</h4>
              <div class="property-row">
                <label class="property-label">Start X:</label>
                <input 
                  type="number" 
                  class="property-input number-input"
                  :value="Math.round(getWallStartPoint(selectedObject as WallObject).x)"
                  step="1"
                  @change="updateWallPoint('start', 'x', parseInt(($event.target as HTMLInputElement).value))" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Start Y:</label>
                <input 
                  type="number" 
                  class="property-input number-input"
                  :value="Math.round(getWallStartPoint(selectedObject as WallObject).y)"
                  step="1"
                  @change="updateWallPoint('start', 'y', parseInt(($event.target as HTMLInputElement).value))" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">End X:</label>
                <input 
                  type="number" 
                  class="property-input number-input"
                  :value="Math.round(getWallEndPoint(selectedObject as WallObject).x)"
                  step="1"
                  @change="updateWallPoint('end', 'x', parseInt(($event.target as HTMLInputElement).value))" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">End Y:</label>
                <input 
                  type="number" 
                  class="property-input number-input"
                  :value="Math.round(getWallEndPoint(selectedObject as WallObject).y)"
                  step="1"
                  @change="updateWallPoint('end', 'y', parseInt(($event.target as HTMLInputElement).value))" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Length:</label>
                <span class="property-value">{{ Math.round(getWallLength(selectedObject as WallObject)) }} px</span>
              </div>
              <div class="property-row">
                <label class="property-label">Angle:</label>
                <span class="property-value">{{ Math.round(getWallAngle(selectedObject as WallObject)) }}°</span>
              </div>
            </div>
          </template>

          <!-- Position properties (for non-wall, non-portal objects) -->
          <template v-else-if="selectedObject?.objectType !== 'portal'">
            <div class="property-group">
              <h4 class="group-title">Position</h4>
              <div class="property-row">
                <label class="property-label">X:</label>
                <input 
                  type="number" 
                  class="property-input number-input"
                  :value="Math.round(getObjectX(selectedObject) || 0)"
                  step="1"
                  @change="updatePosition('x', parseInt(($event.target as HTMLInputElement).value))" 
                />
              </div>
              <div class="property-row">
                <label class="property-label">Y:</label>
                <input 
                  type="number" 
                  class="property-input number-input"
                  :value="Math.round(getObjectY(selectedObject) || 0)"
                  step="1"
                  @change="updatePosition('y', parseInt(($event.target as HTMLInputElement).value))" 
                />
              </div>
            </div>
          </template>
        </div>
      </template>

      <template v-else-if="selectedObjects.length > 1">
        <!-- Multiple objects selected -->
        <div class="multi-selection">
          <div class="property-group">
            <h4 class="group-title">Multiple Selection</h4>
            <div class="property-row">
              <label class="property-label">Objects:</label>
              <span class="property-value">{{ selectedObjects.length }} selected</span>
            </div>
          </div>

          <!-- Common bulk operations -->
          <div class="property-group">
            <h4 class="group-title">Bulk Actions</h4>
            <div class="action-buttons">
              <button class="action-button delete" @click="deleteSelected">Delete All</button>
              <button class="action-button duplicate" @click="duplicateSelected">Duplicate All</button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </FloatingWindow>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import FloatingWindow from '../../common/FloatingWindow.vue';
import type { 
  WallObject, 
  DoorObject, 
  LightObject, 
  AnyEditorObject,
  ObjectEditorObject 
} from '@dungeon-lab/shared/types/index.mjs';

interface Props {
  selectedObjects: AnyEditorObject[];
  gridSize?: number;
  visible?: boolean;
}

interface Emits {
  (e: 'property-updated', objectId: string, property: string, value: string | number | boolean | number[] | Record<string, unknown>): void;
  (e: 'position-updated', objectId: string, x: number, y: number): void;
  (e: 'delete-objects', objectIds: string[]): void;
  (e: 'duplicate-objects', objectIds: string[]): void;
  (e: 'close'): void;
}

const props = withDefaults(defineProps<Props>(), {
  gridSize: 50,
  visible: true
});

const emit = defineEmits<Emits>();

// Window state management
const windowState = ref({
  x: window.innerWidth - 350, // Position in top-right corner
  y: 60,
  width: 320,
  height: 450
});

// Load saved window state from localStorage
const savedState = localStorage.getItem('inspector-window-state');
if (savedState) {
  try {
    const parsed = JSON.parse(savedState);
    windowState.value = { ...windowState.value, ...parsed };
  } catch (e) {
    console.warn('Failed to parse saved inspector window state');
  }
}

// Single selected object
const selectedObject = computed(() => {
  return props.selectedObjects.length === 1 ? props.selectedObjects[0] : null;
});

// Object type label
const objectTypeLabel = computed(() => {
  if (!selectedObject.value) return '';
  
  const typeLabels: Record<string, string> = {
    wall: 'Wall',
    door: 'Door',
    light: 'Light Source',
    object: 'Object',
    terrain: 'Terrain',
    region: 'Region'
  };
  
  return typeLabels[selectedObject.value.objectType] || selectedObject.value.objectType;
});

// Position helpers for different object types
function getObjectX(object: AnyEditorObject | null): number {
  if (!object) return 0;
  
  // Lights store position in position.x/y
  if (object.objectType === 'light') {
    return (object as any).position?.x || 0;
  }
  
  // Doors store position in coords array [x1, y1, x2, y2]
  if (object.objectType === 'door') {
    return (object as any).coords?.[0] || 0;
  }
  
  // Walls might store position differently or have points array
  return (object as any).x || 0;
}

function getObjectY(object: AnyEditorObject | null): number {
  if (!object) return 0;
  
  // Lights and portals store position in position.x/y  
  if (object.objectType === 'light' || object.objectType === 'portal') {
    return (object as any).position?.y || 0;
  }
  
  // Walls might store position differently or have points array
  return (object as any).y || 0;
}

// Wall-specific geometry helpers
function getWallStartPoint(wall: WallObject): { x: number; y: number } {
  if (!wall.points || wall.points.length < 4) {
    return { x: 0, y: 0 };
  }
  return { x: wall.points[0], y: wall.points[1] };
}

function getWallEndPoint(wall: WallObject): { x: number; y: number } {
  if (!wall.points || wall.points.length < 4) {
    return { x: 0, y: 0 };
  }
  return { x: wall.points[2], y: wall.points[3] };
}

function getWallLength(wall: WallObject): number {
  const start = getWallStartPoint(wall);
  const end = getWallEndPoint(wall);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getWallAngle(wall: WallObject): number {
  const start = getWallStartPoint(wall);
  const end = getWallEndPoint(wall);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
}

// Door-specific geometry helpers
function getDoorLength(door: DoorObject): number {
  if (door.coords && door.coords.length >= 4) {
    const [x1, y1, x2, y2] = door.coords;
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
  return 0;
}

// Property updates
function updateProperty(property: string, value: any) {
  if (selectedObject.value) {
    emit('property-updated', selectedObject.value.id, property, value);
  }
}

function updatePosition(axis: 'x' | 'y', value: number) {
  if (selectedObject.value) {
    const currentX = getObjectX(selectedObject.value);
    const currentY = getObjectY(selectedObject.value);
    const newX = axis === 'x' ? value : currentX;
    const newY = axis === 'y' ? value : currentY;
    
    emit('position-updated', selectedObject.value.id, newX, newY);
  }
}

function updateWallPoint(point: 'start' | 'end', axis: 'x' | 'y', value: number) {
  if (selectedObject.value && selectedObject.value.objectType === 'wall') {
    const wall = selectedObject.value as WallObject;
    if (!wall.points || wall.points.length < 4) return;
    
    const newPoints = [...wall.points];
    
    if (point === 'start') {
      if (axis === 'x') {
        newPoints[0] = value; // Start X
      } else {
        newPoints[1] = value; // Start Y
      }
    } else { // point === 'end'
      if (axis === 'x') {
        newPoints[2] = value; // End X
      } else {
        newPoints[3] = value; // End Y
      }
    }
    
    emit('property-updated', wall.id, 'points', newPoints);
  }
}

function updateDoorCoord(coordIndex: number, value: number) {
  if (selectedObject.value && selectedObject.value.objectType === 'door') {
    const door = selectedObject.value as DoorObject;
    const newCoords = [...(door.coords || [0, 0, 0, 0])];
    
    // Ensure coords array has 4 elements [x1, y1, x2, y2]
    while (newCoords.length < 4) {
      newCoords.push(0);
    }
    
    newCoords[coordIndex] = value;
    emit('property-updated', door.id, 'coords', newCoords);
  }
}

// Bulk actions
function deleteSelected() {
  if (confirm(`Delete ${props.selectedObjects.length} selected objects?`)) {
    emit('delete-objects', props.selectedObjects.map(obj => obj.id));
  }
}

function duplicateSelected() {
  emit('duplicate-objects', props.selectedObjects.map(obj => obj.id));
}

// Window event handlers
function handleClose() {
  emit('close');
}

function handleMove(x: number, y: number) {
  windowState.value.x = x;
  windowState.value.y = y;
  saveWindowState();
}

function handleResize(width: number, height: number) {
  windowState.value.width = width;
  windowState.value.height = height;
  saveWindowState();
}

function saveWindowState() {
  localStorage.setItem('inspector-window-state', JSON.stringify(windowState.value));
}

// Object-specific helper functions
function getObjectFillOpacity(object: ObjectEditorObject): number {
  const fill = object.fill || 'rgba(0, 0, 0, 0)';
  // Parse RGBA values to get opacity
  if (fill.includes('rgba')) {
    const match = fill.match(/rgba\([^,]+,[^,]+,[^,]+,([^)]+)\)/);
    return match ? parseFloat(match[1]) : 0;
  } else if (fill.includes('rgb')) {
    return 1; // RGB without alpha is fully opaque
  } else {
    return 0; // Default transparent
  }
}

function updateObjectFillOpacity(opacity: number) {
  if (selectedObject.value && selectedObject.value.objectType === 'object') {
    const obj = selectedObject.value as ObjectEditorObject;
    const currentFill = obj.fill || 'rgba(0, 0, 0, 0)';
    
    // Extract RGB values and apply new opacity
    let newFill;
    if (currentFill.includes('rgba') || currentFill.includes('rgb')) {
      // Extract RGB values
      const rgbMatch = currentFill.match(/rgba?\(([^,]+),([^,]+),([^,]+)/);
      if (rgbMatch) {
        const r = rgbMatch[1].trim();
        const g = rgbMatch[2].trim();
        const b = rgbMatch[3].trim();
        newFill = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      } else {
        newFill = `rgba(0, 0, 0, ${opacity})`;
      }
    } else if (currentFill.startsWith('#')) {
      // Convert hex to rgba
      const hex = currentFill.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      newFill = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    } else {
      newFill = `rgba(0, 0, 0, ${opacity})`;
    }
    
    updateProperty('fill', newFill);
  }
}

function updateBlockingProperty(type: 'movement' | 'sight' | 'light', value: boolean) {
  if (selectedObject.value && selectedObject.value.objectType === 'object') {
    const obj = selectedObject.value as ObjectEditorObject;
    const currentBlocking = obj.blocking || { movement: true, sight: false, light: false };
    const newBlocking = { ...currentBlocking, [type]: value };
    updateProperty('blocking', newBlocking);
  }
}

// Show/hide window based on selection
watch(() => props.selectedObjects.length, (newLength) => {
  // Window visibility is controlled by parent component
  // This watcher can be used for side effects if needed
});
</script>

<style scoped>
.inspector-content {
  height: 100%;
  overflow-y: auto;
}

.object-properties,
.multi-selection {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.property-group {
  border: 1px solid var(--stone-300, #d6d3d1);
  border-radius: 6px;
  overflow: hidden;
}

@media (prefers-color-scheme: dark) {
  .property-group {
    border-color: var(--stone-600, #57534e);
  }
}

.group-title {
  background: var(--stone-100, #f5f5f4);
  padding: 8px 12px;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--stone-700, #44403c);
  border-bottom: 1px solid var(--stone-300, #d6d3d1);
}

@media (prefers-color-scheme: dark) {
  .group-title {
    background: var(--stone-700, #44403c);
    color: var(--stone-300, #d6d3d1);
    border-bottom-color: var(--stone-600, #57534e);
  }
}

.property-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--stone-200, #e7e5e4);
}

.property-row:last-child {
  border-bottom: none;
}

@media (prefers-color-scheme: dark) {
  .property-row {
    border-bottom-color: var(--stone-700, #44403c);
  }
}

.property-label {
  min-width: 50px;
  font-size: 12px;
  font-weight: 500;
  color: var(--stone-600, #57534e);
}

@media (prefers-color-scheme: dark) {
  .property-label {
    color: var(--stone-400, #a8a29e);
  }
}

.property-value {
  font-size: 12px;
  color: var(--stone-800, #292524);
  font-family: monospace;
}

@media (prefers-color-scheme: dark) {
  .property-value {
    color: var(--stone-200, #e7e5e4);
  }
}

.property-input {
  flex: 1;
  font-size: 12px;
  padding: 4px 6px;
  border: 1px solid var(--stone-300, #d6d3d1);
  border-radius: 4px;
  background: var(--stone-50, #fafaf9);
}

.property-input:focus {
  outline: none;
  border-color: var(--gold-400, #facc15);
  box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.2);
}

@media (prefers-color-scheme: dark) {
  .property-input {
    border-color: var(--stone-600, #57534e);
    background: var(--stone-800, #292524);
    color: var(--stone-200, #e7e5e4);
  }
  
  .property-input:focus {
    border-color: var(--gold-500, #eab308);
    box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.2);
  }
}

.color-input {
  width: 40px;
  height: 24px;
  padding: 2px;
  border-radius: 4px;
  cursor: pointer;
}

.number-input {
  width: 60px;
  text-align: center;
}

.select-input {
  cursor: pointer;
}

.checkbox-input {
  width: auto;
  flex: none;
  cursor: pointer;
}

.range-input {
  flex: 1;
}

.range-value {
  min-width: 24px;
  text-align: center;
  font-size: 11px;
  color: var(--stone-600, #57534e);
}

@media (prefers-color-scheme: dark) {
  .range-value {
    color: var(--stone-400, #a8a29e);
  }
}

.action-buttons {
  display: flex;
  gap: 8px;
  padding: 12px;
}

.action-button {
  flex: 1;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 500;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.action-button.delete {
  background: var(--red-500, #ef4444);
  color: white;
}

.action-button.delete:hover {
  background: var(--red-600, #dc2626);
}

.action-button.duplicate {
  background: var(--blue-500, #3b82f6);
  color: white;
}

.action-button.duplicate:hover {
  background: var(--blue-600, #2563eb);
}

@media (prefers-color-scheme: dark) {
  .action-button.delete {
    background: var(--red-600, #dc2626);
  }
  
  .action-button.delete:hover {
    background: var(--red-700, #b91c1c);
  }
  
  .action-button.duplicate {
    background: var(--blue-600, #2563eb);
  }
  
  .action-button.duplicate:hover {
    background: var(--blue-700, #1d4ed8);
  }
}
</style>