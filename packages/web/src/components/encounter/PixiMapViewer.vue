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

    <!-- Debug info (development only) -->
    <div v-if="showDebugInfo && isInitialized" class="debug-info">
      <div class="debug-panel">
        <h4>Debug Info</h4>
        <div class="debug-item">
          <span>Viewport:</span>
          <span v-if="viewportState">
            {{ Math.round(viewportState.x) }}, {{ Math.round(viewportState.y) }} 
            ({{ (viewportState.scale * 100).toFixed(0) }}%)
          </span>
        </div>
        <div class="debug-item">
          <span>Platform:</span>
          <span>{{ platform }}</span>
        </div>
        <div class="debug-item">
          <span>Tokens:</span>
          <span>{{ tokenCount }}</span>
        </div>
        <div class="debug-item">
          <span>Map:</span>
          <span>{{ currentMap?.name || 'None' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';
import { usePixiMap, type UsePixiMapOptions } from '@/composables/usePixiMap.mjs';
import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';
import type { IToken } from '@dungeon-lab/shared/types/tokens.mjs';
import type { Platform } from '@/services/encounter/PixiMapRenderer.mjs';
import { MapsClient } from '@dungeon-lab/client/index.mjs';

// Initialize maps client
const mapsClient = new MapsClient();

// Props
interface Props {
  mapId?: string;
  mapData?: IMapResponse;
  tokens?: IToken[];
  platform?: Platform;
  width?: number;
  height?: number;
  autoResize?: boolean;
  showDebugInfo?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  platform: 'desktop',
  autoResize: true,
  showDebugInfo: false
});

// Emits
interface Emits {
  (e: 'map-loaded', mapData: IMapResponse): void;
  (e: 'map-error', error: string): void;
  (e: 'token-selected', tokenId: string): void;
  (e: 'token-moved', tokenId: string, x: number, y: number): void;
  (e: 'viewport-changed', viewport: { x: number; y: number; scale: number }): void;
  (e: 'canvas-click', x: number, y: number): void;
  (e: 'canvas-right-click', x: number, y: number): void;
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

// Pixi map composable
const {
  isLoaded,
  isInitialized,
  viewportState,
  initializeMap,
  loadMap,
  addToken,
  updateToken,
  removeToken,
  moveToken,
  clearAllTokens,
  panTo,
  zoomTo,
  zoomAt,
  fitToScreen,
  centerOn,
  screenToWorld,
  worldToScreen,
  destroy
} = usePixiMap();

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
    
    // Get container dimensions
    const rect = containerRef.value.getBoundingClientRect();
    const width = props.width || rect.width || 800;
    const height = props.height || rect.height || 600;

    const options: UsePixiMapOptions = {
      platform: props.platform,
      width,
      height,
      autoResize: props.autoResize
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
    
    await loadMap(mapData);
    currentMap.value = mapData;
    
    emit('map-loaded', mapData);
    
    // Fit map to screen after loading
    await nextTick();
    fitToScreen();
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load map';
    error.value = errorMessage;
    emit('map-error', errorMessage);
    console.error('Failed to load map:', err);
  } finally {
    isLoading.value = false;
  }
};

const fetchAndLoadMap = async (mapId: string) => {
  if (!isInitialized.value) {
    console.warn('Cannot fetch map: viewer not initialized');
    return;
  }

  try {
    isLoading.value = true;
    error.value = null;
    
    console.log('Fetching map data for ID:', mapId);
    const mapData = await mapsClient.getMap(mapId);
    console.log('Map data fetched:', mapData);
    
    await loadMapData(mapData);
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch map';
    error.value = errorMessage;
    emit('map-error', errorMessage);
    console.error('Failed to fetch map:', err);
  } finally {
    isLoading.value = false;
  }
};

const loadTokens = async (tokens: IToken[]) => {
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

const handleResize = () => {
  if (!props.autoResize || !containerRef.value || !isInitialized.value) return;
  
  // Reinitialize with new dimensions
  initializeViewer();
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
  if (newTokens && isInitialized.value) {
    await loadTokens(newTokens);
  }
}, { immediate: false, deep: true });

watch(viewportState, (newViewport) => {
  if (newViewport) {
    emit('viewport-changed', {
      x: newViewport.x,
      y: newViewport.y,
      scale: newViewport.scale
    });
  }
}, { deep: true });

// Lifecycle
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
});

onUnmounted(() => {
  if (props.autoResize) {
    window.removeEventListener('resize', handleResize);
  }
  
  destroy();
});
</script>

<style scoped>
.pixi-map-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #1a1a1a;
  border-radius: 8px;
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