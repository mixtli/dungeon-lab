import { ref, onUnmounted, readonly, type Ref } from 'vue';
import type { Token } from '@dungeon-lab/shared/types/tokens.mjs';
import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';
import type { GameSystemPlugin } from '@dungeon-lab/shared-ui/types/plugin.mjs';
import { EncounterMapRenderer, type Platform, type EncounterMapConfig } from '@/services/encounter/PixiMapRenderer.mjs';
import { TokenRenderer } from '@/services/encounter/TokenRenderer.mjs';
import { ViewportManager, type ViewportState } from '@/services/encounter/ViewportManager.mjs';
import { TokenStatusBarService } from '@/services/token-status-bar.service.mjs';
import { useViewportState } from './useViewportState.mjs';

export interface UsePixiMapOptions {
  platform?: Platform;
  width?: number;
  height?: number;
  autoResize?: boolean;
  onTokenDragStart?: (tokenId: string, position: { x: number; y: number }) => void;
  onTokenDragMove?: (tokenId: string, position: { x: number; y: number }) => void;
  onTokenDragEnd?: (tokenId: string, position: { x: number; y: number }) => void;
  onTokenClick?: (tokenId: string, modifiers: { shift?: boolean; ctrl?: boolean; alt?: boolean }) => void;
  onTokenDoubleClick?: (tokenId: string) => void;
  onTokenRightClick?: (tokenId: string) => void; // <-- Added
  onTokenLongPress?: (tokenId: string) => void; // <-- Added for mobile
}

export interface UsePixiMapReturn {
  // Refs
  isLoaded: Ref<boolean>;
  isInitialized: Ref<boolean>;
  viewportState: Ref<ViewportState | null>;
  selectedTokenId: Ref<string | null>;
  tokenRenderer: Readonly<Ref<TokenRenderer | null>>;
  
  // Methods
  initializeMap: (canvas: HTMLCanvasElement, options?: UsePixiMapOptions) => Promise<void>;
  loadMap: (mapData: IMapResponse) => Promise<void>;
  addToken: (token: Token) => Promise<void>;
  updateToken: (token: Token) => Promise<void>;
  removeToken: (tokenId: string) => void;
  moveToken: (tokenId: string, x: number, y: number, animate?: boolean) => void;
  clearAllTokens: () => void;
  updateTokenStatusBars: (tokenId: string, document: any, plugin: GameSystemPlugin) => void;
  
  // Token selection and interaction
  selectToken: (tokenId: string) => void;
  deselectToken: (tokenId?: string) => void;
  addTarget: (tokenId: string) => void;
  removeTarget: (tokenId: string) => void;
  clearTargets: () => void;
  enableTokenDragging: (enabled: boolean) => void;
  
  // Grid controls
  enableSnapToGrid: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
  getGridSize: () => number;
  
  // Viewport controls
  panTo: (x: number, y: number) => void;
  zoomTo: (scale: number) => void;
  zoomAt: (x: number, y: number, delta: number) => void;
  fitToScreen: () => void;
  centerOn: (x: number, y: number) => void;
  
  // Coordinate conversion
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
  
  // Wall controls
  setWallHighlights: (visible: boolean) => void;
  setObjectHighlights: (visible: boolean) => void;
  setPortalHighlights: (visible: boolean) => void;
  setLightHighlights: (visible: boolean) => void;
  
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
  
  // Viewport state persistence
  const { 
    saveViewportState, 
    restoreViewportState
  } = useViewportState();
  
  // Platform detection
  const detectPlatform = (): Platform => {
    const width = window.innerWidth;
    if (width >= 1200) return 'desktop';
    if (width >= 768) return 'tablet';
    return 'phone';
  };
  
  // Debounced viewport state saving
  let saveStateTimeout: number | null = null;
  const debouncedSaveViewportState = () => {
    if (saveStateTimeout) {
      clearTimeout(saveStateTimeout);
    }
    saveStateTimeout = window.setTimeout(() => {
      if (viewportManager) {
        const state = viewportManager.getCurrentViewportState();
        saveViewportState(state.zoom, state.pan.x, state.pan.y);
      }
    }, 500); // Save after 500ms of no changes
  };
  
