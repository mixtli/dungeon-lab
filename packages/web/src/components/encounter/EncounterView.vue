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
    <div v-else-if="encounter" class="encounter-view-fullscreen" :style="hudLayoutStyle">
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
        <HUD v-if="deviceConfig.type !== 'phone'" />
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
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
// Add import for MapContextMenu
import MapContextMenu from './MapContextMenu.vue';
import DiceOverlay from '../dice/DiceOverlay.vue';
import { turnManagerService } from '../../services/turn-manager.service.mjs';

// No props needed - EncounterView always displays the current encounter from game state

// Composables
const gameStateStore = useGameStateStore();
const { deviceConfig, deviceClass } = useDeviceAdaptation();
const { requestTokenMove, requestTokenRemove } = usePlayerActions();
const authStore = useAuthStore();

// Encounter socket functionality removed - using session-based architecture through encounter store

// State
const loading = ref(true);
const error = ref<string | null>(null);
const selectedToken = ref<Token | null>(null);
const targetTokenIds = ref(new Set<string>());
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
  const id = selectedToken.value?.id;
  console.log('[EncounterView] 🔍 Computed selectedToken ID changed:', {
    selectedTokenId: id,
    selectedTokenName: selectedToken.value?.name,
    timestamp: new Date().toISOString()
  });
  return id;
});

// Convert encounter tokens to format expected by PixiMapViewer
const encounterTokens = computed(() => {
  // Tokens are now part of currentEncounter in the unified game state
  const tokens = gameStateStore.currentEncounter?.tokens || [];
  
  console.log('[EncounterView] encounterTokens computed property called', {
    encounterExists: !!gameStateStore.currentEncounter,
    tokensArray: tokens,
    tokenCount: tokens.length,
    tokenIds: tokens.map(t => t.id),
    gameStateLoading: gameStateStore.loading
  });
  
  // Tokens now use the new bounds format - pass them through directly
  return tokens;
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
      console.log('[Debug] Turn manager service initialized with plugin:', pluginId);
    } catch (error) {
      console.warn('[Debug] Failed to initialize turn manager:', error);
      // Don't fail encounter loading if turn manager fails to initialize
    }
  }
  
  console.log('[Debug] EncounterView initialized with encounter:', encounter.value.id);
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
  console.log('[EncounterView] 🖱️ Token selection handler called:', {
    tokenId,
    modifiers,
    hasEncounter: !!encounter.value,
    currentSelectedToken: selectedToken.value?.id,
    targetCount: targetTokenIds.value.size
  });
  
  if (!encounter.value) {
    console.log('[EncounterView] ⚠️ No encounter, aborting selection');
    return;
  }
  
  // Find the token in the encounter
  const tokens = gameStateStore.currentEncounter?.tokens || [];
  const clickedToken = tokens.find((t: Token) => t.id === tokenId) || null;
  
  console.log('[EncounterView] 🔍 Looking for token:', {
    searchingForId: tokenId,
    availableTokens: tokens.map(t => ({ id: t.id, name: t.name })),
    foundToken: clickedToken ? { id: clickedToken.id, name: clickedToken.name } : 'NOT FOUND'
  });
  
  if (!clickedToken) {
    console.log('[EncounterView] ❌ Token not found, aborting selection');
    return;
  }
  
  if (modifiers?.shift) {
    // Shift+click: toggle target selection
    if (targetTokenIds.value.has(tokenId)) {
      targetTokenIds.value.delete(tokenId);
      console.log('[EncounterView] ➖ Removed target:', clickedToken.name);
    } else {
      targetTokenIds.value.add(tokenId);
      console.log('[EncounterView] ➕ Added target:', clickedToken.name);
    }
  } else {
    // Regular click: set as actor, clear targets
    const previousSelectedToken = selectedToken.value;
    selectedToken.value = clickedToken;
    targetTokenIds.value.clear();
    console.log('[EncounterView] 🎯 Selected actor:', {
      previousActor: previousSelectedToken?.name || 'none',
      newActor: clickedToken.name,
      clearedTargets: targetTokenIds.value.size === 0
    });
  }
  
  // Close context menu if open
  contextMenuToken.value = null;
};

