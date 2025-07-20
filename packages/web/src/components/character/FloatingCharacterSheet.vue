<template>
  <Teleport to="body">
    <div
      v-for="[sheetId, sheet] in characterSheetStore.floatingSheets"
      :key="sheetId"
      :ref="sheetId"
      class="floating-character-sheet"
      :style="getSheetStyle(sheet)"
      @mousedown.self="characterSheetStore.bringToFront(sheetId)"
    >
      <!-- Fallback Framework Header (only shown if plugin doesn't emit events) -->
      <div v-if="showFallbackChrome" class="fallback-header" @mousedown="startDrag($event, sheetId)">
        <div class="window-title">
          <i class="mdi mdi-account title-icon"></i>
          <span>{{ sheet.character.name }}</span>
        </div>
        
        <div class="window-controls">
          <button class="control-button" title="Close" @click="characterSheetStore.closeCharacterSheet(sheetId)">
            <i class="mdi mdi-close"></i>
          </button>
        </div>
      </div>

      <!-- Window Content (no header - plugin provides its own) -->
      <div class="window-content">
        <CharacterSheetContainer
          :show="true"
          :character="sheet.character"
          :readonly="false"
          @close="characterSheetStore.closeCharacterSheet(sheetId)"
          @update:character="(character) => characterSheetStore.updateCharacter(sheetId, character)"
          @save="handleCharacterSave"
          @roll="handleRoll"
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
import { useCharacterSheetStore } from '../../stores/character-sheet.store.mjs';
import { useActorStore } from '../../stores/actor.store.mjs';
import { pluginRegistry } from '../../services/plugin-registry.mts';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';
import type { FloatingCharacterSheet } from '../../stores/character-sheet.store.mjs';
import CharacterSheetContainer from './CharacterSheetContainer.vue';

const characterSheetStore = useCharacterSheetStore();
const actorStore = useActorStore();

// Drag and resize state
const isDragging = ref(false);
const isResizing = ref(false);
const currentSheetId = ref('');
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartPos = ref({ x: 0, y: 0 });
const resizeStartPos = ref({ x: 0, y: 0 });
const resizeStartSize = ref({ width: 0, height: 0 });

// Plugin event listeners cleanup functions
const eventCleanups = ref<Array<() => void>>([]);

// Fallback support - show framework chrome if plugin doesn't emit events
const showFallbackChrome = ref(false);
const fallbackTimeout = ref<number | null>(null);

function getSheetStyle(sheet: FloatingCharacterSheet) {
  return {
    left: `${sheet.position.x}px`,
    top: `${sheet.position.y}px`,
    width: `${sheet.size.width}px`,
    height: `${sheet.size.height}px`,
    zIndex: sheet.zIndex,
  };
}

// Drag functionality
function startDrag(event: MouseEvent, sheetId: string) {
  const sheet = characterSheetStore.floatingSheets.get(sheetId);
  if (!sheet) return;
  
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
  if (!isDragging.value || !currentSheetId.value) return;
  
  const sheet = characterSheetStore.floatingSheets.get(currentSheetId.value);
  if (!sheet) return;
  
  const deltaX = event.clientX - dragStartX.value;
  const deltaY = event.clientY - dragStartY.value;
  
  const newX = Math.max(0, Math.min(window.innerWidth - sheet.size.width, dragStartPos.value.x + deltaX));
  const newY = Math.max(0, Math.min(window.innerHeight - sheet.size.height, dragStartPos.value.y + deltaY));
  
  characterSheetStore.updatePosition(currentSheetId.value, newX, newY);
}

function stopDrag() {
  isDragging.value = false;
  currentSheetId.value = '';
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.body.style.cursor = '';
}

// Resize functionality
function startResize(event: MouseEvent, sheetId: string) {
  const sheet = characterSheetStore.floatingSheets.get(sheetId);
  if (!sheet) return;
  
  isResizing.value = true;
  currentSheetId.value = sheetId;
  resizeStartPos.value = { x: event.clientX, y: event.clientY };
  resizeStartSize.value = { ...sheet.size };
  
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
  
  const newWidth = Math.max(900, resizeStartSize.value.width + deltaX);
  const newHeight = Math.max(600, resizeStartSize.value.height + deltaY);
  
  characterSheetStore.updateSize(currentSheetId.value, newWidth, newHeight);
}

function stopResize() {
  isResizing.value = false;
  currentSheetId.value = '';
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
}

// Character sheet event handlers
async function handleCharacterSave(character: IActor) {
  try {
    await actorStore.updateActor(character.id, {
      name: character.name,
      data: character.data
    });
    console.log('Character saved:', character.name);
  } catch (error) {
    console.error('Failed to save character:', error);
  }
}

function handleRoll(rollType: string, data: Record<string, unknown>) {
  console.log('Roll:', rollType, data);
  // TODO: Integrate with dice rolling system
}

// Setup plugin event listeners
onMounted(() => {
  setupPluginEventListeners();
  
  // Set up fallback timeout - show framework chrome if no plugin events received
  fallbackTimeout.value = window.setTimeout(() => {
    // If no plugin context was found, show fallback chrome
    const hasActivePlugin = Array.from(characterSheetStore.floatingSheets.values()).some(sheet => {
      const gameSystemId = sheet.character.gameSystemId;
      let pluginId = gameSystemId;
      if (pluginId === 'dnd5e-2024' || pluginId === 'dnd-5e-2024') {
        pluginId = 'dnd-5e-2024';
      }
      return pluginRegistry.getPluginContext(pluginId) !== undefined;
    });
    
    if (!hasActivePlugin) {
      console.warn('[FloatingCharacterSheet] No plugin context found, showing fallback chrome');
      showFallbackChrome.value = true;
    }
  }, 1000); // 1 second timeout
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
  // Listen for events from all character sheets
  for (const [sheetId, sheet] of characterSheetStore.floatingSheets) {
    const gameSystemId = sheet.character.gameSystemId;
    let pluginId = gameSystemId;
    
    // Map game system ID to plugin ID
    if (pluginId === 'dnd5e-2024' || pluginId === 'dnd-5e-2024') {
      pluginId = 'dnd-5e-2024';
    }
    
    const context = pluginRegistry.getPluginContext(pluginId);
    if (context?.events) {
      // Listen for window close events
      const closeCleanup = context.events.on('window:close', () => {
        characterSheetStore.closeCharacterSheet(sheetId);
      });
      eventCleanups.value.push(closeCleanup);
      
      // Listen for drag start events
      const dragCleanup = context.events.on('window:drag-start', (data: { startX: number; startY: number }) => {
        // Find which sheet this event is for by checking which character sheet is currently active
        // For now, we'll handle drag for the most recently focused sheet
        const sheets = Array.from(characterSheetStore.floatingSheets.values());
        const topSheet = sheets.reduce((top, current) => 
          current.zIndex > top.zIndex ? current : top
        );
        
        if (topSheet) {
          isDragging.value = true;
          currentSheetId.value = topSheet.id;
          dragStartX.value = data.startX;
          dragStartY.value = data.startY;
          dragStartPos.value = { ...topSheet.position };
          
          document.addEventListener('mousemove', handleDrag);
          document.addEventListener('mouseup', stopDrag);
          document.body.style.cursor = 'grabbing';
        }
      });
      eventCleanups.value.push(dragCleanup);
    }
  }
}
</script>

<style scoped>
.floating-character-sheet {
  position: fixed;
  display: flex;
  flex-direction: column;
  min-width: 900px;
  min-height: 600px;
  overflow: hidden;
  transition: all 0.2s ease;
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
  width: 100%;
  height: 100%;
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