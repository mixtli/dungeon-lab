<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { pluginRegistry } from '@/services/plugin-registry.mts';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';
import { ActorsClient } from '@dungeon-lab/client/index.mjs';
import { useActorStore } from '../stores/actor.store.mjs';
import CharacterSheetContainer from '../components/character/CharacterSheetContainer.vue';

const route = useRoute();
const router = useRouter();
const actorStore = useActorStore();
const actorsClient = new ActorsClient();
const characterId = route.params.id as string;
const isLoading = ref(true);
const character = ref<IActor | null>(null);
const error = ref<string | null>(null);

// Get the plugin ID from the character's gameSystemId
const pluginId = ref('');
const isPluginLoaded = ref(false);

// Floating window state
const isVisible = ref(true);
const isMinimized = ref(false);
const position = ref({ x: 200, y: 100 });
const size = ref({ width: 800, height: 600 });
const zIndex = ref(1000);

// Drag and resize state
const isDragging = ref(false);
const isResizing = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartPos = ref({ x: 0, y: 0 });
const resizeStartPos = ref({ x: 0, y: 0 });
const resizeStartSize = ref({ width: 0, height: 0 });

onMounted(async () => {
  try {
    // Fetch the character data directly using ActorsClient
    const fetchedCharacter = await actorsClient.getActor(characterId);

    if (fetchedCharacter) {
      character.value = fetchedCharacter;
      // Update the current actor in the store
      actorStore.setCurrentActor(characterId);
      console.log('character', character.value);

      // Get the plugin ID from the character's gameSystemId
      pluginId.value = fetchedCharacter.gameSystemId || '';

      // Check if plugin is loaded or available
      if (pluginId.value) {
        const plugin = pluginRegistry.getGameSystemPlugin(pluginId.value);
        if (plugin) {
          isPluginLoaded.value = true;
        } else {
          // Try to load the plugin
          try {
            await pluginRegistry.loadGameSystemPlugin(pluginId.value);
            isPluginLoaded.value = true;
          } catch (e) {
            console.error('Failed to load plugin:', e);
            error.value = `Failed to load game system plugin: ${pluginId.value}`;
          }
        }
      } else {
        error.value = 'Character has no game system ID';
      }
    } else {
      error.value = 'Character not found';
    }
  } catch (e) {
    console.error('Error fetching character:', e);
    error.value = 'Error loading character data';
  } finally {
    isLoading.value = false;
  }
});

// Computed properties
const windowStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
  width: `${size.value.width}px`,
  height: isMinimized.value ? '48px' : `${size.value.height}px`,
  zIndex: zIndex.value,
}));

const minimizeIcon = computed(() => {
  return isMinimized.value ? 'mdi mdi-window-restore' : 'mdi mdi-minus';
});

// Window controls
function closeWindow() {
  isVisible.value = false;
  // Navigate back or to a default route
  router.push('/');
}

function toggleMinimize() {
  isMinimized.value = !isMinimized.value;
}

function bringToFront() {
  zIndex.value = Date.now(); // Simple z-index management
}

// Drag functionality
function startDrag(event: MouseEvent) {
  isDragging.value = true;
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
  dragStartPos.value = { ...position.value };
  
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
  document.body.style.cursor = 'grabbing';
  event.preventDefault();
}

function handleDrag(event: MouseEvent) {
  if (!isDragging.value) return;
  
  const deltaX = event.clientX - dragStartX.value;
  const deltaY = event.clientY - dragStartY.value;
  
  const newX = Math.max(0, Math.min(window.innerWidth - size.value.width, dragStartPos.value.x + deltaX));
  const newY = Math.max(0, Math.min(window.innerHeight - size.value.height, dragStartPos.value.y + deltaY));
  
  position.value = { x: newX, y: newY };
}

function stopDrag() {
  isDragging.value = false;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.body.style.cursor = '';
}

// Resize functionality
function startResize(event: MouseEvent) {
  isResizing.value = true;
  resizeStartPos.value = { x: event.clientX, y: event.clientY };
  resizeStartSize.value = { ...size.value };
  
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  document.body.style.cursor = 'nw-resize';
  event.preventDefault();
  event.stopPropagation();
}

