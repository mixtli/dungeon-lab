<template>
  <div class="encounter-container" :class="deviceClass">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center h-screen">
      <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
      <span class="ml-2">Loading encounter...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex justify-center items-center h-screen">
      <div class="text-red-500 text-center">
        <h2 class="text-xl font-bold mb-2">Error Loading Encounter</h2>
        <p>{{ error }}</p>
        <button 
          @click="retryLoad" 
          class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    </div>

    <!-- No Active Encounter State -->
    <div v-else-if="!isActiveEncounter" class="flex justify-center items-center h-screen">
      <div class="text-center text-gray-500">
        <h2 class="text-xl font-bold mb-2">No Active Encounter</h2>
        <p>No encounter is currently active in this session.</p>
        <p class="text-sm mt-2">Start an encounter from the campaign dashboard to use the encounter runner.</p>
      </div>
    </div>
    <!-- Main Encounter View - Fullscreen with AppHeader -->
    <div v-else-if="encounter" class="encounter-view-fullscreen" :class="{ 'mobile-with-bottom-nav': deviceConfig.type === 'phone', 'mobile-landscape-fullscreen': isMobileLandscape }" :style="hudLayoutStyle">
        <!-- Main Content Area - Canvas -->
        <div 
          class="encounter-content" 
          ref="mapContainerRef"
          :data-drag-over="isDragOver"
          @dragover.prevent="handleDragOver"
          @drop="handleDrop"
          @dragenter.prevent="handleDragEnter" 
          @dragleave="handleDragLeave"
        >
        <!-- Pixi Map Viewer -->
        <PixiMapViewer
          ref="pixiMapViewer"
          v-if="gameStateStore.currentEncounter?.currentMap && !gameStateStore.loading"
          :map-data="gameStateStore.currentEncounter.currentMap"
          :tokens="encounterTokens"
          :selected-token-id="debugSelectedTokenId"
          :target-token-ids="targetTokenIds"
          :platform="deviceConfig.type"
          :show-walls="showWalls"
          :show-objects="showObjects"
          :show-portals="showPortals"
          :show-lights="showLights"
          @token-selected="handleTokenSelection"
          @token-moved="handleTokenMoved"
          @token-drag-start="handleTokenDragStart"
          @viewport-changed="handleViewportChange"
          @canvas-click="handleMapClick"
          @canvas-right-click="handleMapRightClick"
          @mousemove="handleMouseMove"
          @show-token-context-menu="onShowTokenContextMenu"
          @show-encounter-context-menu="onShowEncounterContextMenu"
          class="w-full h-full"
        />
        
        <!-- Consolidated Debug Info -->
        <EncounterDebugInfo
          v-if="encounter"
          :visible="showDebugInfo"
          :encounter-info="{
            id: encounter.id,
            mapId: encounter.mapId,
            tokenCount: encounterTokens.length,
            selectedToken: selectedToken?.name,
            isConnected: isSocketConnected
          }"
          :viewport-info="{
            x: Math.round(viewport.x),
            y: Math.round(viewport.y),
            scale: Math.round(viewport.zoom * 100),
            platform: deviceConfig.type,
            mapName: encounter.mapId || 'None'
          }"
          :mouse-info="{
            screenX: Math.round(mousePosition.screenX),
            screenY: Math.round(mousePosition.screenY),
            worldX: Math.round(mousePosition.worldX),
            worldY: Math.round(mousePosition.worldY)
          }"
        />

        <!-- Fallback when no map -->
        <div v-else class="flex items-center justify-center h-full bg-gray-100">
          <div class="text-center text-gray-500">
            <h3 class="text-lg font-medium mb-2">No Map Assigned</h3>
            <p>This encounter doesn't have a map assigned yet.</p>
          </div>
        </div>

        <!-- UI Overlays -->
        <div class="encounter-overlays absolute inset-0 pointer-events-none">
          
          <!-- 3D Dice Overlay -->
          <DiceOverlay />

          <!-- Token Context Menu -->
          <TokenContextMenu
            v-if="contextMenuToken"
            :visible="!!contextMenuToken"
            :token="contextMenuToken"
            :position="contextMenuPosition"
            @close="contextMenuToken = null"
            @action="handleTokenAction"
          />

          <!-- Connection Status -->
          <div 
            v-if="!isSocketConnected" 
            class="absolute top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded pointer-events-auto"
          >
            <span class="text-sm">⚠️ Disconnected - Changes may not sync</span>
          </div>

          <!-- Participants List (Desktop only) -->
          <div 
            v-if="deviceConfig.type === 'desktop' && encounterParticipants.length > 0"
            class="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 pointer-events-auto"
          >
            <h5 class="font-medium text-sm mb-2">Participants ({{ encounterParticipants.length }})</h5>
            <div class="space-y-1">
              <div 
                v-for="participant in encounterParticipants" 
                :key="participant"
                class="text-xs text-gray-600"
              >
                {{ participant }}
              </div>
            </div>
          </div>

          <!-- Map Context Menu -->
          <MapContextMenu
            :visible="showMapContextMenu"
            :position="contextMenuPosition"
            :show-walls="showWalls"
            :show-objects="showObjects"
            :show-portals="showPortals"
            :show-lights="showLights"
            :show-debug-info="showDebugInfo"
            @action="handleMapContextMenuAction"
          />
        </div>
        
        <!-- HUD System overlays the encounter container -->
        <!-- Use isTrueMobile to ensure HUD never shows on mobile phones regardless of orientation -->
        <HUD v-if="!isTrueMobile" />
      </div>
    </div>
    <!-- Not Found State -->
    <div v-else class="flex justify-center items-center h-screen">
      <div class="text-center text-gray-500">
        <h2 class="text-xl font-bold mb-2">Encounter Not Found</h2>
        <p>The requested encounter could not be found.</p>
      </div>
    </div>

    <!-- Document Token Generator -->
    <DocumentTokenGenerator
      v-if="showTokenGenerator && encounter?.id"
      @tokensCreated="handleTokensCreated"
      @close="showTokenGenerator = false"
      class="document-token-generator-modal"
    />
    
    <!-- Token State Manager -->
    <TokenStateManager
      v-if="showTokenManager"
      :visible="showTokenManager"
      :token="selectedToken"
      :mode="tokenManagerMode"
      :action="tokenManagerAction"
      @close="showTokenManager = false"
      @updateToken="handleTokenUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, provide } from 'vue';
