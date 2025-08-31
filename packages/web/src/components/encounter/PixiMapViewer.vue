<template>
  <div 
    ref="containerRef" 
    class="pixi-map-viewer"
    :class="[
      `platform-${platform}`,
      { 'is-loading': !isLoaded || isLoading }
    ]"
  >
    <!-- Canvas container -->
    <div class="canvas-container">
      <canvas 
        ref="canvasRef"
        class="pixi-canvas"
        @contextmenu.prevent
        @click="handleCanvasClick"
        @mousedown="handleCanvasMouseDown"
        @mousemove="handleCanvasMouseMove"
      />
    </div>

    <!-- Loading overlay -->
    <div v-if="!isLoaded || isLoading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p class="loading-text">{{ loadingText }}</p>
      </div>
    </div>

    <!-- Error overlay -->
    <div v-if="error" class="error-overlay">
      <div class="error-content">
        <h3>Map Loading Error</h3>
        <p>{{ error }}</p>
        <button @click="retryLoad" class="retry-button">
          Retry
        </button>
      </div>
    </div>

    <!-- Debug info removed - now consolidated in EncounterDebugInfo component -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { usePixiMap, type UsePixiMapOptions } from '@/composables/usePixiMap.mjs';
import { useDeviceAdaptation } from '@/composables/useDeviceAdaptation.mts';
import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';
import { playerActionService } from '@/services/player-action.service.mjs';
import type { MoveTokenParameters } from '@dungeon-lab/shared/types/index.mjs';
import type { Token } from '@dungeon-lab/shared/types/tokens.mjs';
import type { IUVTT } from '@dungeon-lab/shared/types/index.mjs';
import type { Platform } from '@/services/encounter/PixiMapRenderer.mjs';
import { MapsClient } from '@dungeon-lab/client/index.mjs';
import { transformAssetUrl } from '@/utils/asset-utils.mjs';
import { useDocumentSheetStore } from '@/stores/document-sheet.store.mjs';
import { useGameStateStore } from '@/stores/game-state.store.mjs';
import { pluginRegistry } from '@/services/plugin-registry.mts';

// Token change operations for efficient updates
interface TokenChangeOperation {
  type: 'add' | 'remove' | 'move' | 'update';
  tokenId: string;
  token?: Token;
  oldPosition?: { x: number; y: number; elevation: number };
  newPosition?: { x: number; y: number; elevation: number };
}

/**
 * Compare two token arrays and return the specific changes needed
 */
function diffTokens(oldTokens: Token[] | undefined, newTokens: Token[] | undefined): TokenChangeOperation[] {
  const operations: TokenChangeOperation[] = [];
  
  // Handle empty arrays
  if (!oldTokens && !newTokens) return operations;
  if (!oldTokens) {
    // All tokens are new
    newTokens?.forEach(token => {
      operations.push({ type: 'add', tokenId: token.id, token });
    });
    return operations;
  }
  if (!newTokens) {
    // All tokens removed
    oldTokens.forEach(token => {
      operations.push({ type: 'remove', tokenId: token.id });
    });
    return operations;
  }
  
  // Create maps for efficient lookup
  const oldTokenMap = new Map(oldTokens.map(t => [t.id, t]));
  const newTokenMap = new Map(newTokens.map(t => [t.id, t]));
  
  // Find removed tokens
  for (const oldToken of oldTokens) {
    if (!newTokenMap.has(oldToken.id)) {
      operations.push({ type: 'remove', tokenId: oldToken.id });
    }
  }
  
  // Find new and changed tokens
  for (const newToken of newTokens) {
    const oldToken = oldTokenMap.get(newToken.id);
    
    if (!oldToken) {
      // New token
      operations.push({ type: 'add', tokenId: newToken.id, token: newToken });
    } else {
      // Check for position changes
      const oldPos = getCenterFromBounds(oldToken.bounds);
      const newPos = getCenterFromBounds(newToken.bounds);
      
      const positionChanged = (
        oldPos.x !== newPos.x || 
        oldPos.y !== newPos.y || 
        oldToken.bounds.elevation !== newToken.bounds.elevation
      );
      
      // Check for other data changes (excluding position)
      const dataChanged = (
        oldToken.name !== newToken.name ||
        oldToken.imageUrl !== newToken.imageUrl ||
        oldToken.isVisible !== newToken.isVisible ||
        oldToken.isPlayerControlled !== newToken.isPlayerControlled ||
        JSON.stringify(oldToken.conditions) !== JSON.stringify(newToken.conditions) ||
        JSON.stringify(oldToken.data) !== JSON.stringify(newToken.data)
      );
      
      if (positionChanged && !dataChanged) {
        // Pure movement - most efficient update
        operations.push({
          type: 'move',
          tokenId: newToken.id,
          oldPosition: { ...oldPos, elevation: oldToken.bounds.elevation },
          newPosition: { ...newPos, elevation: newToken.bounds.elevation }
        });
      } else if (dataChanged) {
        // Data changed - need full update (might also include position change)
        operations.push({ type: 'update', tokenId: newToken.id, token: newToken });
      }
      // If neither position nor data changed, no operation needed
    }
  }
  
  return operations;
}

