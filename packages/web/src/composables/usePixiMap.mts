import { ref, onUnmounted, type Ref } from 'vue';
import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';
import type { IToken } from '@dungeon-lab/shared/types/tokens.mjs';
import { EncounterMapRenderer, type Platform, type EncounterMapConfig } from '@/services/encounter/PixiMapRenderer.mjs';
import { TokenRenderer } from '@/services/encounter/TokenRenderer.mjs';
import { ViewportManager, type ViewportState } from '@/services/encounter/ViewportManager.mjs';

export interface UsePixiMapOptions {
  platform?: Platform;
  width?: number;
  height?: number;
  autoResize?: boolean;
}

export interface UsePixiMapReturn {
  // Refs
  isLoaded: Ref<boolean>;
  isInitialized: Ref<boolean>;
  viewportState: Ref<ViewportState | null>;
  selectedTokenId: Ref<string | null>;
  
  // Methods
  initializeMap: (canvas: HTMLCanvasElement, options?: UsePixiMapOptions) => Promise<void>;
  loadMap: (mapData: IMapResponse) => Promise<void>;
  addToken: (token: IToken) => Promise<void>;
  updateToken: (token: IToken) => Promise<void>;
  removeToken: (tokenId: string) => void;
  moveToken: (tokenId: string, x: number, y: number, animate?: boolean) => void;
  clearAllTokens: () => void;
  
  // Token selection and interaction
  selectToken: (tokenId: string) => void;
  deselectToken: (tokenId?: string) => void;
  enableTokenDragging: (enabled: boolean) => void;
  
  // Viewport controls
  panTo: (x: number, y: number) => void;
  zoomTo: (scale: number) => void;
  zoomAt: (x: number, y: number, delta: number) => void;
  fitToScreen: () => void;
  centerOn: (x: number, y: number) => void;
  
  // Coordinate conversion
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
  
  // Cleanup
  destroy: () => void;
}

/**
 * Vue composable for managing Pixi.js encounter maps
 * Provides reactive integration with Vue components
 */
