<template>
  <Teleport to="body">
    <div
      v-for="[sheetId, sheet] in documentSheetStore.floatingSheets"
      :key="sheetId"
      :ref="sheetId"
      :data-sheet-id="sheetId"
      class="floating-character-sheet"
      :class="{ 'is-dragging': isDragging && currentSheetId === sheetId }"
      :style="getSheetStyle(sheet)"
      @mousedown.self="documentSheetStore.bringToFront(sheetId)"
    >
      <!-- Fallback Framework Header (only shown if plugin doesn't emit events) -->
      <div v-if="showFallbackChrome" class="fallback-header" @mousedown="startDrag($event, sheetId)">
        <div class="window-title">
          <i class="mdi mdi-account title-icon"></i>
          <span>{{ sheet.document.name }}</span>
        </div>
        
        <div class="window-controls">
          <button class="control-button" title="Close" @click="documentSheetStore.closeDocumentSheet(sheetId)">
            <i class="mdi mdi-close"></i>
          </button>
        </div>
      </div>

      <!-- Window Content (no header - plugin provides its own) -->
      <div class="window-content">
        <CharacterSheetContainer
          :show="true"
          :character="sheet.document"
          :readonly="false"
          @close="documentSheetStore.closeDocumentSheet(sheetId)"
          @roll="handleRoll"
          @drag-start="(event) => handlePluginDragStart(event, sheetId)"
        />
      </div>

      <!-- Resize Handle -->
      <div 
        class="floating-window-resize-handle" 
        @mousedown="startResize($event, sheetId)"
        title="Drag to resize"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" class="resize-lines">
          <path d="M9 3L3 9M11 5L5 11M11 3L9 5" stroke="currentColor" stroke-width="1" opacity="0.5" />
        </svg>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onUnmounted, onMounted } from 'vue';
import { useDocumentSheetStore } from '../../stores/document-sheet.store.mjs';
import type { FloatingDocumentSheet } from '../../stores/document-sheet.store.mjs';
import CharacterSheetContainer from './CharacterSheetContainer.vue';

const documentSheetStore = useDocumentSheetStore();

// Drag and resize state
const isDragging = ref(false);
const isResizing = ref(false);
const currentSheetId = ref('');
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartPos = ref({ x: 0, y: 0 });
const resizeStartPos = ref({ x: 0, y: 0 });
const resizeStartSize = ref({ width: 0, height: 0 });

// Cache element reference and size for performance during drag
const dragElement = ref<HTMLElement | null>(null);
const dragElementSize = ref({ width: 0, height: 0 });

// Plugin event listeners cleanup functions
const eventCleanups = ref<Array<() => void>>([]);

// Fallback support - show framework chrome if plugin doesn't emit events
const showFallbackChrome = ref(false); // D&D components are self-contained with their own headers
const fallbackTimeout = ref<number | null>(null);

function getSheetStyle(sheet: FloatingDocumentSheet) {
  const style: Record<string, string | number> = {
    left: `${sheet.position.x}px`,
    top: `${sheet.position.y}px`,
    zIndex: sheet.zIndex,
  };
  
  // Only include size if user has manually resized (overriding CSS fit-content)
  if (sheet.size) {
    style.width = `${sheet.size.width}px`;
    style.height = `${sheet.size.height}px`;
  }
  
  return style;
}

// Drag functionality
function startDrag(event: MouseEvent, sheetId: string) {
  const sheet = documentSheetStore.floatingSheets.get(sheetId);
  if (!sheet) return;
  
  // Find the DOM element for this sheet
  const element = document.querySelector(`[data-sheet-id="${sheetId}"]`) as HTMLElement;
  if (!element) {
    console.warn('Could not find sheet element for drag:', sheetId);
    return;
  }
  
  // Find the actual plugin content inside for accurate sizing
  const pluginContent = element.querySelector('.plugin-container-wrapper') as HTMLElement;
  const sizeElement = pluginContent || element;
  
  // Cache element for positioning and get accurate content size
  dragElement.value = element;
  const rect = sizeElement.getBoundingClientRect();
  dragElementSize.value = { width: rect.width, height: rect.height };
  
  // Debug info removed - size issue was in store initialization, not measurement
  
  isDragging.value = true;
  currentSheetId.value = sheetId;
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
  dragStartPos.value = { ...sheet.position };
  
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
  document.body.style.cursor = 'grabbing';
  event.preventDefault();
}

function handleDrag(event: MouseEvent) {
  if (!isDragging.value || !currentSheetId.value || !dragElement.value) return;
  
  const deltaX = event.clientX - dragStartX.value;
  const deltaY = event.clientY - dragStartY.value;
  
  // Calculate new position with proper boundary constraints using cached size
  const maxX = window.innerWidth - dragElementSize.value.width;
  const maxY = window.innerHeight - dragElementSize.value.height;
  const targetX = dragStartPos.value.x + deltaX;
  const targetY = dragStartPos.value.y + deltaY;
  
  const newX = Math.max(0, Math.min(maxX, targetX));
  const newY = Math.max(0, Math.min(maxY, targetY));
  
  // Boundary calculations now working correctly with content-based sizing
  
  // Apply position directly to DOM for smooth 60fps performance
  dragElement.value.style.left = `${newX}px`;
  dragElement.value.style.top = `${newY}px`;
}

