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

          <template v-else-if="selectedObject?.objectType === 'portal'">
            <div class="property-group">
              <h4 class="group-title">Portal Properties</h4>
              <div class="property-row">
                <label class="property-label">State:</label>
                <select 
                  class="property-input select-input"
                  :value="(selectedObject as PortalObject).closed ? 'closed' : 'open'"
                  @change="updateProperty('closed', ($event.target as HTMLSelectElement).value === 'closed')"
                >
                  <option value="closed">Closed</option>
                  <option value="open">Open</option>
                </select>
              </div>
              <div class="property-row">
                <label class="property-label">Color:</label>
                <input 
                  type="color" 
                  class="property-input color-input"
                  :value="(selectedObject as PortalObject).fill || '#00ff00'"
                  @change="updateProperty('fill', ($event.target as HTMLInputElement).value)" 
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

          <!-- Position properties (common to all objects) -->
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
  PortalObject, 
  LightObject, 
  MapEditorObject 
} from '@dungeon-lab/shared/types/index.mjs';

interface Props {
  selectedObjects: MapEditorObject[];
  gridSize?: number;
  visible?: boolean;
}

interface Emits {
  (e: 'property-updated', objectId: string, property: string, value: any): void;
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
    portal: 'Portal/Door',
    light: 'Light Source',
    objectWall: 'Object Wall'
  };
  
  return typeLabels[selectedObject.value.objectType] || selectedObject.value.objectType;
});

// Position helpers for different object types
function getObjectX(object: MapEditorObject | null): number {
  if (!object) return 0;
  
  // Lights and portals store position in position.x/y
  if (object.objectType === 'light' || object.objectType === 'portal') {
    return (object as any).position?.x || 0;
  }
  
  // Walls might store position differently or have points array
  return (object as any).x || 0;
}

function getObjectY(object: MapEditorObject | null): number {
  if (!object) return 0;
  
  // Lights and portals store position in position.x/y  
  if (object.objectType === 'light' || object.objectType === 'portal') {
    return (object as any).position?.y || 0;
  }
  
  // Walls might store position differently or have points array
  return (object as any).y || 0;
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