const handleTokenMoved = async (tokenId: string, x: number, y: number) => {
  if (!encounter.value) return;
  
  const token = encounter.value.tokens?.find(t => t.id === tokenId);
  if (!token) {
    console.error('Token not found:', tokenId);
    return;
  }
  
  try {
    // Use the new action request system for token movement
    const elevation = token.bounds?.elevation || 0;
    const result = await requestTokenMove(tokenId, { x, y, elevation });
    
    if (result.success && result.approved) {
      console.log('Token movement approved and executed:', tokenId, x, y, elevation);
    } else if (result.success && !result.approved) {
      console.log('Token movement requested, awaiting GM approval:', tokenId);
      // TODO: Show notification to player that movement is pending approval
    } else {
      console.error('Token movement failed:', result.error);
      // TODO: Show error notification to user
    }
  } catch (error) {
    console.error('Failed to request token movement:', error);
    // TODO: Show error notification to user
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
            console.log('Token removal approved and executed:', tokenId);
            // If this was the selected token, deselect it
            if (selectedToken.value?.id === tokenId) {
              selectedToken.value = null;
            }
          } else if (result.success && !result.approved) {
            console.log('Token removal requested, awaiting GM approval:', tokenId);
            // TODO: Show notification to user that removal is pending approval
          } else {
            console.error('Token removal failed:', result.error);
            // TODO: Show error notification to user
          }
        } catch (error) {
          console.error('Failed to request token removal:', error);
          // TODO: Show error notification to user
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
    // Update the position of each created token
    for (const tokenId of tokenIds) {
      const token = encounterTokens.value.find(t => t.id === tokenId);
      if (token) {
        // Update token position and emit socket event
        handleTokenMoved(
          tokenId,
          lastClickPosition.value.x,
          lastClickPosition.value.y
        );
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
  console.log('[Debug] Map context menu action triggered:', action);
  
  switch (action) {
    case 'add-token':
      console.log('[Debug] Add token action triggered');
      console.log('[Debug] Encounter data:', encounter.value);
      
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
      console.log('[Debug] Center view action triggered');
      // If we had a mapViewer ref, we could call centerOn here
      break;
    case 'toggle-walls':
      console.log('[Debug] Toggle walls action triggered, current value:', showWalls.value);
      showWalls.value = !showWalls.value;
      console.log('[Debug] Show walls is now:', showWalls.value);
      break;
    case 'toggle-objects':
      console.log('[Debug] Toggle objects action triggered, current value:', showObjects.value);
      showObjects.value = !showObjects.value;
      console.log('[Debug] Show objects is now:', showObjects.value);
      break;
    case 'toggle-portals':
      console.log('[Debug] Toggle portals action triggered, current value:', showPortals.value);
      showPortals.value = !showPortals.value;
      console.log('[Debug] Show portals is now:', showPortals.value);
      break;
    case 'toggle-lights':
      console.log('[Debug] Toggle lights action triggered, current value:', showLights.value);
      showLights.value = !showLights.value;
      console.log('[Debug] Show lights is now:', showLights.value);
      break;
    case 'toggle-debug':
      console.log('[Debug] Toggle debug action triggered, current value:', showDebugInfo.value);
      showDebugInfo.value = !showDebugInfo.value;
      console.log('[Debug] Show debug info is now:', showDebugInfo.value);
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
    console.log('Ignoring turn order drag in encounter area');
    return;
  }
  
  dragEnterCount.value++;
  
  if (dragEnterCount.value === 1) {
    isDragOver.value = true;
    console.log('Drag entered encounter area');
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
    console.log('Drag left encounter area');
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
    console.log('Ignoring turn order drop in encounter area');
    return;
  }
  
  // Reset drag state
  isDragOver.value = false;
  dragEnterCount.value = 0;
  
  if (!event.dataTransfer) {
    console.error('No data transfer available on drop');
    return;
  }

  // Validate GM permissions
  if (!gameStateStore.canUpdate) {
    console.warn('Only the GM can create tokens by dragging');
    return;
  }

  try {
    // Get drag data
    const dragDataStr = event.dataTransfer.getData('application/json');
    if (!dragDataStr) {
      console.error('No drag data found');
      return;
    }

    const dragData = JSON.parse(dragDataStr);
    console.log('Drop data:', dragData);

    // Validate drag data
    if (dragData.type !== 'document-token') {
      console.error('Invalid drag data type:', dragData.type);
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
      console.error('Document not found:', dragData.documentId);
      return;
    }

    // Calculate world coordinates from drop position
    const mapContainer = mapContainerRef.value;
    const pixiViewer = pixiMapViewer.value;
    
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }
    
    if (!pixiViewer) {
      console.error('PixiMapViewer not available for coordinate conversion');
      return;
    }

    const rect = mapContainer.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    // Convert screen coordinates to world coordinates using proper PIXI transformation
    const worldCoords = pixiViewer.screenToWorld(screenX, screenY);
    const worldX = Math.round(worldCoords.x);
    const worldY = Math.round(worldCoords.y);

    console.log(`Dropping ${document.name} at screen(${screenX}, ${screenY}) -> world(${worldX}, ${worldY})`);

    // Create token using the new method
    const tokenId = await gameStateStore.createTokenFromDocument(document, {
      x: worldX,
      y: worldY,
      elevation: 0
    });

    console.log(`Successfully created token ${tokenId} for document ${document.name}`);

  } catch (error) {
    console.error('Error handling drop:', error);
    
    // Show user-friendly error message
    if (error instanceof Error) {
      // You could show a toast notification here
      console.error('Failed to create token:', error.message);
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
      console.log('[Debug] Current encounter changed, reinitializing view');
      initializeEncounter();
    } else if (!newEncounterId && oldEncounterId) {
      console.log('[Debug] No active encounter, showing empty state');
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
    console.log('[EncounterView] 🎯 Turn manager watcher triggered:', {
      hasTurnManager: !!newTurnManager,
      isActive: newTurnManager?.isActive,
      currentTurn: newTurnManager?.currentTurn,
      participantCount: newTurnManager?.participants?.length,
      participants: newTurnManager?.participants?.map(p => ({ id: p.id, name: p.name }))
    });
    
    if (!newTurnManager || !newTurnManager.isActive) {
      console.log('[EncounterView] ⚠️ No active turn manager, skipping auto-selection');
      return;
    }
    
    const activeParticipantId = newTurnManager.participants?.[newTurnManager.currentTurn]?.id;
    console.log('[EncounterView] 🎯 Active participant ID:', activeParticipantId);
    
    if (!activeParticipantId) {
      console.log('[EncounterView] ⚠️ No active participant ID found');
      return;
    }
    
    // Debug available tokens
    console.log('[EncounterView] 🎲 Available tokens:', encounterTokens.value.map(t => ({
      id: t.id,
      name: t.name,
      documentId: t.documentId,
      documentType: t.documentType
    })));
    
    // Find the token for the active participant by document ID
    // Tokens are linked to documents via documentId field
    const activeToken = encounterTokens.value.find(t => 
      t.documentId === activeParticipantId ||
      t.id === activeParticipantId
    );
    
    console.log('[EncounterView] 🎯 Found active token:', activeToken ? {
      id: activeToken.id,
      name: activeToken.name,
      documentId: activeToken.documentId
    } : 'NOT FOUND');
    
    if (activeToken && (!selectedToken.value || selectedToken.value.id !== activeToken.id)) {
      console.log('[EncounterView] ✅ Auto-selecting actor for turn:', activeToken.name);
      selectedToken.value = activeToken;
      // Clear targets when switching actors
      targetTokenIds.value.clear();
    } else if (activeToken) {
      console.log('[EncounterView] ℹ️ Active token already selected:', activeToken.name);
    } else {
      console.log('[EncounterView] ❌ Could not find token for active participant:', activeParticipantId);
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
    console.warn('Only GM can update tokens');
    return;
  }
  
  // Find the token index in the encounter
  const tokenIndex = encounter.value.tokens?.findIndex(token => token.id === updatedToken.id);
  if (tokenIndex === undefined || tokenIndex === -1) {
    console.error('Token not found for update:', updatedToken.id);
    return;
  }
  
  try {
    // Create state operations to update all token properties
    const { name, imageUrl, bounds, isVisible, isPlayerControlled, conditions } = updatedToken;
    const operations: StateOperation[] = [
      { path: `currentEncounter.tokens.${tokenIndex}.name`, operation: 'set', value: name },
      { path: `currentEncounter.tokens.${tokenIndex}.imageUrl`, operation: 'set', value: imageUrl },
      { path: `currentEncounter.tokens.${tokenIndex}.bounds`, operation: 'set', value: bounds },
      { path: `currentEncounter.tokens.${tokenIndex}.isVisible`, operation: 'set', value: isVisible },
      { path: `currentEncounter.tokens.${tokenIndex}.isPlayerControlled`, operation: 'set', value: isPlayerControlled },
      { path: `currentEncounter.tokens.${tokenIndex}.conditions`, operation: 'set', value: conditions },
      { path: `currentEncounter.tokens.${tokenIndex}.data`, operation: 'set', value: updatedToken.data || {} }
    ];
    
    const response = await gameStateStore.updateGameState(operations);
    
    if (!response.success) {
      console.error('Failed to update token:', response.error?.message);
      return;
    }
    
    console.log('Token updated successfully:', updatedToken.id);
  } catch (error) {
    console.error('Failed to update token:', error);
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
  z-index: 50; /* Above normal content but below modals */
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

/* Fullscreen encounter experience */
</style> 