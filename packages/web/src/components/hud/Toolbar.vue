<template>
  <div
    v-if="hud.showHUD && hud.store.toolbarVisible"
    class="hud-toolbar"
    :class="{
      'toolbar-horizontal': hud.store.toolbar.orientation === 'horizontal',
      'toolbar-vertical': hud.store.toolbar.orientation === 'vertical'
    }"
    :style="toolbarStyle"
    @mousedown="startDrag"
  >
    <div class="toolbar-content">
      <button
        v-for="tool in tools"
        :key="tool.id"
        class="tool-button"
        :class="{ 
          'tool-active': tool.active,
          'tool-disabled': tool.disabled 
        }"
        :title="`${tool.title} (${tool.shortcut?.toUpperCase()})`"
        :disabled="tool.disabled"
        @click="hud.toggleTool(tool.id)"
      >
        <i :class="`mdi ${tool.icon} tool-icon`"></i>
      </button>
    </div>

    <!-- Drag Handle -->
    <div class="drag-handle">
      <i class="mdi mdi-drag-variant"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useHUD } from '../../composables/useHUD.mjs';

const hud = useHUD();

// Computed properties
const tools = computed(() => Object.values(hud.store.toolbar.tools));

const toolbarStyle = computed(() => ({
  left: `${hud.store.toolbar.position.x}px`,
  top: `${hud.store.toolbar.position.y}px`,
  backgroundColor: hud.store.configuration.theme.toolbarBackground,
  borderRadius: `${hud.store.configuration.theme.borderRadius}px`,
}));

// Drag functionality
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartPos = ref({ x: 0, y: 0 });

function startDrag(event: MouseEvent): void {
  // Only start drag from drag handle or empty space
  const target = event.target as HTMLElement;
  if (target.closest('.tool-button')) return;

  isDragging.value = true;
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
  dragStartPos.value = { ...hud.store.toolbar.position };
  
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
  document.body.style.cursor = 'grabbing';
  event.preventDefault();
}

function handleDrag(event: MouseEvent): void {
  if (!isDragging.value) return;
  
  const deltaX = event.clientX - dragStartX.value;
  const deltaY = event.clientY - dragStartY.value;
  
  const newPosition = {
    x: Math.max(0, Math.min(window.innerWidth - 60, dragStartPos.value.x + deltaX)),
    y: Math.max(0, Math.min(window.innerHeight - 200, dragStartPos.value.y + deltaY))
  };
  
  hud.store.setToolbarPosition(newPosition);
}

function stopDrag(): void {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.body.style.cursor = '';
}
</script>

<style scoped>
.hud-toolbar {
  position: fixed;
  z-index: 1001;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
  cursor: grab;
  user-select: none;
}

.hud-toolbar:active {
  cursor: grabbing;
}

.toolbar-vertical {
  width: 60px;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.toolbar-horizontal {
  height: 60px;
  min-width: 200px;
  display: flex;
  flex-direction: row;
}

.toolbar-content {
  flex: 1;
  display: flex;
  padding: 8px;
  gap: 4px;
}

.toolbar-vertical .toolbar-content {
  flex-direction: column;
}

.toolbar-horizontal .toolbar-content {
  flex-direction: row;
}

.tool-button {
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.tool-button:hover:not(.tool-disabled) {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.tool-button.tool-active {
  background: rgba(59, 130, 246, 0.6);
  color: white;
  border-color: rgba(59, 130, 246, 0.8);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.tool-button.tool-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-icon {
  font-size: 20px;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  padding: 4px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.toolbar-horizontal .drag-handle {
  writing-mode: vertical-lr;
  border-top: none;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.drag-handle:hover {
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.1);
}

/* Active tool indicator */
.tool-button.tool-active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  background: #3b82f6;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
}

.toolbar-horizontal .tool-button.tool-active::after {
  bottom: auto;
  right: -8px;
  left: auto;
  top: 50%;
  transform: translateY(-50%);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .hud-toolbar {
    display: none;
  }
}

/* Animation for tool activation */
@keyframes toolActivate {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.tool-button.tool-active {
  animation: toolActivate 0.3s ease;
}

/* Subtle pulse effect for active tools */
.tool-button.tool-active {
  animation: toolPulse 2s ease-in-out infinite;
}

@keyframes toolPulse {
  0%, 100% { 
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  50% { 
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.5);
  }
}
</style>