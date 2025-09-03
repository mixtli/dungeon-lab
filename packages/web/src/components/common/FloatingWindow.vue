<template>
  <div 
    v-if="visible"
    class="floating-window"
    :class="{ 'focused': focused }"
    :style="windowStyle"
    @mousedown="bringToFront"
  >
    <!-- Window Title Bar -->
    <div 
      class="window-titlebar"
      @mousedown="startDrag"
      @dblclick="toggleMaximize"
    >
      <div class="window-controls">
        <button 
          class="window-control close"
          @click="$emit('close')"
          title="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1" fill="none"/>
          </svg>
        </button>
        <button 
          class="window-control minimize"
          @click="minimize"
          title="Minimize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 6h8" stroke="currentColor" stroke-width="1" fill="none"/>
          </svg>
        </button>
        <button 
          class="window-control maximize"
          @click="toggleMaximize"
          title="Maximize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="2" y="2" width="8" height="8" stroke="currentColor" stroke-width="1" fill="none"/>
          </svg>
        </button>
      </div>
      <div class="window-title">{{ title }}</div>
      <div class="window-controls-spacer"></div>
    </div>

    <!-- Window Content -->
    <div class="window-content" ref="contentEl">
      <slot />
    </div>

    <!-- Resize Handles -->
    <div class="resize-handle resize-n" @mousedown="startResize('n')"></div>
    <div class="resize-handle resize-ne" @mousedown="startResize('ne')"></div>
    <div class="resize-handle resize-e" @mousedown="startResize('e')"></div>
    <div class="resize-handle resize-se" @mousedown="startResize('se')"></div>
    <div class="resize-handle resize-s" @mousedown="startResize('s')"></div>
    <div class="resize-handle resize-sw" @mousedown="startResize('sw')"></div>
    <div class="resize-handle resize-w" @mousedown="startResize('w')"></div>
    <div class="resize-handle resize-nw" @mousedown="startResize('nw')"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

interface Props {
  title: string;
  visible?: boolean;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  zIndex?: number;
}

interface Emits {
  (e: 'close'): void;
  (e: 'minimize'): void;
  (e: 'maximize'): void;
  (e: 'focus'): void;
  (e: 'blur'): void;
  (e: 'move', x: number, y: number): void;
  (e: 'resize', width: number, height: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  initialX: 100,
  initialY: 100,
  initialWidth: 320,
  initialHeight: 400,
  minWidth: 200,
  minHeight: 150,
  zIndex: 1000
});

const emit = defineEmits<Emits>();

// Window state
const x = ref(props.initialX);
const y = ref(props.initialY);
const width = ref(props.initialWidth);
const height = ref(props.initialHeight);
const focused = ref(false);
const maximized = ref(false);
const minimized = ref(false);

// Drag state
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartMouseX = ref(0);
const dragStartMouseY = ref(0);

// Resize state  
const isResizing = ref(false);
const resizeDirection = ref('');
const resizeStartX = ref(0);
const resizeStartY = ref(0);
const resizeStartWidth = ref(0);
const resizeStartHeight = ref(0);
const resizeStartMouseX = ref(0);
const resizeStartMouseY = ref(0);

// Saved state for maximize/restore
const savedX = ref(0);
const savedY = ref(0);
const savedWidth = ref(0);
const savedHeight = ref(0);

// Computed styles
const windowStyle = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
  width: `${width.value}px`,
  height: `${height.value}px`,
  zIndex: props.zIndex,
  display: minimized.value ? 'none' : 'block'
}));

// Window management
function bringToFront() {
  if (!focused.value) {
    focused.value = true;
    emit('focus');
  }
}

function minimize() {
  minimized.value = !minimized.value;
  if (minimized.value) {
    emit('minimize');
  }
}

function toggleMaximize() {
  if (maximized.value) {
    // Restore
    x.value = savedX.value;
    y.value = savedY.value;
    width.value = savedWidth.value;
    height.value = savedHeight.value;
    maximized.value = false;
  } else {
    // Maximize
    savedX.value = x.value;
    savedY.value = y.value;
    savedWidth.value = width.value;
    savedHeight.value = height.value;
    
    x.value = 0;
    y.value = 0;
    width.value = window.innerWidth;
    height.value = window.innerHeight - 28; // Account for titlebar
    maximized.value = true;
  }
  emit('maximize');
}

// Dragging
function startDrag(event: MouseEvent) {
  if (maximized.value) return;
  
  isDragging.value = true;
  dragStartX.value = x.value;
  dragStartY.value = y.value;
  dragStartMouseX.value = event.clientX;
  dragStartMouseY.value = event.clientY;
  
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDrag);
  event.preventDefault();
}

function drag(event: MouseEvent) {
  if (!isDragging.value) return;
  
  const deltaX = event.clientX - dragStartMouseX.value;
  const deltaY = event.clientY - dragStartMouseY.value;
  
  x.value = Math.max(0, Math.min(window.innerWidth - width.value, dragStartX.value + deltaX));
  y.value = Math.max(0, Math.min(window.innerHeight - height.value, dragStartY.value + deltaY));
  
  emit('move', x.value, y.value);
}

function stopDrag() {
  isDragging.value = false;
  document.removeEventListener('mousemove', drag);
  document.removeEventListener('mouseup', stopDrag);
}

