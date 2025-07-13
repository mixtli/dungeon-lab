<template>
  <div 
    ref="containerRef" 
    class="pixi-map-viewer"
    :class="[
      `platform-${platform}`,
      { 'is-loading': !isInitialized || isLoading }
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
    <div v-if="!isInitialized || isLoading" class="loading-overlay">
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
import type { Platform } from '@/services/encounter/PixiMapRenderer.mjs';
import { MapsClient } from '@dungeon-lab/client/index.mjs';
import { useEncounterStore } from '@/stores/encounter.store.mjs';
import { checkWallCollision, pixelsToGrid } from '@/utils/collision-detection.mjs';
import type { TokenRenderer } from '@/services/encounter/TokenRenderer.mts';
import { getAssetUrl } from '@/utils/getAssetUrl.mjs';

// Initialize maps client and stores
const mapsClient = new MapsClient();
const encounterStore = useEncounterStore();

// Props
interface Props {
  mapId?: string;
  mapData?: IMapResponse;
  tokens?: Token[];
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
  (e: 'token-selected', tokenId: string): void;
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
  selectedTokenId,
  initializeMap,
  loadMap,
  addToken,
  updateToken,
  removeToken,
  moveToken,
  clearAllTokens,
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
    
    console.log('[PixiMapViewer] Loading map:', mapData.name);
    
    // Test image loading separately
    if (mapData.image?.url) {
      const transformedImageUrl = getAssetUrl(mapData.image.url);
      
      try {
        await testImageLoad(transformedImageUrl);
      } catch (imageErr) {
        console.error('[PixiMapViewer] Image loading failed:', imageErr);
        throw new Error(`Image loading failed: ${imageErr instanceof Error ? imageErr.message : 'Unknown image error'} (URL: ${transformedImageUrl})`);
      }
    }
    
    await loadMap(mapData);
    currentMap.value = mapData;
    
    console.log('[PixiMapViewer] Map loaded successfully');
    emit('map-loaded', mapData);
    
    // Fit map to screen after loading
    await nextTick();
    fitToScreen();
    
    // Set initial wall, object, and portal highlights visibility
    setWallHighlights(props.showWalls || false);
    setObjectHighlights(props.showObjects || false);
    setPortalHighlights(props.showPortals || false);
    
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
      console.log('[PixiMapViewer] Image loaded successfully:', {
        url: imageUrl,
        size: `${img.naturalWidth}x${img.naturalHeight}`,
        complete: img.complete
      });
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
    
    console.log('[PixiMapViewer] Starting image load test for:', imageUrl);
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
    
    console.log('[PixiMapViewer] Fetching map data for ID:', mapId);
    
    const mapData = await mapsClient.getMap(mapId);
    console.log('[PixiMapViewer] Map data fetched successfully for:', mapData.name);
    
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
  if (!isInitialized.value || !tokens) return;