/**
 * Helper function to get center coordinates from token bounds
 */
function getCenterFromBounds(bounds: Token['bounds']) {
  const centerX = (bounds.topLeft.x + bounds.bottomRight.x) / 2;
  const centerY = (bounds.topLeft.y + bounds.bottomRight.y) / 2;
  return { x: centerX, y: centerY };
}

// Initialize maps client
const mapsClient = new MapsClient();

// Initialize stores
const router = useRouter();
const { isPhone } = useDeviceAdaptation();
const documentSheetStore = useDocumentSheetStore();
const gameStateStore = useGameStateStore();

// Track previous map data to detect actual map changes (not token movements)
const previousMapData = ref<{
  id?: string;
  name?: string;
  imageUrl?: string;
  uvttData?: IUVTT;
} | null>(null);

// Props
interface Props {
  mapId?: string;
  mapData?: IMapResponse;
  tokens?: Token[];
  selectedTokenId?: string;
  targetTokenIds?: Set<string>;
  platform?: Platform;
  width?: number;
  height?: number;
  autoResize?: boolean;
  showWalls?: boolean;
  showObjects?: boolean;
  showPortals?: boolean;
  showLights?: boolean; // <-- Add this line
}

const props = withDefaults(defineProps<Props>(), {
  platform: 'desktop',
  autoResize: true,
  showWalls: false,
  showObjects: false,
  showPortals: false,
  showLights: false // <-- Add this line
});

// Emits
interface Emits {
  (e: 'map-loaded', mapData: IMapResponse): void;
  (e: 'map-error', error: string): void;
  (e: 'token-selected', tokenId: string, modifiers?: { shift?: boolean; ctrl?: boolean; alt?: boolean }): void;
  (e: 'token-moved', tokenId: string, gridX: number, gridY: number): void;
  (e: 'viewport-changed', viewport: { x: number; y: number; scale: number }): void;
  (e: 'canvas-click', x: number, y: number, event: MouseEvent): void;
  (e: 'canvas-right-click', x: number, y: number, event: MouseEvent): void;
  (e: 'mousemove', event: MouseEvent, worldX: number, worldY: number): void;
  (e: 'show-token-context-menu', contextMenuData: { token: Token; position: { x: number; y: number } }): void;
  (e: 'show-encounter-context-menu', contextMenuData: { position: { x: number; y: number } }): void;
}

const emit = defineEmits<Emits>();

// Template refs
const containerRef = ref<HTMLDivElement>();
const canvasRef = ref<HTMLCanvasElement>();

// Local state
const isLoading = ref(false);
const error = ref<string | null>(null);
const currentMap = ref<IMapResponse | null>(null);
const tokenCount = ref(0);
const suppressNextMapContextMenu = ref(false);

// Pixi map composable
const {
  isLoaded,
  isInitialized,
  viewportState,
  selectedTokenId: pixiSelectedTokenId,
  initializeMap,
  loadMap,
  addToken,
  updateToken,
  removeToken,
  moveToken,
  clearAllTokens,
  updateTokenStatusBars,
  selectToken,
  deselectToken,
  addTarget,
  clearTargets,
  restoreTokenVisibility,
  getGridSize,
  panTo,
  zoomTo,
  zoomAt,
  fitToScreen,
  centerOn,
  screenToWorld,
  worldToScreen,
  setWallHighlights,
  setObjectHighlights,
  setPortalHighlights,
  setLightHighlights,
  tokenRenderer,
  destroy
} = usePixiMap();


// Computed
const loadingText = computed(() => {
  if (!isInitialized.value) return 'Initializing map viewer...';
  if (isLoading.value) return 'Loading map...';
  if (!isLoaded.value) return 'Preparing map...';
  return 'Loading...';
});

// Helper functions for grid coordinate calculations
const worldToGridCoords = (worldX: number, worldY: number) => {
  const gridSize = getGridSize();
  return {
    x: Math.round((worldX - gridSize / 2) / gridSize),
    y: Math.round((worldY - gridSize / 2) / gridSize)
  };
};