import { useGameStateStore } from '../../stores/game-state.store.mjs';
import { useDeviceAdaptation } from '../../composables/useDeviceAdaptation.mjs';
import { usePlayerActions } from '../../composables/usePlayerActions.mjs';
// Encounter socket functionality removed - using session-based architecture
import PixiMapViewer from './PixiMapViewer.vue';
import HUD from '../hud/HUD.vue';
import DocumentTokenGenerator from './DocumentTokenGenerator.vue';
import TokenContextMenu from './TokenContextMenu.vue';
import TokenStateManager from './TokenStateManager.vue';
import EncounterDebugInfo from './EncounterDebugInfo.vue';
import type { Token, StateOperation } from '@dungeon-lab/shared/types/index.mjs';
import { useAuthStore } from '../../stores/auth.store.mjs';
import { useNotificationStore } from '../../stores/notification.store.mjs';
// Add import for MapContextMenu
import MapContextMenu from './MapContextMenu.vue';
import DiceOverlay from '../dice/DiceOverlay.vue';
import { turnManagerService } from '../../services/turn-manager.service.mjs';

// No props needed - EncounterView always displays the current encounter from game state

// Composables
const gameStateStore = useGameStateStore();
const { deviceConfig, deviceClass, isTrueMobile, isMobileLandscape } = useDeviceAdaptation();
const { requestTokenMove, requestTokenRemove } = usePlayerActions();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