  try {
    // Clear existing tokens
    clearAllTokens();
    
    // Add new tokens
    for (const token of tokens) {
      await addToken(token);
    }
    
    tokenCount.value = tokens.length;
    
  } catch (err) {
    console.error('Failed to load tokens:', err);
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
  
  console.log('Window resize detected - viewport management will handle this');
  
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
  watch(selectedTokenId, (newTokenId) => {
    if (newTokenId) {
      emit('token-selected', newTokenId);
    }
  });
};

// Add drag handler methods
const handleTokenDragStart = (tokenId: string, position: { x: number; y: number }) => {
  console.log('[PixiMapViewer] handleTokenDragStart called with:', tokenId, position);
  isDragging.value = true;
  dragStartPos.value = position;
  draggedTokenId.value = tokenId;
  emit('token-selected', tokenId);
  console.log('[PixiMapViewer] handleTokenDragStart completed, isDragging:', isDragging.value, 'draggedTokenId:', draggedTokenId.value);
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
  console.log('[PixiMapViewer] handleTokenDragEnd called with:', tokenId, position);
  console.log('[PixiMapViewer] Current state - isDragging:', isDragging.value, 'draggedTokenId:', draggedTokenId.value);
  
  if (!isDragging.value || !draggedTokenId.value || draggedTokenId.value !== tokenId) {
    console.log('[PixiMapViewer] handleTokenDragEnd returning early due to guard clause');
    return;
  }
  
  // Get grid size from map data
  const gridSize = currentMap.value?.uvtt?.resolution?.pixels_per_grid || 50;
  console.log('[PixiMapViewer] Grid size:', gridSize);
  console.log('[PixiMapViewer] Full map data:', currentMap.value);
  console.log('[PixiMapViewer] UVTT resolution:', currentMap.value?.uvtt?.resolution);
  console.log('[PixiMapViewer] Raw position:', position);
  
  // Snap final position to grid
  const snappedPosition = {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize
  };
  
  console.log('[PixiMapViewer] Snap calculation:');
  console.log('  - x: Math.round(' + position.x + ' / ' + gridSize + ') * ' + gridSize + ' = ' + Math.round(position.x / gridSize) + ' * ' + gridSize + ' = ' + snappedPosition.x);
  console.log('  - y: Math.round(' + position.y + ' / ' + gridSize + ') * ' + gridSize + ' = ' + Math.round(position.y / gridSize) + ' * ' + gridSize + ' = ' + snappedPosition.y);
  console.log('[PixiMapViewer] Snapped position:', snappedPosition);
  
  // Get current token elevation
  const token = encounterStore.encounterTokens.find(t => t.id === tokenId);
  if (!token) {
    console.log('[PixiMapViewer] Token not found in store:', tokenId);
    return;
  }
  
  // Check for wall collision before allowing movement
  const currentGridPos = pixelsToGrid(token.position.x, token.position.y, gridSize);
  const targetGridPos = pixelsToGrid(position.x, position.y, gridSize);
  
  // Use grid coordinates with center offset (0.5, 0.5) to represent cell centers
  const currentCenter = { x: currentGridPos.x + 0.5, y: currentGridPos.y + 0.5 };
  const targetCenter = { x: targetGridPos.x + 0.5, y: targetGridPos.y + 0.5 };
  
  console.log('[PixiMapViewer] Collision check - Current:', currentCenter, 'Target:', targetCenter);
  
  if (checkWallCollision(currentCenter, targetCenter, currentMap.value)) {
    console.log('[PixiMapViewer] Movement blocked by wall collision');
    // Reset drag state without moving token
    isDragging.value = false;
    dragStartPos.value = null;
    draggedTokenId.value = null;
    return;
  }
  
  console.log('[PixiMapViewer] No wall collision detected, allowing movement');
  // Move token through store (this will emit the socket event)
  // TEMPORARILY DISABLE SNAP-TO-GRID - use raw position instead
  await encounterStore.moveToken(tokenId, {
    x: position.x, // Use raw position instead of snappedPosition.x
    y: position.y, // Use raw position instead of snappedPosition.y
    elevation: token.position.elevation
  });
  
  // Reset drag state
  isDragging.value = false;
  dragStartPos.value = null;
  draggedTokenId.value = null;
  console.log('[PixiMapViewer] handleTokenDragEnd completed');
};

// Arrow key handling for token movement
const handleKeyDown = async (event: KeyboardEvent) => {
  // Only handle arrow keys
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    return;
  }
  
  // Must have a selected token
  if (!selectedTokenId.value) {
    return;
  }
  
  // Prevent default browser behavior
  event.preventDefault();
  
  // Get current token from store
  const token = encounterStore.encounterTokens.find(t => t.id === selectedTokenId.value);
  if (!token) {
    return;
  }
  
  // Get grid size
  const gridSize = getGridSize();
  
  // Calculate new position based on arrow key
  let newX = token.position.x;
  let newY = token.position.y;
  
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
  
