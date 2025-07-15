<template>
  <div
    v-if="floatingWindow.window && floatingWindow.isVisible"
    class="floating-window"
    :style="windowStyle"
    @mousedown="floatingWindow.bringToFront"
  >
    <!-- Window Header -->
    <div class="window-header" @mousedown="startDrag">
      <div class="window-title">
        <i :class="`mdi ${tabIcon} title-icon`"></i>
        <span>{{ floatingWindow.window.value?.title || 'Window' }}</span>
      </div>
      
      <div class="window-controls">
        <button class="control-button" title="Dock to Sidebar" @click="floatingWindow.dock">
          <i class="mdi mdi-dock-window"></i>
        </button>
        <button 
          class="control-button" 
          :title="floatingWindow.isMinimized ? 'Restore' : 'Minimize'" 
          @click="toggleMinimize"
        >
          <!-- Debug: {{ floatingWindow.isMinimized }} -->
          <i :class="minimizeIcon"></i>
        </button>
        <button class="control-button" title="Close" @click="floatingWindow.close">
          <i class="mdi mdi-close"></i>
        </button>
      </div>
    </div>

    <!-- Window Content -->
    <div v-if="!floatingWindow.isMinimized" class="window-content">
      <!-- Chat Tab -->
      <ChatTab v-if="floatingWindow.window.value?.tabType === 'chat'" />
      
      <!-- Combat Tab -->
      <CombatTab v-else-if="floatingWindow.window.value?.tabType === 'combat'" />
      
      <!-- Actors Tab -->
      <ActorsTab v-else-if="floatingWindow.window.value?.tabType === 'actors'" />
      
      <!-- Items Tab -->
      <ItemsTab v-else-if="floatingWindow.window.value?.tabType === 'items'" />
    </div>

    <!-- Resize Handle -->
    <div 
      v-if="!floatingWindow.isMinimized"
      class="floating-window-resize-handle" 
      @mousedown="startResize"
      title="Drag to resize"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" class="resize-lines">
        <path d="M9 3L3 9M11 5L5 11M11 3L9 5" stroke="currentColor" stroke-width="1" opacity="0.5" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useFloatingWindow } from '../../composables/useHUD.mjs';
import { useHUDStore } from '../../stores/hudStore.mjs';
import ChatTab from './tabs/ChatTab.vue';
import CombatTab from './tabs/CombatTab.vue';
import ActorsTab from './tabs/ActorsTab.vue';
import ItemsTab from './tabs/ItemsTab.vue';

interface Props {
  windowId: string;
}

const props = defineProps<Props>();

const hudStore = useHUDStore();
const floatingWindow = useFloatingWindow(props.windowId);

// Debug: log initial state
console.log('FloatingWindow mounted for windowId:', props.windowId);
console.log('Initial window state:', floatingWindow.window.value);
console.log('Initial isMinimized:', floatingWindow.isMinimized.value);

// Computed properties
const windowStyle = computed(() => {
  if (!floatingWindow.window.value) return {};
  
  const window = floatingWindow.window.value;
  return {
    left: `${window.position.x}px`,
    top: `${window.position.y}px`,
    width: `${window.size.width}px`,
    height: floatingWindow.isMinimized.value ? '48px' : `${window.size.height}px`,
    zIndex: window.zIndex,
    backgroundColor: hudStore.configuration.theme.sidebarBackground,
    borderRadius: `${hudStore.configuration.theme.borderRadius}px`,
  };
});

const tabIcon = computed(() => {
  if (!floatingWindow.window.value) return '';
  const tabType = floatingWindow.window.value.tabType;
  return hudStore.sidebar.tabs[tabType]?.icon || 'mdi-window';
});

// Debug computed for minimize icon
const minimizeIcon = computed(() => {
  const isMin = floatingWindow.isMinimized.value;
  console.log('Computing minimize icon - isMinimized:', isMin);
  return isMin ? 'mdi mdi-window-restore' : 'mdi mdi-minus';
});

// Drag functionality
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartPos = ref({ x: 0, y: 0 });