// Encounter socket functionality removed - using session-based architecture through encounter store

// State
const loading = ref(true);
const error = ref<string | null>(null);
const selectedToken = ref<Token | null>(null);
const targetTokenIds = ref(new Set<string>());

// Provide target context to child components (including plugin character sheets)
const encounterTargetTokenIds = computed(() => Array.from(targetTokenIds.value));
provide('encounterTargetTokenIds', encounterTargetTokenIds);

// Provide selected token context to child components (including plugin character sheets)
provide('encounterSelectedToken', selectedToken);


const showTokenGenerator = ref(false);
const showDebugInfo = ref(false);

// Mouse tracking state
const mousePosition = ref({
  screenX: 0,
  screenY: 0,
  worldX: 0,
  worldY: 0
});

// Context menu and overlay state
const showTokenManager = ref(false);
const tokenManagerMode = ref<'health' | 'conditions' | 'properties'>('health');
const tokenManagerAction = ref<'damage' | 'heal'>();

// Position tracking for token placement
const mapContainerRef = ref<HTMLElement | null>(null);
const pixiMapViewer = ref<InstanceType<typeof PixiMapViewer> | null>(null);
const lastClickPosition = ref<{ x: number; y: number; elevation: number } | undefined>(undefined);

// Viewport state
const viewport = ref({
  x: 0,
  y: 0,
  zoom: 1
});

// Mock socket connection state (will be replaced with real socket integration)
const isSocketConnected = ref(true);
const encounterParticipants = ref<string[]>([]);

// Computed
const encounter = computed(() => gameStateStore.currentEncounter);

// Debug computed to track selectedToken changes
const debugSelectedTokenId = computed(() => {
  return selectedToken.value?.id;
});

// Convert encounter tokens to format expected by PixiMapViewer
const encounterTokens = computed(() => {
  // Tokens are now part of currentEncounter in the unified game state
  const tokens = gameStateStore.currentEncounter?.tokens || {};
  
  // Convert record to array for PixiMapViewer
  return Object.values(tokens);
});

// Initialize encounter view - no loading needed, just use gameState
const initializeEncounter = async () => {
  loading.value = true;
  error.value = null;
  
  // Check if we have a current encounter in game state
  if (!encounter.value) {
    error.value = 'No active encounter in current session';
    loading.value = false;
    return;
  }
  
  // Initialize turn manager service with current campaign's plugin ID
  const pluginId = gameStateStore.gameState?.campaign?.pluginId;
  if (pluginId) {
    try {
      await turnManagerService.initialize(pluginId);
    } catch (error) {
      console.warn('[EncounterView] Failed to initialize turn manager:', error);
      // Don't fail encounter loading if turn manager fails to initialize
    }
  }
  loading.value = false;
};

const retryLoad = () => {
  initializeEncounter();
};


// Helper computed for all selected token IDs (actor + targets)
// TODO: This will be used for visual rendering of selected tokens in next task
// const allSelectedTokenIds = computed(() => {
//   const all = new Set(targetTokenIds.value);
//   if (selectedToken.value) all.add(selectedToken.value.id);
//   return all;
// });

// Event handlers - matching PixiMapViewer emit signatures
const handleTokenSelection = (tokenId: string, modifiers?: { shift?: boolean; ctrl?: boolean; alt?: boolean }) => {
  if (!encounter.value) {
    return;
  }
  
  // Find the token in the encounter
  const tokens = gameStateStore.currentEncounter?.tokens || {};
  const clickedToken = Object.values(tokens).find((t: Token) => t.id === tokenId) || null;
  
  if (!clickedToken) {
    console.warn('[EncounterView] Token not found for selection:', tokenId);
    return;
  }
  
  if (modifiers?.shift) {
    // Shift+click: toggle target selection
    if (targetTokenIds.value.has(tokenId)) {
      targetTokenIds.value.delete(tokenId);
    } else {
      targetTokenIds.value.add(tokenId);
    }
  } else {
    // Regular click: set as actor, clear targets
    selectedToken.value = clickedToken;
    targetTokenIds.value.clear();
    
    // Force PIXI selection to ensure visual selection is applied
    // This bypasses Vue reactivity issues when clicking the same token
    if (pixiMapViewer.value) {
      pixiMapViewer.value.forceSelectToken(clickedToken.id);
    } else {
      console.warn('[EncounterView] Could not force PIXI selection: pixiMapViewer ref not available');
    }
  }
  
  // Close context menu if open
  contextMenuToken.value = null;
};