const calculateTokenTopLeft = (tokenId: string, cursorGridPos: { x: number; y: number }) => {
  const token = props.tokens?.find(t => t.id === tokenId);
  if (!token) return cursorGridPos;
  
  const tokenGridWidth = token.bounds.bottomRight.x - token.bounds.topLeft.x + 1;
  const tokenGridHeight = token.bounds.bottomRight.y - token.bounds.topLeft.y + 1;
  
  return {
    x: cursorGridPos.x - Math.floor(tokenGridWidth / 2),
    y: cursorGridPos.y - Math.floor(tokenGridHeight / 2)
  };
};

/**
 * Send a move token request through the player action service
 */
const requestMoveToken = async (tokenId: string, gridPosition: { x: number; y: number }) => {
  try {
    const parameters: MoveTokenParameters = {
      tokenId,
      newPosition: {
        gridX: gridPosition.x,
        gridY: gridPosition.y
      }
    };
    
    console.log('[PixiMapViewer] Requesting token move:', { tokenId, gridPosition, parameters });
    
    const result = await playerActionService.requestAction(
      'move-token',
      undefined, // actorId - not needed for token movement
      parameters,
      tokenId, // actorTokenId
      undefined, // targetTokenIds
      { 
        description: `Move token to grid position (${gridPosition.x}, ${gridPosition.y})` 
      }
    );
    
    console.log('[PixiMapViewer] Move token request result:', result);
    
    if (!result.success) {
      console.error('[PixiMapViewer] Token move request failed:', result.error);
      // TODO: Show user-friendly error message
    }
    
    return result;
  } catch (error) {
    console.error('[PixiMapViewer] Error requesting token move:', error);
    return {
      success: false,
      approved: false,
      requestId: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Methods
const initializeViewer = async () => {
  if (!canvasRef.value || !containerRef.value) return;

  try {
    error.value = null;
    
    const rect = containerRef.value.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    const options: UsePixiMapOptions = {
      platform: props.platform,
      width,
      height,
      autoResize: props.autoResize,
      onTokenClick: (tokenId: string, modifiers: { shift?: boolean; ctrl?: boolean; alt?: boolean }) => {
        emit('token-selected', tokenId, modifiers);
      },
      onTokenDoubleClick: (tokenId: string) => {
        handleTokenDoubleClick(tokenId);
      },
      onTokenLongPress: (tokenId: string) => {
        handleTokenLongPress(tokenId);
      },
      onTokenRightClick: (tokenId: string) => {
        const token = props.tokens?.find(t => t.id === tokenId) || null;
        if (token && lastMouseEvent.value) {
          emit('show-token-context-menu', {
            token,
            position: { x: lastMouseEvent.value.clientX, y: lastMouseEvent.value.clientY }
          });
          suppressNextMapContextMenu.value = true;
        }
      },
      
      // Drag event handlers - Phase 1: drag with return to original position
      onTokenDragStart: (tokenId: string, worldPos: { x: number; y: number }) => {
        console.log('🎯 Token drag started:', { tokenId, worldPos });
      },
      onTokenDragMove: (tokenId: string, worldPos: { x: number; y: number }) => {
        // Throttle drag move logging to avoid console spam
        if (Math.random() < 0.1) { // Log only 10% of drag moves
          console.log('🔄 Token dragging:', { tokenId, worldPos });
        }
      },
      onTokenDragEnd: async (tokenId: string, startPos: { x: number; y: number }, endPos: { x: number; y: number }) => {
        // Calculate grid coordinates
        const cursorGridPos = worldToGridCoords(endPos.x, endPos.y);
        const tokenTopLeftGridPos = calculateTokenTopLeft(tokenId, cursorGridPos);
        
        console.log('🎯 Token drag ended - requesting movement:', { 
          tokenId, 
          startPos, 
          endPos,
          distance: Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)),
          cursorGridPosition: `(${cursorGridPos.x}, ${cursorGridPos.y})`,
          tokenTopLeftGridPosition: `(${tokenTopLeftGridPos.x}, ${tokenTopLeftGridPos.y})`
        });
        
        // Send move token request and wait for result
        const result = await requestMoveToken(tokenId, tokenTopLeftGridPos);
        
        // Only restore token visibility if the request failed
        if (!result.success || !result.approved) {
          console.log('❌ Token move failed, restoring token visibility at original position:', result.error);
          restoreTokenVisibility(tokenId);
        } else {
          console.log('✅ Token move approved, waiting for game state update');
          // Don't restore visibility - let the game state update handle the final positioning and visibility
        }
      }
    };

    await initializeMap(canvasRef.value, options);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to initialize map viewer';
    error.value = errorMessage;
    emit('map-error', errorMessage);
    console.error('Failed to initialize Pixi map viewer:', err);
  }
};

const loadMapData = async (mapData: IMapResponse) => {
  if (!isInitialized.value) {
    console.warn('Cannot load map: viewer not initialized');
    return;
  }

  try {
    isLoading.value = true;
    error.value = null;
    
    console.info('[PixiMapViewer] Loading map:', mapData.name);
    
    // Test image loading separately
    if (mapData.image?.url) {
      const transformedImageUrl = transformAssetUrl(mapData.image.url);
      
      try {
        await testImageLoad(transformedImageUrl);
      } catch (imageErr) {
        console.error('[PixiMapViewer] Image loading failed:', imageErr);
        throw new Error(`Image loading failed: ${imageErr instanceof Error ? imageErr.message : 'Unknown image error'} (URL: ${transformedImageUrl})`);
      }
    }
    
    await loadMap(mapData);
    currentMap.value = mapData;
    
    console.info('[PixiMapViewer] Map loaded successfully');
    emit('map-loaded', mapData);
    
    // Fit map to screen after loading
    await nextTick();
    fitToScreen();
    
    // Set initial wall, object, portal, and light highlights visibility
    setWallHighlights(props.showWalls || false);
    setObjectHighlights(props.showObjects || false);
    setPortalHighlights(props.showPortals || false);
    setLightHighlights(props.showLights || false);
    
  } catch (err) {
    const errorDetails = {
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : 'No stack trace',
      mapId: mapData.id,
      mapName: mapData.name,
      imageUrl: mapData.image?.url,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      canvasReady: !!canvasRef.value,
      canvasSize: canvasRef.value ? `${canvasRef.value.width}x${canvasRef.value.height}` : 'n/a',
      containerSize: containerRef.value ? `${containerRef.value.offsetWidth}x${containerRef.value.offsetHeight}` : 'n/a'
    };
    
    console.error('[PixiMapViewer] Detailed map load error:', errorDetails);
    
    const errorMessage = `Map load failed: ${errorDetails.message} (Map: ${mapData.name}, Canvas: ${errorDetails.canvasSize}, Time: ${errorDetails.timestamp})`;
    error.value = errorMessage;
    emit('map-error', errorMessage);
  } finally {
    isLoading.value = false;
  }
};

// Helper function to test image loading
const testImageLoad = (imageUrl: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Handle CORS
    
    img.onload = () => {
      resolve();
    };
    
    img.onerror = (event) => {
      console.error('[PixiMapViewer] Image load error:', {
        url: imageUrl,
        event,
        networkState: navigator.onLine ? 'online' : 'offline'
      });
      reject(new Error(`Failed to load image from ${imageUrl}`));
    };
    
    img.src = imageUrl;
  });
};