  // Restore viewport state if available
  const restoreViewportStateIfNeeded = () => {
    if (!viewportManager) return;
    
    const savedState = restoreViewportState();
    if (savedState) {
      console.log('[usePixiMap] Restoring viewport state:', savedState);
      try {
        viewportManager.setViewportState({
          zoom: savedState.zoom,
          pan: savedState.pan
        });
      } catch (error) {
        console.error('[usePixiMap] Failed to restore viewport state:', error);
      }
    }
  };
  
  // Store the options for later use
  let pixiMapOptions: UsePixiMapOptions | undefined;
  
  /**
   * Initialize the Pixi.js map with a canvas element
   */
  const initializeMap = async (canvas: HTMLCanvasElement, options: UsePixiMapOptions = {}): Promise<void> => {
    try {
      pixiMapOptions = options;
      
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
      mapRenderer = new EncounterMapRenderer(config);
      
      // Wait for async initialization to complete
      await mapRenderer.initializeApp(canvas, config);
      
      // Initialize viewport manager
      viewportManager = new ViewportManager(mapRenderer.getApp(), mapRenderer.getMapContainer());
      
      // Initialize token renderer with scale provider and viewport manager
      tokenRenderer = new TokenRenderer(
        mapRenderer.getTokenContainer(),
        undefined, // options
        () => viewportManager?.getCurrentScale() || 1, // scale provider
        viewportManager // viewport manager for proven screenToWorld coordinate conversion
      );
      
      // Set up viewport change listener
      mapRenderer.getApp().stage.on('viewport:changed', (state: ViewportState) => {
        viewportState.value = state;
        // Debounced save of viewport state for persistence
        debouncedSaveViewportState();
      });
      
      // Set up token event listeners
      setupTokenEventListeners();
      
      // Handle auto-resize
      if (options.autoResize !== false) {
        setupAutoResize(canvas);
      }
      
      isInitialized.value = true;
      
      // Restore viewport state if available
      restoreViewportStateIfNeeded();
      
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
      
      // Configure grid size for token renderer based on map data
      if (tokenRenderer && mapData.uvtt?.resolution?.pixels_per_grid) {
        const gridSize = mapData.uvtt.resolution.pixels_per_grid;
        console.log('[usePixiMap] Setting grid size to:', gridSize);
        tokenRenderer.setGridSize(gridSize);
      }
      
      // Set map data for bounds checking
      if (tokenRenderer) {
        console.log('[usePixiMap] Setting map data for bounds checking');
        tokenRenderer.setMapData(mapData);
      }
      
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
      
      // Restore viewport state after map is loaded and bounds are set
      restoreViewportStateIfNeeded();
      
    } catch (error) {
      console.error('Failed to load map:', error);
      throw error;
    }
  };
  
  /**
   * Add a token to the map
   */
  const addToken = async (token: Token): Promise<void> => {
    if (!tokenRenderer) {
      throw new Error('Token renderer not initialized');
    }
    
    await tokenRenderer.addToken(token);
  };
  