// Handle token drag start - use character tab coordinate logic for final position
const handleTokenDragStart = (tokenId: string, globalPosition: { x: number; y: number }) => {
  console.log('[EncounterView] Token drag started:', { tokenId, globalPosition });
  
  // Set up one-time mouse/touch up listener to handle drop using character tab logic
  const handleDragDrop = (event: MouseEvent | TouchEvent) => {
    if (!pixiMapViewer.value || !mapContainerRef.value) {
      console.error('[EncounterView] Required refs not available for drag drop');
      return;
    }
    
    // Use the EXACT same coordinate calculation as character tab drops
    const mapContainer = mapContainerRef.value;
    const pixiViewer = pixiMapViewer.value;
    
    // Handle both mouse and touch coordinates
    let clientX: number;
    let clientY: number;
    
    if (event.type === 'touchend') {
      // Touch event - use changedTouches for touchend (touches array is empty on touchend)
      const touchEvent = event as TouchEvent;
      const touch = touchEvent.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      // Mouse event
      const mouseEvent = event as MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }
    
    const rect = mapContainer.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    
    // Convert screen coordinates to world coordinates using proper PIXI transformation
    const worldCoords = pixiViewer.screenToWorld(screenX, screenY);
    
    // Convert world coordinates to grid coordinates
    const gridSize = pixiViewer.getGridSize ? pixiViewer.getGridSize() : 50; // fallback to 50 if not available
    const gridX = Math.floor((worldCoords.x - gridSize / 2) / gridSize);
    const gridY = Math.floor((worldCoords.y - gridSize / 2) / gridSize);
    
    console.log('[EncounterView] Token drop with character tab logic:', {
      tokenId,
      screenCoords: { x: screenX, y: screenY },
      worldCoords: { x: worldCoords.x, y: worldCoords.y },
      gridSize,
      gridPosition: { gridX, gridY }
    });
    
    // Move the token using grid coordinates
    handleTokenMoved(tokenId, gridX, gridY);
    
    // Clean up both listeners
    document.removeEventListener('mouseup', handleDragDrop);
    document.removeEventListener('touchend', handleDragDrop);
  };
  
  // Listen for both mouse and touch events globally to handle drop
  document.addEventListener('mouseup', handleDragDrop, { once: true });
  document.addEventListener('touchend', handleDragDrop, { once: true });
};

const handleTokenMoved = async (tokenId: string, gridX: number, gridY: number) => {
  if (!encounter.value) return;
  
  const token = encounter.value.tokens ? Object.values(encounter.value.tokens).find(t => t.id === tokenId) : undefined;
  if (!token) {
    console.error('[EncounterView] Token not found:', tokenId);
    return;
  }
  
  try {
    // Use the new action request system for token movement with grid coordinates
    const elevation = token.bounds?.elevation || 0;
    const result = await requestTokenMove(tokenId, { gridX, gridY, elevation });
    
    if (result.success && !result.approved) {
      // Show notification to player that movement is pending approval
      notificationStore.addNotification({
        type: 'info',
        message: 'Movement is pending Game Master approval',
        duration: 4000
      });
    } else if (!result.success) {
      console.error('[EncounterView] Token movement failed:', result.error);
      // Show error notification with direct message from handler
      notificationStore.addNotification({
        type: 'warning',
        message: result.error || 'Movement failed',
        duration: 4000
      });
    }
  } catch (error) {
    console.error('[EncounterView] Failed to request token movement:', error);
    // Show error notification for unexpected failures
    notificationStore.addNotification({
      type: 'error',
      message: 'Failed to process movement request. Please try again.',
      duration: 4000
    });
  }
};