const fetchAndLoadMap = async (mapId: string) => {
  if (!isInitialized.value) {
    console.warn('Cannot fetch map: viewer not initialized');
    return;
  }

  try {
    isLoading.value = true;
    error.value = null;
    
    const mapData = await mapsClient.getMap(mapId);
    
    await loadMapData(mapData);
    
  } catch (err) {
    const errorDetails = {
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : 'No stack trace',
      mapId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      networkState: navigator.onLine ? 'online' : 'offline'
    };
    
    console.error('[PixiMapViewer] Detailed fetch error:', errorDetails);
    
    const errorMessage = `Map fetch failed: ${errorDetails.message} (MapID: ${mapId}, Network: ${navigator.onLine ? 'online' : 'offline'}, Time: ${errorDetails.timestamp})`;
    error.value = errorMessage;
    emit('map-error', errorMessage);
  } finally {
    isLoading.value = false;
  }
};

const loadTokens = async (tokens: Token[]) => {
  if (!isInitialized.value || !tokens) {
    return;
  }

  try {
    // Clear existing tokens
    clearAllTokens();
    
    // Add new tokens
    for (const token of tokens) {
      await addToken(token);
    }
    
    tokenCount.value = tokens.length;
    
    // Update status bars for all tokens after loading
    refreshAllTokenStatusBars();
    
  } catch (err) {
    console.error('[PixiMapViewer] Failed to load tokens:', err);
    throw err;
  }
};

const retryLoad = async () => {
  error.value = null;
  
  if (props.mapData) {
    await loadMapData(props.mapData);
  }
  
  if (props.tokens) {
    await loadTokens(props.tokens);
  }
};

const handleResize = async () => {
  if (!props.autoResize || !containerRef.value || !isInitialized.value) return;
  
  // The ResizeObserver set up in usePixiMap handles resize automatically
  
  // The ResizeObserver set up in usePixiMap should handle this automatically
  // We don't need to do anything here as the ResizeObserver will call mapRenderer.resize()
  // when the container size changes
  
  // Optional: If we want to explicitly trigger a resize, we can do it properly
  // without destroying the app (but this is usually not necessary)
  // const rect = containerRef.value.getBoundingClientRect();
  // if (rect.width > 0 && rect.height > 0) {
  //   // The ResizeObserver will handle this automatically
  // }
};