  /**
   * Update an existing token
   */
  const updateToken = async (token: Token): Promise<void> => {
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
   * Update status bars for a token based on document data and plugin configuration
   */
  const updateTokenStatusBars = (tokenId: string, document: any, plugin: GameSystemPlugin): void => {
    if (!tokenRenderer) {
      console.warn('[usePixiMap] No token renderer available for status bar update');
      return;
    }
    
    // Calculate status bar data using the service
    const statusBars = TokenStatusBarService.calculateStatusBars(document, plugin);
    
    // Update the token renderer with the new status bar data
    tokenRenderer.updateTokenStatusBars(tokenId, statusBars);
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
   * Enable token dragging
   */
  const enableTokenDragging = (enabled: boolean): void => {
    if (!tokenRenderer) return;
    tokenRenderer.setDragEnabled(enabled);
  };
  
  /**
   * Enable or disable snap-to-grid
   */
  const enableSnapToGrid = (enabled: boolean): void => {
    if (!tokenRenderer) return;
    tokenRenderer.setSnapToGrid(enabled);
  };
  
  /**
   * Set grid size for token snap-to-grid
   */
  const setGridSize = (size: number): void => {
    if (!tokenRenderer) return;
    tokenRenderer.setGridSize(size);
  };
  
  /**
   * Get current grid size
   */
  const getGridSize = (): number => {
    if (!tokenRenderer) return 50;
    return tokenRenderer.getGridSize();
  };
  
  /**
   * Set visibility of wall highlights
   */
  const setWallHighlights = (visible: boolean): void => {
    if (!mapRenderer) return;
    mapRenderer.setWallHighlights(visible);
  };
  
  /**
   * Set visibility of object highlights
   */
  const setObjectHighlights = (visible: boolean): void => {
    if (!mapRenderer) return;
    mapRenderer.setObjectHighlights(visible);
  };
  
  /**
   * Set visibility of portal highlights
   */
  const setPortalHighlights = (visible: boolean): void => {
    if (!mapRenderer) return;
    mapRenderer.setPortalHighlights(visible);
  };
  
  /**
   * Set visibility of light highlights
   */
  const setLightHighlights = (visible: boolean): void => {
    if (!mapRenderer) return;
    mapRenderer.setLightHighlights(visible);
  };
  
  /**
   * Setup token event listeners to connect token events to Vue state
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
      dragStart: pixiMapOptions?.onTokenDragStart || ((tokenId, position) => {
        console.log('Token drag started:', tokenId, position);
      }),
      dragMove: pixiMapOptions?.onTokenDragMove || (() => {
        // Default: do nothing
      }),
      dragEnd: pixiMapOptions?.onTokenDragEnd || ((tokenId, position) => {
        console.log('Token drag ended:', tokenId, position);
      }),
      
      // Token click events
      click: (tokenId, event) => {
        console.log('Token clicked:', tokenId);
        
        // Extract keyboard modifiers from the PIXI event
        const modifiers = {
          shift: event.shiftKey,
          ctrl: event.ctrlKey || event.metaKey, // Use metaKey for Mac Command key
          alt: event.altKey
        };
        
        // Call the parent component's token click handler with modifiers
        if (pixiMapOptions?.onTokenClick) {
          pixiMapOptions.onTokenClick(tokenId, modifiers);
        }
      },
      doubleClick: pixiMapOptions?.onTokenDoubleClick || ((tokenId) => {
        console.log('Token double-clicked:', tokenId);
      }),
      rightClick: pixiMapOptions?.onTokenRightClick || ((tokenId) => {
        console.log('Token right-clicked:', tokenId);
      }),
      longPress: pixiMapOptions?.onTokenLongPress || ((tokenId) => {
        console.log('Token long-pressed:', tokenId);
      })
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
   * Add a token as a target
   */
  const addTarget = (tokenId: string): void => {
    if (!tokenRenderer) return;
    tokenRenderer.addTarget(tokenId);
  };
  
  /**
   * Remove a token as a target
   */
  const removeTarget = (tokenId: string): void => {
    if (!tokenRenderer) return;
    tokenRenderer.removeTarget(tokenId);
  };
  
  /**
   * Clear all target tokens
   */
  const clearTargets = (): void => {
    if (!tokenRenderer) return;
    tokenRenderer.clearTargets();
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
    // Clear any pending viewport state saves
    if (saveStateTimeout) {
      clearTimeout(saveStateTimeout);
      saveStateTimeout = null;
    }
    
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
    
    // Instance access (for advanced use cases)
    tokenRenderer: readonly(ref(tokenRenderer)),
    
    // Methods
    initializeMap,
    loadMap,
    addToken,
    updateToken,
    removeToken,
    moveToken,
    clearAllTokens,
    updateTokenStatusBars,
    
    // Token interaction
    selectToken,
    deselectToken,
    addTarget,
    removeTarget,
    clearTargets,
    enableTokenDragging,
    
    // Grid controls
    enableSnapToGrid,
    setGridSize,
    getGridSize,
    
    // Viewport controls
    panTo,
    zoomTo,
    zoomAt,
    fitToScreen,
    centerOn,
    
    // Coordinate conversion
    screenToWorld,
    worldToScreen,
    
    // Wall controls
    setWallHighlights,
    setObjectHighlights,
    setPortalHighlights,
    setLightHighlights,
    
    // Cleanup
    destroy
  };
} 