const handleViewportChange = (newViewport: { x: number; y: number; scale: number }) => {
  viewport.value = {
    x: newViewport.x,
    y: newViewport.y,
    zoom: newViewport.scale
  };
};

// Handle right-click for context menu
const handleMapRightClick = (x: number, y: number, event?: MouseEvent) => {
  // Store click position for context menu
  contextMenuPosition.value = { 
    x: event?.clientX || 0,
    y: event?.clientY || 0 
  };
  
  // Close any existing context menu
  contextMenuToken.value = null;
  
  // Store position for token placement
  lastClickPosition.value = { x, y, elevation: 0 }; // Default elevation to 0
  
  // For desktop/tablet, show map context menu
  if (deviceConfig.value.type !== 'phone') {
    showMapContextMenu.value = true;
  }
};

// Handle mouse movement for coordinate tracking
const handleMouseMove = (event: MouseEvent, worldX: number, worldY: number) => {
  if (!encounter.value) return;
  
  // Get the canvas element to calculate screen coordinates
  const canvas = event.target as HTMLCanvasElement;
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  
  // Update mouse position with both screen and world coordinates
  mousePosition.value = {
    screenX: Math.round(screenX),
    screenY: Math.round(screenY),
    worldX: Math.round(worldX),
    worldY: Math.round(worldY)
  };
};

// Close all menus when clicking on map
const handleMapClick = (x: number, y: number, event?: MouseEvent) => {
  // Store the click position for token placement
  lastClickPosition.value = { x, y, elevation: 0 }; // Default elevation to 0
  
  // Close all context menus
  showMapContextMenu.value = false;
  contextMenuToken.value = null;
  
  // Track mouse position for context menus if event is available
  if (event) {
    lastClientX.value = event.clientX;
    lastClientY.value = event.clientY;
  }
};

// Track last mouse position for context menus
const lastClientX = ref(0);
const lastClientY = ref(0);
const showMapContextMenu = ref(false);

// Context menu state
const contextMenuToken = ref<Token | null>(null);
const contextMenuPosition = ref({ x: 0, y: 0 });

// Drag and drop state
const isDragOver = ref(false);
const dragEnterCount = ref(0);

// Wall highlighting state
const showWalls = ref(false);
const showObjects = ref(false);
const showPortals = ref(false);
// Light highlighting state
const showLights = ref(false); // Default: lights hidden


// Handle token action from context menu
const handleTokenAction = async (action: string) => {
  if (!contextMenuToken.value) return;
  
  const tokenId = contextMenuToken.value.id;
  const tokenName = contextMenuToken.value.name;
  
  switch (action) {
    case 'move':
      // Set token as selected and enable movement
      handleTokenSelection(tokenId);
      break;
    case 'select':
      // Just select the token
      handleTokenSelection(tokenId);
      break;
    case 'remove':
      // Remove token from encounter using the new request system
      if (confirm(`Remove token "${tokenName}"?`)) {
        try {
          const result = await requestTokenRemove(tokenId);
          
          if (result.success && result.approved) {
            // If this was the selected token, deselect it
            if (selectedToken.value?.id === tokenId) {
              selectedToken.value = null;
            }
          } else if (result.success && !result.approved) {
            // Show notification to user that removal is pending approval
            notificationStore.addNotification({
              type: 'info',
              message: 'Token removal is pending Game Master approval',
              duration: 4000
            });
          } else {
            console.error('[EncounterView] Token removal failed:', result.error);
            // Show error notification to user
            notificationStore.addNotification({
              type: 'warning',
              message: result.error || 'Failed to remove token',
              duration: 4000
            });
          }
        } catch (error) {
          console.error('[EncounterView] Failed to request token removal:', error);
          // Show error notification for unexpected failures
          notificationStore.addNotification({
            type: 'error',
            message: 'Failed to process token removal. Please try again.',
            duration: 4000
          });
        }
      }
      break;
  }
  
  // Close context menu
  contextMenuToken.value = null;
};