/**
 * Force selection of a token, bypassing Vue reactivity
 * This ensures PIXI selection is applied even if Vue thinks the token is already selected
 */
const forceSelectToken = (tokenId: string): void => {
  if (!isInitialized.value) {
    console.warn('[PixiMapViewer] Cannot force select: not initialized');
    return;
  }
  selectToken(tokenId);
};

// Expose methods for parent components
defineExpose({
  // Map operations
  loadMap: loadMapData,
  fitToScreen,
  centerOn,
  
  // Token operations
  addToken,
  updateToken,
  removeToken,
  moveToken,
  clearAllTokens,
  forceSelectToken, // New method for bypassing Vue reactivity
  
  // Viewport operations
  panTo,
  zoomTo,
  zoomAt,
  
  // Coordinate conversion
  screenToWorld,
  worldToScreen,
  
  // Grid operations
  getGridSize,
  
  // State
  isInitialized,
  isLoaded,
  viewportState,
  currentMap,
  
  // Services (for advanced use cases)
  tokenRenderer
});

// New canvas event handlers
const handleCanvasClick = (event: MouseEvent) => {
  if (!isInitialized.value || isLoading.value) return;
  
  // Convert screen coordinates to world coordinates
  const { x, y } = screenToWorld(event.offsetX, event.offsetY);
  
  // Emit canvas click event with the original MouseEvent
  emit('canvas-click', x, y, event);
};

const handleCanvasMouseDown = (event: MouseEvent) => {
  if (!isInitialized.value || isLoading.value) return;
  
  // Right click
  if (event.button === 2) {
    if (suppressNextMapContextMenu.value) {
      suppressNextMapContextMenu.value = false;
      return;
    }
    emit('show-encounter-context-menu', { position: { x: event.clientX, y: event.clientY } });
  }
};

const handleCanvasMouseMove = (event: MouseEvent) => {
  lastMouseEvent.value = event;
  if (!isInitialized.value || isLoading.value) return;
  
  // Convert screen coordinates to world coordinates
  const { x, y } = screenToWorld(event.offsetX, event.offsetY);
  
  // Emit mousemove event with both screen and world coordinates
  emit('mousemove', event, x, y);
};

// Set up token interaction
const setupTokenInteractions = () => {
  
  // Set up token selection watcher
  watch(pixiSelectedTokenId, (newTokenId) => {
    if (newTokenId) {
      emit('token-selected', newTokenId, {});
    }
  });
};


const handleTokenDoubleClick = (tokenId: string) => {
  // Find the token in props to get the document ID
  const token = props.tokens?.find(t => t.id === tokenId);
  if (!token || !token.documentId) {
    console.warn('[PixiMapViewer] Cannot open character sheet: token or documentId not found', { tokenId, token });
    return;
  }
  
  // Find the character/actor in the game state
  const character = gameStateStore.characters.find(c => c.id === token.documentId);
  const actor = gameStateStore.actors.find(a => a.id === token.documentId);
  
  const document = character || actor;
  if (!document) {
    console.warn('[PixiMapViewer] Cannot open character sheet: document not found in game state', { 
      documentId: token.documentId, 
      charactersCount: gameStateStore.characters.length,
      actorsCount: gameStateStore.actors.length 
    });
    return;
  }
  
  documentSheetStore.openDocumentSheet(document);
};

const handleTokenLongPress = (tokenId: string) => {
  // Only handle long press on mobile devices
  if (!isPhone.value) {
    return;
  }
  
  // Find the token in props to get the document ID
  const token = props.tokens?.find(t => t.id === tokenId);
  if (!token || !token.documentId) {
    console.warn('[PixiMapViewer] Cannot navigate to actor: token or documentId not found', { tokenId, token });
    return;
  }
  
  // Navigate to mobile container with actor sheet open
  router.push({
    name: 'mobile-container',
    query: { 
      tab: 'actors',
      actor: token.documentId
    }
  });
};

/**
 * Get the first available plugin (for now - could be more sophisticated)
 */
const getActivePlugin = () => {
  const plugins = pluginRegistry.getPlugins();
  return plugins.length > 0 ? plugins[0] : null;
};

/**
 * Update status bars for a token based on its linked document
 */
