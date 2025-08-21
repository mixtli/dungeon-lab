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
import { usePixiMap, type UsePixiMapOptions } from '@/composables/usePixiMap.mjs';
import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';
import type { Token } from '@dungeon-lab/shared/types/tokens.mjs';
import type { IUVTT } from '@dungeon-lab/shared/types/index.mjs';
import type { Platform } from '@/services/encounter/PixiMapRenderer.mjs';
import { MapsClient } from '@dungeon-lab/client/index.mjs';
import { transformAssetUrl } from '@/utils/asset-utils.mjs';
import { useDocumentSheetStore } from '@/stores/document-sheet.store.mjs';
import { useGameStateStore } from '@/stores/game-state.store.mjs';

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
  (e: 'token-moved', tokenId: string, x: number, y: number): void;
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
  selectToken,
  deselectToken,
  addTarget,
  clearTargets,
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
  destroy
} = usePixiMap();

// Add new state for drag tracking
const isDragging = ref(false);
const dragStartPos = ref<{ x: number; y: number } | null>(null);
const draggedTokenId = ref<string | null>(null);

// Computed
const loadingText = computed(() => {
  if (!isInitialized.value) return 'Initializing map viewer...';
  if (isLoading.value) return 'Loading map...';
  if (!isLoaded.value) return 'Preparing map...';
  return 'Loading...';
});

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
      onTokenDragStart: handleTokenDragStart,
      onTokenDragMove: handleTokenDragMove,
      onTokenDragEnd: handleTokenDragEnd,
      onTokenClick: (tokenId: string, modifiers: { shift?: boolean; ctrl?: boolean; alt?: boolean }) => {
        emit('token-selected', tokenId, modifiers);
      },
      onTokenDoubleClick: (tokenId: string) => {
        handleTokenDoubleClick(tokenId);
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
      }
    };

    await initializeMap(canvasRef.value, options);
    // enableTokenDragging(true); // This line was removed from destructuring
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
  
  // State
  isInitialized,
  isLoaded,
  viewportState,
  currentMap
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
  // Enable token dragging by default
  // enableTokenDragging(true); // This line was removed from destructuring
  
  // Set up token selection watcher
  watch(pixiSelectedTokenId, (newTokenId) => {
    if (newTokenId) {
      emit('token-selected', newTokenId, {});
    }
  });
};

// Add drag handler methods
const handleTokenDragStart = (tokenId: string, position: { x: number; y: number }) => {
  isDragging.value = true;
  dragStartPos.value = position;
  draggedTokenId.value = tokenId;
  emit('token-selected', tokenId, {});
};

const handleTokenDragMove = (tokenId: string, position: { x: number; y: number }) => {
  if (!isDragging.value || !draggedTokenId.value || draggedTokenId.value !== tokenId) return;
  
  // Get grid size from map data
  const gridSize = currentMap.value?.uvtt?.resolution?.pixels_per_grid || 50;
  
  // Snap to grid
  const snappedPosition = {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize
  };
  
  // Don't move token locally during drag - let the TokenRenderer handle the visual movement
  // moveToken(tokenId, snappedPosition.x, snappedPosition.y);
  
  // Emit move event for parent components
  emit('token-moved', tokenId, snappedPosition.x, snappedPosition.y);
};

const handleTokenDragEnd = async (tokenId: string, position: { x: number; y: number }) => {
  if (!isDragging.value || !draggedTokenId.value || draggedTokenId.value !== tokenId) {
    return;
  }
  
  // Get current token elevation
  const token = props.tokens?.find((t: Token) => t.id === tokenId);
  if (!token) {
    return;
  }
  
  // Emit the token moved event to parent (EncounterView will handle the state update)
  emit('token-moved', tokenId, position.x, position.y);
  
  // Reset drag state
  isDragging.value = false;
  dragStartPos.value = null;
  draggedTokenId.value = null;
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
  
  // Get grid size
  const gridSize = getGridSize();
  
  // Calculate current center position from bounds
  const centerGridX = (token.bounds.topLeft.x + token.bounds.bottomRight.x) / 2;
  const centerGridY = (token.bounds.topLeft.y + token.bounds.bottomRight.y) / 2;
  let newX = centerGridX * gridSize; // Convert to world coordinates
  let newY = centerGridY * gridSize;
  
  switch (event.key) {
    case 'ArrowUp':
      newY -= gridSize;
      break;
    case 'ArrowDown':
      newY += gridSize;
      break;
    case 'ArrowLeft':
      newX -= gridSize;
      break;
    case 'ArrowRight':
      newX += gridSize;
      break;
  }
  
  // Emit the token moved event to parent (EncounterView will handle the state update)
  emit('token-moved', pixiSelectedTokenId.value, newX, newY);
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