// Handle tokens created from ActorTokenGenerator
const handleTokensCreated = async (tokenIds: string[]) => {
  if (!encounter.value || !lastClickPosition.value) return;
  
  try {
    // Convert world coordinates to grid coordinates
    const gridSize = pixiMapViewer.value?.getGridSize ? pixiMapViewer.value.getGridSize() : 50;
    const gridX = Math.floor((lastClickPosition.value.x - gridSize / 2) / gridSize);
    const gridY = Math.floor((lastClickPosition.value.y - gridSize / 2) / gridSize);
    
    // Update the position of each created token
    for (const tokenId of tokenIds) {
      const token = encounterTokens.value.find(t => t.id === tokenId);
      if (token) {
        // Update token position using grid coordinates
        handleTokenMoved(tokenId, gridX, gridY);
      }
    }
    
    // Close the token generator
    showTokenGenerator.value = false;
    
    // Clear the last click position
    lastClickPosition.value = undefined;
  } catch (error) {
    console.error('Failed to place tokens:', error);
  }
};

// Handle map context menu action
const handleMapContextMenuAction = (action: string) => {
  switch (action) {
    case 'add-token':
      // Set lastClickPosition if needed and show token generator
      if (!lastClickPosition.value && encounter.value?.mapId) {
        // Default to center of map if no position is set
        lastClickPosition.value = { x: 100, y: 100, elevation: 0 };
      }
      
      if (encounter.value?.id) {
        showTokenGenerator.value = true;
      }
      break;
    case 'center-view':
      // If we had a mapViewer ref, we could call centerOn here
      break;
    case 'toggle-walls':
      showWalls.value = !showWalls.value;
      break;
    case 'toggle-objects':
      showObjects.value = !showObjects.value;
      break;
    case 'toggle-portals':
      showPortals.value = !showPortals.value;
      break;
    case 'toggle-lights':
      showLights.value = !showLights.value;
      break;
    case 'toggle-debug':
      showDebugInfo.value = !showDebugInfo.value;
      break;
  }
  
  // Close context menu
  showMapContextMenu.value = false;
};

// ============================================================================
// DRAG AND DROP FUNCTIONALITY
// ============================================================================

const handleDragEnter = (event: DragEvent) => {
  event.preventDefault();
  
  // Ignore turn order participant drags
  if (event.dataTransfer?.types.includes('application/turnorder-participant')) {
    return;
  }
  
  dragEnterCount.value++;
  
  if (dragEnterCount.value === 1) {
    isDragOver.value = true;
  }
};

const handleDragLeave = (event: DragEvent) => {
  // Ignore turn order participant drags
  if (event.dataTransfer?.types.includes('application/turnorder-participant')) {
    return;
  }
  
  dragEnterCount.value--;
  
  if (dragEnterCount.value === 0) {
    isDragOver.value = false;
  }
};

const handleDragOver = (event: DragEvent) => {
  // Ignore turn order participant drags
  if (event.dataTransfer?.types.includes('application/turnorder-participant')) {
    return;
  }
  
  event.preventDefault();
  
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
};