function handleResize(event: MouseEvent) {
  if (!isResizing.value) return;
  
  const deltaX = event.clientX - resizeStartPos.value.x;
  const deltaY = event.clientY - resizeStartPos.value.y;
  
  const newWidth = Math.max(400, resizeStartSize.value.width + deltaX);
  const newHeight = Math.max(300, resizeStartSize.value.height + deltaY);
  
  size.value = { width: newWidth, height: newHeight };
}

function stopResize() {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
}

// Character sheet event handlers
function handleCharacterUpdate(updatedCharacter: IActor) {
  character.value = updatedCharacter;
  // Could also sync with server here
}

function handleCharacterSave(character: IActor) {
  // Handle saving the character
  console.log('Saving character:', character);
}

function handleRoll(rollType: string, data: Record<string, unknown>) {
  // Handle dice rolls
  console.log('Roll:', rollType, data);
}

// Cleanup on unmount
onUnmounted(() => {
  if (isDragging.value) stopDrag();
  if (isResizing.value) stopResize();
});
</script>

<template>
  <!-- Teleport the floating window to the body to render over everything -->
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="character-sheet-floating-window"
      :style="windowStyle"
      @mousedown="bringToFront"
    >
      <!-- Window Header -->
      <div class="window-header" @mousedown="startDrag">
        <div class="window-title">
          <i class="mdi mdi-account title-icon"></i>
          <span>{{ character?.name || 'Character Sheet' }}</span>
        </div>
        
        <div class="window-controls">
          <button 
            class="control-button" 
            :title="isMinimized ? 'Restore' : 'Minimize'" 
            @click="toggleMinimize"
          >
            <i :class="minimizeIcon"></i>
          </button>
          <button class="control-button" title="Close" @click="closeWindow">
            <i class="mdi mdi-close"></i>
          </button>
        </div>
      </div>

      <!-- Window Content -->
      <div v-if="!isMinimized" class="window-content">
        <div v-if="isLoading" class="loading">
          <div class="spinner"></div>
          <p>Loading character...</p>
        </div>

        <div v-else-if="error" class="error">
          <h2>Error</h2>
          <p>{{ error }}</p>
        </div>

        <div v-else-if="!character" class="not-found">
          <h2>Character Not Found</h2>
          <p>The character you're looking for doesn't exist or has been deleted.</p>
        </div>

        <div v-else-if="!isPluginLoaded" class="plugin-error">
          <h2>Game System Not Available</h2>
          <p>The game system plugin required for this character is not available.</p>
        </div>

        <div v-else class="character-container">
          <CharacterSheetContainer
            :show="true"
            :character="character"
            :readonly="false"
            @close="closeWindow"
            @update:character="handleCharacterUpdate"
            @save="handleCharacterSave"
            @roll="handleRoll"
          />
        </div>
      </div>

      <!-- Resize Handle -->
      <div 
        v-if="!isMinimized"
        class="floating-window-resize-handle" 
        @mousedown="startResize"
        title="Drag to resize"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" class="resize-lines">
          <path d="M9 3L3 9M11 5L5 11M11 3L9 5" stroke="currentColor" stroke-width="1" opacity="0.5" />
        </svg>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.character-sheet-floating-window {
  position: fixed;
  background: rgba(26, 26, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  min-width: 400px;
  min-height: 300px;
  overflow: hidden;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.window-header {
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
  color: white;
}

.character-container {
  height: 100%;
  overflow: auto;
}

.loading,
.error,
.not-found,
.plugin-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  padding: 20px;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-left-color: #7b1fa2;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error,
.not-found,
.plugin-error {
  color: #ff6b6b;
}

.error h2,
.not-found h2,
.plugin-error h2 {
  color: #ff6b6b;
  margin: 0 0 8px 0;
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

.character-sheet-floating-window {
  animation: windowFadeIn 0.2s ease-out;
}
</style>
