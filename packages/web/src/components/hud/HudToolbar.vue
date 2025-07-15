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
        @click="toggleTool(tool.id)"
      >
        <i :class="`mdi ${tool.icon}`"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useHUD } from '../../composables/useHUD.mjs';
import type { ToolType } from '../../types/hud.mjs';

const hud = useHUD();

// Computed properties
const toolbarStyle = computed(() => ({
  left: `${hud.store.toolbar.position.x}px`,
  top: `${hud.store.toolbar.position.y}px`,
  backgroundColor: hud.store.configuration.theme.toolbarBackground,
  borderRadius: `${hud.store.configuration.theme.borderRadius}px`,
}));

const tools = computed(() => Object.values(hud.store.toolbar.tools));

// Drag functionality
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartPos = ref({ x: 0, y: 0 });

function startDrag(event: MouseEvent): void {
  // Only drag if clicking on the toolbar background, not a button
  if ((event.target as HTMLElement).closest('.tool-button')) return;
  
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
  
  const newX = Math.max(0, Math.min(window.innerWidth - 200, dragStartPos.value.x + deltaX));
  const newY = Math.max(0, Math.min(window.innerHeight - 300, dragStartPos.value.y + deltaY));
  
  hud.setToolbarPosition({ x: newX, y: newY });
}

function stopDrag(): void {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.body.style.cursor = '';
}

function toggleTool(toolId: string): void {
  hud.toggleTool(toolId as ToolType);
}
</script>

<style scoped>
.hud-toolbar {
  position: absolute;
  z-index: 1000;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  cursor: grab;
  user-select: none;
  transition: all 0.2s ease;
}

.hud-toolbar:active {
  cursor: grabbing;
}

.toolbar-content {
  display: flex;
  gap: 4px;
}

.toolbar-vertical .toolbar-content {
  flex-direction: column;
}

.toolbar-horizontal .toolbar-content {
  flex-direction: row;
}

.tool-button {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  position: relative;
}

.tool-button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

.tool-button.tool-active {
  background: rgba(59, 130, 246, 0.6);
  color: white;
  border-color: rgba(59, 130, 246, 0.8);
}

.tool-button.tool-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-button.tool-disabled:hover {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  transform: none;
}

/* Animation for toolbar appearance */
@keyframes toolbarFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.hud-toolbar {
  animation: toolbarFadeIn 0.2s ease-out;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .hud-toolbar {
    display: none;
  }
}
</style>