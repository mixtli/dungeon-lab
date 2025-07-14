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
        <i :class="tabIcon" class="title-icon"></i>
        <span>{{ floatingWindow.window.value?.title || 'Window' }}</span>
      </div>
      
      <div class="window-controls">
        <button class="control-button" title="Dock to Sidebar" @click="floatingWindow.dock">
          <i class="mdi mdi-dock-window"></i>
        </button>
        <button class="control-button" title="Minimize" @click="toggleMinimize">
          <i class="mdi mdi-window-minimize"></i>
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

    <!-- Resize Handles -->
    <template v-if="!floatingWindow.isMinimized && floatingWindow.window.value?.resizable">
      <div class="resize-handle resize-n" @mousedown="startResize('n')"></div>
      <div class="resize-handle resize-ne" @mousedown="startResize('ne')"></div>
      <div class="resize-handle resize-e" @mousedown="startResize('e')"></div>
      <div class="resize-handle resize-se" @mousedown="startResize('se')"></div>
      <div class="resize-handle resize-s" @mousedown="startResize('s')"></div>
      <div class="resize-handle resize-sw" @mousedown="startResize('sw')"></div>
      <div class="resize-handle resize-w" @mousedown="startResize('w')"></div>
      <div class="resize-handle resize-nw" @mousedown="startResize('nw')"></div>
    </template>
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

// Computed properties
const windowStyle = computed(() => {
  if (!floatingWindow.window.value) return {};
  
  const window = floatingWindow.window.value;
  return {
    left: `${window.position.x}px`,
    top: `${window.position.y}px`,
    width: window.minimized ? '250px' : `${window.size.width}px`,
    height: window.minimized ? '40px' : `${window.size.height}px`,
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

// Resize functionality
const isResizing = ref(false);
const resizeHandle = ref<string>('');
const resizeStartPos = ref({ x: 0, y: 0 });
const resizeStartSize = ref({ width: 0, height: 0 });
const resizeStartWindowPos = ref({ x: 0, y: 0 });

function startResize(handle: string): void {
  return;
  // TODO: Implement resize functionality
}

function handleResize(event: MouseEvent): void {
  if (!isResizing.value || !floatingWindow.window.value) return;
  
  const deltaX = event.clientX - resizeStartPos.value.x;
  const deltaY = event.clientY - resizeStartPos.value.y;
  
  let newWidth = resizeStartSize.value.width;
  let newHeight = resizeStartSize.value.height;
  let newX = resizeStartWindowPos.value.x;
  let newY = resizeStartWindowPos.value.y;
  
  // Handle different resize directions
  if (resizeHandle.value.includes('e')) {
    newWidth = Math.max(250, resizeStartSize.value.width + deltaX);
  }
  if (resizeHandle.value.includes('w')) {
    const widthChange = -deltaX;
    newWidth = Math.max(250, resizeStartSize.value.width + widthChange);
    newX = resizeStartWindowPos.value.x - widthChange;
  }
  if (resizeHandle.value.includes('s')) {
    newHeight = Math.max(200, resizeStartSize.value.height + deltaY);
  }
  if (resizeHandle.value.includes('n')) {
    const heightChange = -deltaY;
    newHeight = Math.max(200, resizeStartSize.value.height + heightChange);
    newY = resizeStartWindowPos.value.y - heightChange;
  }
  
  // Constrain to viewport
  newX = Math.max(0, Math.min(window.innerWidth - newWidth, newX));
  newY = Math.max(0, Math.min(window.innerHeight - newHeight, newY));
  
  floatingWindow.updateSize(newWidth, newHeight);
  floatingWindow.updatePosition(newX, newY);
}

function stopResize(): void {
  isResizing.value = false;
  resizeHandle.value = '';
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
}

function getResizeCursor(handle: string): string {
  const cursors: Record<string, string> = {
    'n': 'ns-resize',
    'ne': 'nesw-resize',
    'e': 'ew-resize',
    'se': 'nwse-resize',
    's': 'ns-resize',
    'sw': 'nesw-resize',
    'w': 'ew-resize',
    'nw': 'nwse-resize'
  };
  return cursors[handle] || 'default';
}

function toggleMinimize(): void {
  // TODO: Implement minimize functionality
  console.log('Toggle minimize');
}
</script>

<style scoped>
.floating-window {
  position: fixed;
  background: rgba(26, 26, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  min-width: 250px;
  min-height: 200px;
  transition: all 0.2s ease;
}

.window-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
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

/* Resize Handles */
.resize-handle {
  position: absolute;
  background: transparent;
  transition: background-color 0.2s ease;
}

.resize-handle:hover {
  background: rgba(59, 130, 246, 0.3);
}

.resize-n {
  top: 0;
  left: 8px;
  right: 8px;
  height: 4px;
  cursor: ns-resize;
}

.resize-ne {
  top: 0;
  right: 0;
  width: 8px;
  height: 8px;
  cursor: nesw-resize;
}

.resize-e {
  top: 8px;
  right: 0;
  bottom: 8px;
  width: 4px;
  cursor: ew-resize;
}

.resize-se {
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  cursor: nwse-resize;
}

.resize-s {
  bottom: 0;
  left: 8px;
  right: 8px;
  height: 4px;
  cursor: ns-resize;
}

.resize-sw {
  bottom: 0;
  left: 0;
  width: 8px;
  height: 8px;
  cursor: nesw-resize;
}

.resize-w {
  top: 8px;
  left: 0;
  bottom: 8px;
  width: 4px;
  cursor: ew-resize;
}

.resize-nw {
  top: 0;
  left: 0;
  width: 8px;
  height: 8px;
  cursor: nwse-resize;
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

.floating-window {
  animation: windowFadeIn 0.2s ease-out;
}
</style>