const refreshTokenStatusBars = (token: Token) => {
  try {
    if (!token.documentId) {
      console.debug('[PixiMapViewer] Token has no documentId, skipping status bars:', token.id);
      return;
    }
    
    // Find the linked document using the correct access pattern
    const document = gameStateStore.getDocument(token.documentId);
    if (!document) {
      console.debug('[PixiMapViewer] Document not found for token:', token.id, 'documentId:', token.documentId);
      return;
    }
    
    // Get the active plugin
    const activePlugin = getActivePlugin();
    if (!activePlugin) {
      console.debug('[PixiMapViewer] No active plugin available, skipping status bars');
      return;
    }
    
    // Check if the plugin has status bar configuration for this document type
    const statusBarConfigs = activePlugin.getTokenStatusBarConfig(document.documentType);
    if (!statusBarConfigs || statusBarConfigs.length === 0) {
      console.debug('[PixiMapViewer] No status bar config for document type:', document.documentType);
      return;
    }
    
    // Update the status bars using the usePixiMap composable
    updateTokenStatusBars(token.id, document, activePlugin);
    console.debug('[PixiMapViewer] Updated status bars for token:', token.id, 'document:', document.documentType);
    
  } catch (error) {
    console.warn('[PixiMapViewer] Failed to update status bars for token:', token.id, error);
  }
};

/**
 * Update status bars for all tokens that have linked documents
 */
const refreshAllTokenStatusBars = () => {
  try {
    if (!props.tokens || props.tokens.length === 0) {
      console.debug('[PixiMapViewer] No tokens to update status bars for');
      return;
    }
    
    // Check if we have the necessary dependencies
    if (!isInitialized.value) {
      console.debug('[PixiMapViewer] Not initialized yet, skipping status bar updates');
      return;
    }
    
    const tokensWithDocs = props.tokens.filter(token => token.documentId);
    console.debug(`[PixiMapViewer] Updating status bars for ${tokensWithDocs.length}/${props.tokens.length} tokens`);
    
    for (const token of tokensWithDocs) {
      refreshTokenStatusBars(token);
    }
    
  } catch (error) {
    console.warn('[PixiMapViewer] Failed to update all token status bars:', error);
  }
};

// Arrow key handling for token movement
const handleKeyDown = async (event: KeyboardEvent) => {
  // Only handle arrow keys
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    return;
  }
  
  // Must have a selected token
  if (!pixiSelectedTokenId.value) {
    return;
  }
  
  // Prevent default browser behavior
  event.preventDefault();
  
  // Get current token from props
  const token = props.tokens?.find((t: Token) => t.id === pixiSelectedTokenId.value);
  if (!token) {
    return;
  }
  
  // Get current top-left grid position directly from bounds
  let targetGridX = token.bounds.topLeft.x;
  let targetGridY = token.bounds.topLeft.y;
  
  console.log('[Arrow Key Debug] Token movement:', {
    key: event.key,
    tokenId: pixiSelectedTokenId.value,
    bounds: token.bounds,
    currentTopLeft: { gridX: targetGridX, gridY: targetGridY }
  });
  
  // Move by one grid cell
  switch (event.key) {
    case 'ArrowUp':
      targetGridY -= 1;
      break;
    case 'ArrowDown':
      targetGridY += 1;
      break;
    case 'ArrowLeft':
      targetGridX -= 1;
      break;
    case 'ArrowRight':
      targetGridX += 1;
      break;
  }
  
  console.log('[Arrow Key Debug] Target grid coordinates:', {
    key: event.key,
    targetGrid: { gridX: targetGridX, gridY: targetGridY }
  });
  
  // Emit the token moved event with grid coordinates
  emit('token-moved', pixiSelectedTokenId.value, targetGridX, targetGridY);
};

// Watchers
watch(() => props.mapId, async (newMapId) => {
  if (newMapId && isInitialized.value) {
    await fetchAndLoadMap(newMapId);
  }
}, { immediate: false });

watch(() => props.mapData, async (newMapData) => {
  if (!newMapData || !isInitialized.value) {
    return;
  }
  
  // Check if actual map content changed (not just token positions)
  const hasMapChanged = !previousMapData.value || 
    previousMapData.value.id !== newMapData.id ||
    previousMapData.value.name !== newMapData.name ||
    previousMapData.value.imageUrl !== newMapData.image?.url ||
    JSON.stringify(previousMapData.value.uvttData) !== JSON.stringify(newMapData.uvtt);
  
  if (hasMapChanged) {
    console.info('[PixiMapViewer] Map content changed, reloading:', newMapData.name);
    previousMapData.value = {
      id: newMapData.id,
      name: newMapData.name,
      imageUrl: newMapData.image?.url,
      uvttData: newMapData.uvtt
    };
    await loadMapData(newMapData);
  }
}, { immediate: false });