const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  
  // Ignore turn order participant drags
  if (event.dataTransfer?.types.includes('application/turnorder-participant')) {
    return;
  }
  
  // Reset drag state
  isDragOver.value = false;
  dragEnterCount.value = 0;
  
  if (!event.dataTransfer) {
    console.error('[EncounterView] No data transfer available on drop');
    return;
  }

  // Validate GM permissions
  if (!gameStateStore.canUpdate) {
    console.warn('[EncounterView] Only the GM can create tokens by dragging');
    return;
  }

  try {
    // Get drag data
    const dragDataStr = event.dataTransfer.getData('application/json');
    if (!dragDataStr) {
      console.error('[EncounterView] No drag data found');
      return;
    }

    const dragData = JSON.parse(dragDataStr);

    // Validate drag data
    if (dragData.type !== 'document-token') {
      console.error('[EncounterView] Invalid drag data type:', dragData.type);
      return;
    }

    // Get the document from game state
    const allDocuments = [
      ...gameStateStore.characters,
      ...gameStateStore.actors,
      ...gameStateStore.items
    ];
    
    const document = allDocuments.find(doc => doc.id === dragData.documentId);
    if (!document) {
      console.error('[EncounterView] Document not found:', dragData.documentId);
      return;
    }

    // Calculate world coordinates from drop position
    const mapContainer = mapContainerRef.value;
    const pixiViewer = pixiMapViewer.value;
    
    if (!mapContainer) {
      console.error('[EncounterView] Map container not found');
      return;
    }
    
    if (!pixiViewer) {
      console.error('[EncounterView] PixiMapViewer not available for coordinate conversion');
      return;
    }

    const rect = mapContainer.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    // Convert screen coordinates to world coordinates using proper PIXI transformation
    const worldCoords = pixiViewer.screenToWorld(screenX, screenY);
    const worldX = Math.round(worldCoords.x);
    const worldY = Math.round(worldCoords.y);

    // Create token using the new method
    await gameStateStore.createTokenFromDocument(document, {
      x: worldX,
      y: worldY,
      elevation: 0
    });

    console.info(`[EncounterView] Created token for ${document.name}`);

  } catch (error) {
    console.error('[EncounterView] Error handling drop:', error);
    
    // Show user-friendly error message
    if (error instanceof Error) {
      // You could show a toast notification here
      console.error('[EncounterView] Failed to create token:', error.message);
    }
  }
};

// Lifecycle
onMounted(() => {
  initializeEncounter();
});

onUnmounted(() => {
  // No cleanup needed for theater mode
});

// Watch for game state encounter changes
watch(
  () => gameStateStore.currentEncounter?.id,
  (newEncounterId, oldEncounterId) => {
    if (newEncounterId && newEncounterId !== oldEncounterId) {
      initializeEncounter();
    } else if (!newEncounterId && oldEncounterId) {
      error.value = null;
      loading.value = false;
    }
  },
  { immediate: true }
);

// Watch for turn changes and auto-select current actor
watch(
  () => gameStateStore.gameState?.turnManager,
  (newTurnManager) => {
    if (!newTurnManager || !newTurnManager.isActive) {
      return;
    }
    
    const activeParticipantId = newTurnManager.participants?.[newTurnManager.currentTurn]?.id;
    
    if (!activeParticipantId) {
      return;
    }
    
    // Find the token for the active participant by document ID
    // Tokens are linked to documents via documentId field
    const activeToken = encounterTokens.value.find(t => 
      t.documentId === activeParticipantId ||
      t.id === activeParticipantId
    );
    
    if (activeToken && (!selectedToken.value || selectedToken.value.id !== activeToken.id)) {
      console.info('[EncounterView] Auto-selecting actor for turn:', activeToken.name);
      selectedToken.value = activeToken;
      // Clear targets when switching actors
      targetTokenIds.value.clear();
      
      // Ensure Vue's reactivity system processes the change
      nextTick(() => {
        // Selected token should be synced to PIXI after this tick
      });
    }
  },
  { deep: true, immediate: true }
);

// Socket connection management is now handled automatically via session rooms