function stopDrag() {
  // Sync final position back to store if we have an element reference
  if (dragElement.value && currentSheetId.value) {
    const rect = dragElement.value.getBoundingClientRect();
    documentSheetStore.updatePosition(currentSheetId.value, rect.left, rect.top);
  }
  
  // Clean up drag state
  isDragging.value = false;
  currentSheetId.value = '';
  dragElement.value = null;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.body.style.cursor = '';
}

// Resize functionality
function startResize(event: MouseEvent, sheetId: string) {
  const sheet = documentSheetStore.floatingSheets.get(sheetId);
  if (!sheet) return;
  
  // Get current actual size from DOM element
  const element = document.querySelector(`[data-sheet-id="${sheetId}"]`) as HTMLElement;
  if (!element) return;
  
  const rect = element.getBoundingClientRect();
  const currentSize = { width: rect.width, height: rect.height };
  
  isResizing.value = true;
  currentSheetId.value = sheetId;
  resizeStartPos.value = { x: event.clientX, y: event.clientY };
  resizeStartSize.value = currentSize;
  
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  document.body.style.cursor = 'nw-resize';
  event.preventDefault();
  event.stopPropagation();
}

function handleResize(event: MouseEvent) {
  if (!isResizing.value || !currentSheetId.value) return;
  
  const deltaX = event.clientX - resizeStartPos.value.x;
  const deltaY = event.clientY - resizeStartPos.value.y;
  
  // Use reasonable minimums based on content, not arbitrary large values
  const newWidth = Math.max(300, resizeStartSize.value.width + deltaX);
  const newHeight = Math.max(200, resizeStartSize.value.height + deltaY);
  
  // Store size to override CSS fit-content during user resize
  documentSheetStore.updateSize(currentSheetId.value, newWidth, newHeight);
}

function stopResize() {
  isResizing.value = false;
  currentSheetId.value = '';
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
}

// Character sheet event handlers

function handleRoll(rollType: string, data: Record<string, unknown>) {
  console.log('Roll:', rollType, data);
  // TODO: Integrate with dice rolling system
}

// Handle drag start events from plugin components
function handlePluginDragStart(event: MouseEvent, sheetId: string) {
  // Forward plugin drag events to the existing drag system
  startDrag(event, sheetId);
}

// Setup plugin event listeners
onMounted(() => {
  setupPluginEventListeners();
  
  // Skip fallback chrome timeout - D&D components are self-contained
  // Plugin components should manage their own UI and don't need framework chrome
  
  // No size updates needed - CSS fit-content handles sizing automatically
});

// Cleanup on unmount
onUnmounted(() => {
  if (isDragging.value) stopDrag();
  if (isResizing.value) stopResize();
  
  // Clean up plugin event listeners
  eventCleanups.value.forEach(cleanup => cleanup());
  eventCleanups.value = [];
  
  // Clean up fallback timeout
  if (fallbackTimeout.value) {
    clearTimeout(fallbackTimeout.value);
    fallbackTimeout.value = null;
  }
});

// Setup event listeners for plugin window events
function setupPluginEventListeners() {
  // TODO: Implement plugin event handling when needed
  // For now, use fallback chrome for all window management
}

// Content sizing now handled by CSS fit-content - no manual updates needed
</script>

<style scoped>
.floating-character-sheet {
  position: fixed;
  display: flex;
  flex-direction: column;
  width: fit-content;
  height: fit-content;
  min-width: 400px;
  max-width: 90vw;
  min-height: 300px;
  max-height: 90vh;
  overflow: hidden;
  transition: all 0.2s ease;
}

/* Disable transitions during drag for smooth performance */
.floating-character-sheet.is-dragging {
  transition: none !important;
}

/* Fallback Framework Header */
.fallback-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px 8px 0 0;
  cursor: grab;
  user-select: none;
}

.fallback-header:active {
  cursor: grabbing;
}

.window-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.title-icon {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
}

.window-controls {
  display: flex;
  gap: 4px;
}

.control-button {
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.control-button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.window-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: fit-content;
  height: fit-content;
}

/* Resize Handle */
.floating-window-resize-handle {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: nw-resize;
  z-index: 100;
  color: rgba(255, 255, 255, 0.3);
  transition: all 0.2s ease;
  border-radius: 0 0 6px 0;
}

.floating-window-resize-handle:hover {
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.05);
}

.floating-window-resize-handle:active {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.1);
}

.resize-lines {
  pointer-events: none;
}

/* Animation for opening */
@keyframes windowFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.floating-character-sheet {
  animation: windowFadeIn 0.2s ease-out;
}
</style>