watch(() => props.tokens, async (newTokens, oldTokens) => {
  if (!isInitialized.value) {
    return;
  }
  
  // Debug: Check if tokens are same object references (due to in-place updates)
  if (oldTokens && newTokens && oldTokens.length > 0 && newTokens.length > 0) {
    const sameReference = oldTokens[0] === newTokens[0];
    if (sameReference) {
      console.log('[PixiMapViewer] Detected same token references - using force reload instead of diff');
      // With in-place updates, token objects are the same reference
      // so diffing won't work. Force reload all tokens.
      try {
        await loadTokens(newTokens);
        
        // Apply pending selection after tokens are loaded
        if (props.selectedTokenId) {
          selectToken(props.selectedTokenId);
        }
      } catch (error) {
        console.error('[PixiMapViewer] Force token reload failed:', error);
      }
      return;
    }
  }
  
  // Handle complete token clearing
  if (!newTokens || newTokens.length === 0) {
    clearAllTokens();
    return;
  }
  
  // Handle initial load (no old tokens)
  if (!oldTokens || oldTokens.length === 0) {
    try {
      await loadTokens(newTokens);
      
      // Apply pending selection after tokens are loaded
      if (props.selectedTokenId) {
        selectToken(props.selectedTokenId);
      }
    } catch (error) {
      console.error('[PixiMapViewer] Initial token loading failed:', error);
    }
    return;
  }
  
  // Smart diffing for efficient updates
  const operations = diffTokens(oldTokens, newTokens);
  
  // Apply each operation efficiently
  try {
    for (const operation of operations) {
      switch (operation.type) {
        case 'add':
          if (operation.token) {
            await addToken(operation.token);
          }
          break;
          
        case 'remove':
          removeToken(operation.tokenId);
          break;
          
        case 'move':
          if (operation.newPosition) {
            // Convert grid coordinates to world coordinates  
            const gridSize = getGridSize();
            const worldX = operation.newPosition.x * gridSize;
            const worldY = operation.newPosition.y * gridSize;
            moveToken(operation.tokenId, worldX, worldY, false); // No animation for efficiency
          }
          break;
          
        case 'update':
          if (operation.token) {
            await updateToken(operation.token);
          }
          break;
      }
    }
    
    // Apply pending selection after token updates (in case the selected token was just added)
    if (props.selectedTokenId) {
      selectToken(props.selectedTokenId);
    }
    
    // Update status bars for affected tokens
    refreshAllTokenStatusBars();
  } catch (error) {
    console.error('[PixiMapViewer] Smart token updates failed:', error);
    // Fallback to full reload on error
    console.warn('[PixiMapViewer] Falling back to full token reload');
    await loadTokens(newTokens);
    
    // Apply pending selection after fallback reload
    if (props.selectedTokenId) {
      selectToken(props.selectedTokenId);
    }
  }
}, { deep: true });

watch(viewportState, (newViewport) => {
  if (newViewport) {
    emit('viewport-changed', {
      x: newViewport.x,
      y: newViewport.y,
      scale: newViewport.scale
    });
  }
}, { deep: true });

// Watch for changes to wall highlights prop
watch(() => props.showWalls, (newValue) => {
  if (isInitialized.value) {
    setWallHighlights(newValue || false);
  }
}, { immediate: true });

// Watch for changes to object highlights prop
watch(() => props.showObjects, (newValue) => {
  if (isInitialized.value) {
    setObjectHighlights(newValue || false);
  }
}, { immediate: true });

// Watch for changes to portal highlights prop
watch(() => props.showPortals, (newValue) => {
  if (isInitialized.value) {
    setPortalHighlights(newValue || false);
  }
}, { immediate: true });

// Watch for showLights prop changes and update light visibility
watch(() => props.showLights, (newValue) => {
  if (isInitialized.value) {
    setLightHighlights(newValue || false);
  }
}, { immediate: true });

// Watch for selectedTokenId prop changes and sync to PIXI
watch(() => props.selectedTokenId, (newSelectedId, oldSelectedId) => {
  if (!isInitialized.value) {
    return;
  }
  
  // Deselect old token
  if (oldSelectedId) {
    deselectToken(oldSelectedId);
  }
  
  // Select new token
  if (newSelectedId) {
    selectToken(newSelectedId);
  }
}, { immediate: true });


// Watch for targetTokenIds prop changes and sync to PIXI  
watch(() => props.targetTokenIds, (newTargetIds) => {
  if (!isInitialized.value) return;
  
  // Clear all existing targets first
  clearTargets();
  
  // Add new targets
  if (newTargetIds) {
    for (const tokenId of newTargetIds) {
      addTarget(tokenId);
    }
  }
}, { immediate: true, deep: true });