// Handle token update from TokenStateManager
const handleTokenUpdate = async (updatedToken: Token) => {
  if (!encounter.value) return;
  if (!authStore.user?.id) return;
  
  // Validate GM permissions
  if (!gameStateStore.canUpdate) {
    console.warn('[EncounterView] Only GM can update tokens');
    return;
  }
  
  // Check if token exists in the encounter
  if (!encounter.value.tokens?.[updatedToken.id]) {
    console.error('[EncounterView] Token not found for update:', updatedToken.id);
    return;
  }
  
  try {
    // Create state operations to update all token properties
    const { name, imageUrl, bounds, isVisible, isPlayerControlled, conditions } = updatedToken;
    const operations: StateOperation[] = [
      { path: `currentEncounter.tokens.${updatedToken.id}.name`, op: 'replace', value: name },
      { path: `currentEncounter.tokens.${updatedToken.id}.imageUrl`, op: 'replace', value: imageUrl },
      { path: `currentEncounter.tokens.${updatedToken.id}.bounds`, op: 'replace', value: bounds },
      { path: `currentEncounter.tokens.${updatedToken.id}.isVisible`, op: 'replace', value: isVisible },
      { path: `currentEncounter.tokens.${updatedToken.id}.isPlayerControlled`, op: 'replace', value: isPlayerControlled },
      { path: `currentEncounter.tokens.${updatedToken.id}.conditions`, op: 'replace', value: conditions },
      { path: `currentEncounter.tokens.${updatedToken.id}.data`, op: 'replace', value: updatedToken.data || {} }
    ];
    
    const response = await gameStateStore.updateGameState(operations);
    
    if (!response.success) {
      console.error('[EncounterView] Failed to update token:', response.error?.message);
      return;
    }
  } catch (error) {
    console.error('[EncounterView] Failed to update token:', error);
  }
};

function onShowTokenContextMenu({ token, position }: { token: Token; position: { x: number; y: number } }) {
  contextMenuToken.value = token;
  contextMenuPosition.value = position;
  showMapContextMenu.value = false;
}

function onShowEncounterContextMenu({ position }: { position: { x: number; y: number } }) {
  contextMenuToken.value = null;
  contextMenuPosition.value = position;
  showMapContextMenu.value = true;
}

// startOrStopEncounter is not needed - EncounterView only displays active encounters

const isActiveEncounter = computed(() => {
  // EncounterView only renders when there's an active encounter
  return !!gameStateStore.currentEncounter;
});

// HUD layout adjustments - no longer needed as HUD overlays the content
const hudLayoutStyle = computed(() => {
  return {};
});
</script>

<style scoped>

.encounter-view-fullscreen {
  position: fixed;
  top: 64px; /* Below AppHeader */
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: calc(100vh - 64px);
  background: #000;
  margin: 0;
  padding: 0;
  z-index: 30; /* Below bottom navigation (z-40) but above normal content */
}

.encounter-container {
  position: relative;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

.encounter-content {
  width: 100%;
  height: 100%;
  position: relative;
  margin: 0;
  padding: 0;
  transition: all 0.2s ease;
}

.encounter-content[data-drag-over="true"] {
  background-color: rgba(59, 130, 246, 0.1);
  box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.3);
}

.encounter-content[data-drag-over="true"]::before {
  content: 'Drop to create token';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(59, 130, 246, 0.9);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  z-index: 1000;
  pointer-events: none;
}

.encounter-overlays {
  z-index: 10;
}

/* Device-specific styles */
.device-phone .encounter-header {
  @apply p-2;
}

.device-phone .encounter-header h1 {
  @apply text-lg;
}

.device-tablet .encounter-overlays > div {
  @apply text-sm;
}

/* Touch-friendly sizing */
.touch-device button {
  @apply min-h-[44px] min-w-[44px];
}

.no-touch button {
  @apply min-h-[32px] min-w-[32px];
}

/* Reduced motion support */
.reduced-motion * {
  @apply transition-none;
}

.full-motion * {
  @apply transition-all duration-200;
}

/* Mobile adjustments for bottom navigation */
.mobile-with-bottom-nav {
  bottom: 80px; /* Leave space for bottom navigation (64px + 16px padding) */
}

/* Mobile landscape fullscreen - no header or navigation chrome */
.mobile-landscape-fullscreen {
  top: 0 !important;
  height: 100vh !important;
  bottom: 0 !important;
}

/* Fullscreen encounter experience */
</style> 