function startDrag(event: MouseEvent): void {
  if (!floatingWindow.window.value?.draggable) return;
  
  isDragging.value = true;
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
  dragStartPos.value = { ...floatingWindow.window.value.position };
  
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
  document.body.style.cursor = 'grabbing';
  event.preventDefault();
}

function handleDrag(event: MouseEvent): void {
  if (!isDragging.value || !floatingWindow.window.value) return;
  
  const deltaX = event.clientX - dragStartX.value;
  const deltaY = event.clientY - dragStartY.value;
  
  const newX = Math.max(0, Math.min(window.innerWidth - floatingWindow.window.value.size.width, dragStartPos.value.x + deltaX));
  const newY = Math.max(0, Math.min(window.innerHeight - floatingWindow.window.value.size.height, dragStartPos.value.y + deltaY));
  
  floatingWindow.updatePosition(newX, newY);
}

function stopDrag(): void {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.body.style.cursor = '';
}

// Resize functionality - simplified
const isResizing = ref(false);
const resizeStartPos = ref({ x: 0, y: 0 });
const resizeStartSize = ref({ width: 0, height: 0 });

function startResize(event: MouseEvent): void {
  console.log('Starting resize...'); // Debug log
  if (!floatingWindow.window.value) return;
  
  isResizing.value = true;
  resizeStartPos.value = { x: event.clientX, y: event.clientY };
  resizeStartSize.value = { ...floatingWindow.window.value.size };
  
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  
  document.body.style.cursor = 'nw-resize';
  event.preventDefault();
  event.stopPropagation();
}

function handleResize(event: MouseEvent): void {
  if (!isResizing.value || !floatingWindow.window.value) return;
  
  const deltaX = event.clientX - resizeStartPos.value.x;
  const deltaY = event.clientY - resizeStartPos.value.y;
  
  const newWidth = Math.max(250, resizeStartSize.value.width + deltaX);
  const newHeight = Math.max(200, resizeStartSize.value.height + deltaY);
  
  floatingWindow.updateSize(newWidth, newHeight);
}

function stopResize(): void {
  console.log('Stopping resize...'); // Debug log
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
}

function toggleMinimize(): void {
  console.log('Before toggle - isMinimized:', floatingWindow.isMinimized.value);
  console.log('Before toggle - window.minimized:', floatingWindow.window.value?.minimized);
  floatingWindow.toggleMinimized();
  console.log('After toggle - isMinimized:', floatingWindow.isMinimized.value);
  console.log('After toggle - window.minimized:', floatingWindow.window.value?.minimized);
}
</script>

<style scoped>
.floating-window {
  position: fixed;
  background: rgba(26, 26, 26, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  min-width: 250px;
  min-height: 48px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.window-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px 8px 0 0;
  cursor: grab;
  user-select: none;
}

.window-header:active {
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
}

/* Resize Handles: increase hit area, z-index, and add hover for visibility */
.resize-handle {
  position: absolute;
  background: transparent;
  z-index: 10;
  transition: background-color 0.2s ease;
}
.resize-handle:hover {
  background: rgba(59, 130, 246, 0.3);
  outline: 1px solid #3b82f6;
}
/* Edges */
.resize-n {
  top: 0;
  left: 12px;
  right: 12px;
  height: 8px;
  cursor: ns-resize;
}
.resize-e {
  top: 12px;
  right: 0;
  bottom: 12px;
  width: 8px;
  cursor: ew-resize;
}
.resize-s {
  bottom: 0;
  left: 12px;
  right: 12px;
  height: 8px;
  cursor: ns-resize;
}
.resize-w {
  top: 12px;
  left: 0;
  bottom: 12px;
  width: 8px;
  cursor: ew-resize;
}
/* Corners */
.resize-ne {
  top: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: nesw-resize;
}
.resize-sw {
  bottom: 0;
  left: 0;
  width: 16px;
  height: 16px;
  cursor: nesw-resize;
}
.resize-nw {
  top: 0;
  left: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
}
/* Comment: Handles have a larger hit area for usability, but remain mostly transparent except on hover. */

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

.floating-window {
  animation: windowFadeIn 0.2s ease-out;
}

/* Subtle resize handle like the example */
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
</style>