// Watch for document state changes and update status bars
watch(() => gameStateStore.gameState, () => {
  // Update status bars when any document changes (like HP changes)
  // Note: Watching gameState instead of documents since documents is not directly exposed
  // Use nextTick to defer updates until after Vue finishes applying state changes
  // This prevents hash mismatches during gameState updates
  nextTick(() => {
    refreshAllTokenStatusBars();
  });
}, { deep: true });

// Watch for plugin registry changes (plugin loads/unloads)
watch(() => pluginRegistry.getPlugins(), () => {
  // Update status bars when plugin availability changes
  // Use nextTick for consistency and safety
  nextTick(() => {
    refreshAllTokenStatusBars();
  });
}, { deep: true });

// Lifecycle
let preventContextMenu: ((e: MouseEvent) => void) | null = null;

onMounted(async () => {
  await nextTick();
  await initializeViewer();
  
  // Load initial data - prioritize mapData over mapId
  if (props.mapData) {
    await loadMapData(props.mapData);
  } else if (props.mapId) {
    await fetchAndLoadMap(props.mapId);
  }
  
  // Initialize map data tracking after initial map load
  if (props.mapData) {
    previousMapData.value = {
      id: props.mapData.id,
      name: props.mapData.name,
      imageUrl: props.mapData.image?.url,
      uvttData: props.mapData.uvtt
    };
  }
  
  if (props.tokens && props.tokens.length > 0) {
    await loadTokens(props.tokens);
  }
  
  // Set up resize listener
  if (props.autoResize) {
    window.addEventListener('resize', handleResize);
  }
  
  // Set up token interactions
  setupTokenInteractions();

  // Set up keydown listener for arrow key movement
  window.addEventListener('keydown', handleKeyDown);

  // Access tokenRenderer from the properly exposed usePixiMap instance
  if (canvasRef.value) {
    // Suppress browser context menu so Pixi rightdown events fire
    preventContextMenu = (e: MouseEvent) => e.preventDefault();
    canvasRef.value.addEventListener('contextmenu', preventContextMenu);
  }
});

onUnmounted(() => {
  if (props.autoResize) {
    window.removeEventListener('resize', handleResize);
  }
  
  destroy();

  // Remove keydown listener
  window.removeEventListener('keydown', handleKeyDown);

  // Clean up context menu listener
  if (preventContextMenu && canvasRef.value) {
    canvasRef.value.removeEventListener('contextmenu', preventContextMenu);
  }
});

const lastMouseEvent = ref<MouseEvent | null>(null);

</script>

<style scoped>
.pixi-map-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #1a1a1a;
  border-radius: 8px;
  cursor: default;
}

.pixi-map-viewer.dragging {
  cursor: grabbing;
}

.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.pixi-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
}

.pixi-canvas:active {
  cursor: grabbing;
}

/* Loading overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(26, 26, 26, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  text-align: center;
  color: #ffffff;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #333;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  margin: 0;
  font-size: 14px;
  opacity: 0.8;
}

/* Error overlay */
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(26, 26, 26, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.error-content {
  text-align: center;
  color: #ffffff;
  max-width: 400px;
  padding: 24px;
}

.error-content h3 {
  margin: 0 0 16px;
  color: #ff6b6b;
  font-size: 18px;
}

.error-content p {
  margin: 0 0 24px;
  font-size: 14px;
  opacity: 0.8;
  line-height: 1.5;
}

.retry-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #0056b3;
}

/* Debug info */
.debug-info {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 5;
}

.debug-panel {
  background-color: rgba(0, 0, 0, 0.8);
  color: #ffffff;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  min-width: 200px;
}

.debug-panel h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #007bff;
}

.debug-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.debug-item:last-child {
  margin-bottom: 0;
}

.debug-item span:first-child {
  opacity: 0.7;
}

/* Platform-specific styles */
.platform-desktop .pixi-canvas {
  cursor: grab;
}

.platform-desktop .pixi-canvas:active {
  cursor: grabbing;
}

.platform-tablet .pixi-canvas {
  cursor: default;
  touch-action: none;
}

.platform-phone .pixi-canvas {
  cursor: default;
  touch-action: none;
}

/* Loading state */
.is-loading .pixi-canvas {
  opacity: 0.5;
  pointer-events: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .debug-info {
    top: 8px;
    right: 8px;
  }
  
  .debug-panel {
    padding: 8px;
    font-size: 11px;
    min-width: 150px;
  }
  
  .loading-spinner {
    transform: scale(0.8);
  }
}

@media (max-width: 480px) {
  .debug-panel {
    font-size: 10px;
    min-width: 120px;
  }
  
  .error-content {
    padding: 16px;
    max-width: 300px;
  }
  
  .error-content h3 {
    font-size: 16px;
  }
  
  .error-content p {
    font-size: 13px;
  }
}
</style> 