  console.log(`[PixiMapViewer] Keyboard move: ${event.key} from: {x: ${token.position.x}, y: ${token.position.y}} to: {x: ${newX}, y: ${newY}}`);
  
  // Check for wall collision before allowing movement
  const currentGridPos = pixelsToGrid(token.position.x, token.position.y, gridSize);
  const targetGridPos = pixelsToGrid(newX, newY, gridSize);
  
  // Use grid coordinates with center offset (0.5, 0.5) to represent cell centers
  const currentCenter = { x: currentGridPos.x + 0.5, y: currentGridPos.y + 0.5 };
  const targetCenter = { x: targetGridPos.x + 0.5, y: targetGridPos.y + 0.5 };
  
  console.log('[PixiMapViewer] Keyboard collision check - Current:', currentCenter, 'Target:', targetCenter);
  
  if (checkWallCollision(currentCenter, targetCenter, currentMap.value)) {
    console.log('[PixiMapViewer] Keyboard movement blocked by wall collision');
    return;
  }
  
  console.log('[PixiMapViewer] No wall collision detected, allowing keyboard movement');
  // Move token through store (same as drag end)
  await encounterStore.moveToken(selectedTokenId.value, {
    x: newX,
    y: newY,
    elevation: token.position.elevation
  });
};

// Watchers
watch(() => props.mapId, async (newMapId) => {
  if (newMapId && isInitialized.value) {
    await fetchAndLoadMap(newMapId);
  }
}, { immediate: false });

watch(() => props.mapData, async (newMapData) => {
  if (newMapData && isInitialized.value) {
    await loadMapData(newMapData);
  }
}, { immediate: false });

watch(() => props.tokens, async (newTokens) => {
  if (!newTokens) return;
  console.log('Tokens updated:', newTokens);
  await loadTokens(newTokens);
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
watch(() => props.showLights, (visible) => {
  setLightHighlights(!!visible);
}, { immediate: true });

// Lifecycle
let tokenRendererInstance: TokenRenderer | null = null;

onMounted(async () => {
  await nextTick();
  await initializeViewer();
  
  // Load initial data - prioritize mapData over mapId
  if (props.mapData) {
    await loadMapData(props.mapData);
  } else if (props.mapId) {
    await fetchAndLoadMap(props.mapId);
  }
  
  if (props.tokens) {
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

  // TODO: Refactor usePixiMap to expose tokenRenderer directly for hit testing
  tokenRendererInstance = (usePixiMap() as { tokenRenderer?: TokenRenderer }).tokenRenderer || null;
  if (!tokenRendererInstance) {
    // fallback: try to access via window for debug
    tokenRendererInstance = (window as unknown as { tokenRenderer?: TokenRenderer }).tokenRenderer || null;
  }
  if (canvasRef.value) {
    // Suppress browser context menu so Pixi rightdown events fire
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    canvasRef.value.addEventListener('contextmenu', preventContextMenu);
    // Store cleanup for onUnmounted
    onUnmounted(() => {
      canvasRef.value?.removeEventListener('contextmenu', preventContextMenu);
    });
  }
});

onUnmounted(() => {
  if (props.autoResize) {
    window.removeEventListener('resize', handleResize);
  }
  
  destroy();

  // Remove keydown listener
  window.removeEventListener('keydown', handleKeyDown);

  if (canvasRef.value) {
    canvasRef.value.removeEventListener('contextmenu', handleCanvasContextMenu);
  }
});

const lastMouseEvent = ref<MouseEvent | null>(null);

function handleCanvasContextMenu(event: MouseEvent) {
  event.preventDefault();
  if (!isInitialized.value || isLoading.value) return;
  // Only emit show-encounter-context-menu if the right-click was not on a token (handled by onTokenRightClick)
  emit('show-encounter-context-menu', { position: { x: event.clientX, y: event.clientY } });
}
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