export function usePixiMap(): UsePixiMapReturn {
  // Reactive state
  const isLoaded = ref(false);
  const isInitialized = ref(false);
  const viewportState = ref<ViewportState | null>(null);
  const selectedTokenId = ref<string | null>(null);
  
  // Service instances
  let mapRenderer: EncounterMapRenderer | null = null;
  let tokenRenderer: TokenRenderer | null = null;
  let viewportManager: ViewportManager | null = null;
  
  // Platform detection
  const detectPlatform = (): Platform => {
    const width = window.innerWidth;
    if (width >= 1200) return 'desktop';
    if (width >= 768) return 'tablet';
    return 'phone';
  };
  
  /**
   * Initialize the Pixi.js map with a canvas element
   */
  const initializeMap = async (canvas: HTMLCanvasElement, options: UsePixiMapOptions = {}): Promise<void> => {
    try {
      // Detect platform if not provided
      const platform = options.platform || detectPlatform();
      
      // Get canvas dimensions
      const width = options.width || canvas.clientWidth || 800;
      const height = options.height || canvas.clientHeight || 600;
      
      // Create map renderer configuration
      const config: EncounterMapConfig = {
        platform,
        width,
        height
      };
      
      // Initialize map renderer
      mapRenderer = new EncounterMapRenderer(canvas, config);
      
      // Initialize token renderer
      tokenRenderer = new TokenRenderer(mapRenderer.getTokenContainer());
      
      // Initialize viewport manager
      viewportManager = new ViewportManager(mapRenderer.getApp(), mapRenderer.getMapContainer());
      
      // Set up viewport change listener
      mapRenderer.getApp().stage.on('viewport:changed', (state: ViewportState) => {
        viewportState.value = state;
      });
      
      // Set up token event listeners
      setupTokenEventListeners();
      
      // Handle auto-resize
      if (options.autoResize !== false) {
        setupAutoResize(canvas);
      }
      
      isInitialized.value = true;
      
    } catch (error) {
      console.error('Failed to initialize Pixi map:', error);
      throw error;
    }
  };
  
  /**
   * Load map data from Map model (with uvtt field and image asset)
   */
  const loadMap = async (mapData: IMapResponse): Promise<void> => {
    if (!mapRenderer) {
      throw new Error('Map renderer not initialized');
    }
    
    try {
      await mapRenderer.loadMapFromDatabase(mapData);
      
      // Set map bounds for viewport constraints
      if (viewportManager && mapData.uvtt?.resolution) {
        const bounds = {
          x: 0,
          y: 0,
          width: mapData.uvtt.resolution.map_size?.x ? mapData.uvtt.resolution.map_size.x * (mapData.uvtt.resolution.pixels_per_grid || 50) : 1000,
          height: mapData.uvtt.resolution.map_size?.y ? mapData.uvtt.resolution.map_size.y * (mapData.uvtt.resolution.pixels_per_grid || 50) : 1000
        };
        viewportManager.setMapBounds(bounds);
      }
      
      isLoaded.value = true;
      
    } catch (error) {
      console.error('Failed to load map:', error);
      throw error;
    }
  };
  
  /**
   * Add a token to the map
   */
  const addToken = async (token: IToken): Promise<void> => {
    if (!tokenRenderer) {
      throw new Error('Token renderer not initialized');
    }
    
    await tokenRenderer.addToken(token);
  };
  
  /**
   * Update an existing token
   */
  const updateToken = async (token: IToken): Promise<void> => {
    if (!tokenRenderer) {
      throw new Error('Token renderer not initialized');
    }
    
    await tokenRenderer.updateToken(token);
  };
  
  /**
   * Remove a token from the map
   */
  const removeToken = (tokenId: string): void => {
    if (!tokenRenderer) return;
    tokenRenderer.removeToken(tokenId);
  };
  
  /**
   * Move a token to a new position
   */
  const moveToken = (tokenId: string, x: number, y: number, animate = true): void => {
    if (!tokenRenderer) return;
    tokenRenderer.moveToken(tokenId, { x, y }, animate);
  };
  
  /**
   * Clear all tokens from the map
   */
  const clearAllTokens = (): void => {
    if (!tokenRenderer) return;
    tokenRenderer.clearAllTokens();
  };
  
  /**
   * Pan viewport to specific position
   */
  const panTo = (x: number, y: number): void => {
    if (!viewportManager) return;
    viewportManager.setPan(x, y);
  };
  
  /**
   * Zoom to specific scale
   */
  const zoomTo = (scale: number): void => {
    if (!viewportManager) return;
    viewportManager.setZoom(scale);
  };
  
  /**
   * Zoom at specific point
   */
  const zoomAt = (x: number, y: number, delta: number): void => {
    if (!viewportManager) return;
    viewportManager.zoomAt(x, y, delta);
  };
  
  /**
   * Fit map to screen
   */
  const fitToScreen = (): void => {
    if (!viewportManager) return;
    viewportManager.fitToScreen();
  };
  
  /**
   * Center viewport on specific world coordinates
   */
  const centerOn = (x: number, y: number): void => {
    if (!viewportManager) return;
    viewportManager.centerOn(x, y);
  };
  
  /**
   * Convert screen coordinates to world coordinates
   */
  const screenToWorld = (screenX: number, screenY: number): { x: number; y: number } => {
    if (!viewportManager) {
      throw new Error('Viewport manager not initialized');
    }
    return viewportManager.screenToWorld(screenX, screenY);
  };
  
  /**
   * Convert world coordinates to screen coordinates
   */
  const worldToScreen = (worldX: number, worldY: number): { x: number; y: number } => {
    if (!viewportManager) {
      throw new Error('Viewport manager not initialized');
    }
    return viewportManager.worldToScreen(worldX, worldY);
  };
  
  /**
   * Set up token event listeners to connect token events to Vue state
   */
  const setupTokenEventListeners = () => {
    if (!tokenRenderer) return;
    
    tokenRenderer.setEventHandlers({
      // Token selection events
      select: (tokenId) => {
        selectedTokenId.value = tokenId;
      },
      deselect: () => {
        selectedTokenId.value = null;
      },
      
      // Token drag events
      dragStart: (tokenId) => {
        // Could add additional state tracking here if needed
        console.log('Token drag started:', tokenId);
      },
      dragMove: () => {
        // Update any reactive state for token dragging if needed
      },
      dragEnd: (tokenId, finalPosition) => {
        console.log('Token drag ended:', tokenId, finalPosition);
        // Here you might want to emit an event to the parent component
        // or call an API to persist the token position
      },
      
      // Token click events
      click: (tokenId) => {
        // Handle token clicks
        console.log('Token clicked:', tokenId);
      },
      rightClick: (tokenId) => {
        // Handle token right clicks (e.g., for context menu)
        console.log('Token right-clicked:', tokenId);
      }
    });
  };
  
  /**
   * Select a specific token
   */
  const selectToken = (tokenId: string): void => {
    if (!tokenRenderer) return;
    tokenRenderer.selectToken(tokenId);
    // selectedTokenId is updated via the event handler
  };
  
  /**
   * Deselect the currently selected token or a specific token
   */
  const deselectToken = (tokenId?: string): void => {
    if (!tokenRenderer) return;
    
    if (tokenId) {
      tokenRenderer.deselectToken(tokenId);
    } else if (selectedTokenId.value) {
      tokenRenderer.deselectToken(selectedTokenId.value);
    }
  };
  
  /**
   * Enable or disable token dragging
   */
  const enableTokenDragging = (enabled: boolean): void => {
    if (!tokenRenderer) return;
    tokenRenderer.setDragEnabled(enabled);
  };
  
  /**
   * Set up auto-resize functionality
   */
  const setupAutoResize = (canvas: HTMLCanvasElement): void => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (mapRenderer && width > 0 && height > 0) {
          mapRenderer.resize(width, height);
        }
      }
    });
    
    resizeObserver.observe(canvas.parentElement || canvas);
    
    // Store observer for cleanup
    interface CanvasWithObserver extends HTMLCanvasElement {
      _resizeObserver?: ResizeObserver;
    }
    (canvas as CanvasWithObserver)._resizeObserver = resizeObserver;
  };
  
  /**
   * Clean up resources when unmounting
   */
  const destroy = (): void => {
    // Remove event listeners
    if (tokenRenderer) {
      tokenRenderer.setEventHandlers({});
    }
    
    // Clear tokens
    clearAllTokens();
    
    // Destroy renderers
    if (mapRenderer) {
      mapRenderer.destroy();
      mapRenderer = null;
    }
    
    if (viewportManager) {
      viewportManager.destroy();
      viewportManager = null;
    }
    
    // Reset state
    isLoaded.value = false;
    isInitialized.value = false;
    viewportState.value = null;
    selectedTokenId.value = null;
  };
  
  // Clean up when component unmounts
  onUnmounted(() => {
    destroy();
  });
  
  return {
    // State
    isLoaded,
    isInitialized,
    viewportState,
    selectedTokenId,
    
    // Methods
    initializeMap,
    loadMap,
    addToken,
    updateToken,
    removeToken,
    moveToken,
    clearAllTokens,
    
    // Token interaction
    selectToken,
    deselectToken,
    enableTokenDragging,
    
    // Viewport controls
    panTo,
    zoomTo,
    zoomAt,
    fitToScreen,
    centerOn,
    
    // Coordinate conversion
    screenToWorld,
    worldToScreen,
    
    // Cleanup
    destroy
  };
} 