// Resizing
function startResize(direction: string) {
  return (event: MouseEvent) => {
    if (maximized.value) return;
    
    isResizing.value = true;
    resizeDirection.value = direction;
    resizeStartX.value = x.value;
    resizeStartY.value = y.value;
    resizeStartWidth.value = width.value;
    resizeStartHeight.value = height.value;
    resizeStartMouseX.value = event.clientX;
    resizeStartMouseY.value = event.clientY;
    
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    event.preventDefault();
    event.stopPropagation();
  };
}

function resize(event: MouseEvent) {
  if (!isResizing.value) return;
  
  const deltaX = event.clientX - resizeStartMouseX.value;
  const deltaY = event.clientY - resizeStartMouseY.value;
  
  let newX = resizeStartX.value;
  let newY = resizeStartY.value;
  let newWidth = resizeStartWidth.value;
  let newHeight = resizeStartHeight.value;
  
  // Handle different resize directions
  if (resizeDirection.value.includes('e')) {
    newWidth = Math.max(props.minWidth, resizeStartWidth.value + deltaX);
  }
  if (resizeDirection.value.includes('w')) {
    const widthChange = Math.min(deltaX, resizeStartWidth.value - props.minWidth);
    newX = resizeStartX.value + widthChange;
    newWidth = resizeStartWidth.value - widthChange;
  }
  if (resizeDirection.value.includes('s')) {
    newHeight = Math.max(props.minHeight, resizeStartHeight.value + deltaY);
  }
  if (resizeDirection.value.includes('n')) {
    const heightChange = Math.min(deltaY, resizeStartHeight.value - props.minHeight);
    newY = resizeStartY.value + heightChange;
    newHeight = resizeStartHeight.value - heightChange;
  }
  
  // Constrain to viewport
  newX = Math.max(0, Math.min(window.innerWidth - newWidth, newX));
  newY = Math.max(0, Math.min(window.innerHeight - newHeight, newY));
  
  x.value = newX;
  y.value = newY;
  width.value = newWidth;
  height.value = newHeight;
  
  emit('resize', newWidth, newHeight);
}

function stopResize() {
  isResizing.value = false;
  resizeDirection.value = '';
  document.removeEventListener('mousemove', resize);
  document.removeEventListener('mouseup', stopResize);
}

// Handle clicks outside to blur
function handleClickOutside(event: Event) {
  const target = event.target as Element;
  if (!target.closest('.floating-window')) {
    focused.value = false;
    emit('blur');
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  nextTick(() => {
    bringToFront();
  });
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('mousemove', drag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('mousemove', resize);
  document.removeEventListener('mouseup', stopResize);
});
</script>

<style scoped>
.floating-window {
  position: fixed;
  background: var(--stone-50, #fafaf9);
  border: 1px solid var(--stone-300, #d6d3d1);
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  user-select: none;
  transition: box-shadow 0.2s ease;
}

.floating-window.focused {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-color: var(--gold-400, #facc15);
}

@media (prefers-color-scheme: dark) {
  .floating-window {
    background: var(--stone-800, #292524);
    border-color: var(--stone-600, #57534e);
  }
  
  .floating-window.focused {
    border-color: var(--gold-500, #eab308);
  }
}

.window-titlebar {
  height: 28px;
  background: var(--stone-100, #f5f5f4);
  border-bottom: 1px solid var(--stone-300, #d6d3d1);
  display: flex;
  align-items: center;
  cursor: move;
  padding: 0 8px;
  position: relative;
}

@media (prefers-color-scheme: dark) {
  .window-titlebar {
    background: var(--stone-700, #44403c);
    border-bottom-color: var(--stone-600, #57534e);
  }
}

.window-controls {
  display: flex;
  gap: 4px;
  position: absolute;
  left: 8px;
}

.window-control {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0;
  color: transparent;
  transition: color 0.2s ease;
}

.window-control:hover {
  color: var(--stone-800, #292524);
}

@media (prefers-color-scheme: dark) {
  .window-control:hover {
    color: var(--stone-100, #f5f5f4);
  }
}

.window-control.close {
  background: #ff5f56;
}

.window-control.minimize {
  background: #ffbd2e;
}

.window-control.maximize {
  background: #27ca3f;
}

.window-title {
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--stone-700, #44403c);
  pointer-events: none;
}

@media (prefers-color-scheme: dark) {
  .window-title {
    color: var(--stone-300, #d6d3d1);
  }
}

.window-controls-spacer {
  width: 60px; /* Same width as .window-controls to center title */
}

.window-content {
  height: calc(100% - 28px);
  overflow: auto;
  padding: 16px;
}

/* Resize Handles */
.resize-handle {
  position: absolute;
  background: transparent;
}

.resize-n, .resize-s {
  height: 4px;
  left: 4px;
  right: 4px;
  cursor: ns-resize;
}

.resize-n {
  top: -2px;
}

.resize-s {
  bottom: -2px;
}

.resize-e, .resize-w {
  width: 4px;
  top: 4px;
  bottom: 4px;
  cursor: ew-resize;
}

.resize-e {
  right: -2px;
}

.resize-w {
  left: -2px;
}

.resize-ne, .resize-nw, .resize-se, .resize-sw {
  width: 8px;
  height: 8px;
}

.resize-ne {
  top: -2px;
  right: -2px;
  cursor: ne-resize;
}

.resize-nw {
  top: -2px;
  left: -2px;
  cursor: nw-resize;
}

.resize-se {
  bottom: -2px;
  right: -2px;
  cursor: se-resize;
}

.resize-sw {
  bottom: -2px;
  left: -2px;
  cursor: sw-resize;
}
</style>