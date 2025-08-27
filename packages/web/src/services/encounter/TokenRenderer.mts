import * as PIXI from 'pixi.js';
import type { Token } from '@dungeon-lab/shared/types/tokens.mjs';
import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';
import type { TokenStatusBarData } from '@dungeon-lab/shared/types/token-status-bars.mjs';
import type { ViewportManager } from './ViewportManager.mjs';
import defaultTokenUrl from '@/assets/images/default_token.svg';
import { isPositionWithinBounds, clampPositionToBounds } from '../../utils/bounds-validation.mjs';
import { transformAssetUrl } from '@/utils/asset-utils.mjs';

export interface TokenSpriteData {
  id: string;
  root: PIXI.Container;
  sprite: PIXI.Sprite;
  token: Token;
}

// Extended sprite interface for token-specific properties
interface TokenSprite extends PIXI.Sprite {
  tokenId?: string;
  dragging?: boolean;
  dragData?: PIXI.FederatedPointerEvent;
  dragStartPosition?: { x: number; y: number };
  originalPosition?: { x: number; y: number };
  dragStartGlobal?: { x: number; y: number };
  worldPosition?: { x: number; y: number };
  lastClickTime?: number;
  clickCount?: number;
}

// Extended container interface for token root
interface TokenContainer extends PIXI.Container {
  tokenId: string;
}

// Token position for Pixi (2D only)
interface TokenPosition {
  x: number;
  y: number;
}

// Events emitted by the token renderer
export interface TokenEvents {
  select: (tokenId: string) => void;
  deselect: (tokenId: string) => void;
  dragStart: (tokenId: string, position: TokenPosition) => void;
  dragMove: (tokenId: string, position: TokenPosition) => void;
  dragEnd: (tokenId: string, position: TokenPosition) => void;
  click: (tokenId: string, event: PIXI.FederatedPointerEvent) => void;
  doubleClick: (tokenId: string, event: PIXI.FederatedPointerEvent) => void;
  rightClick: (tokenId: string, event: PIXI.FederatedPointerEvent) => void;
}

interface TokenRendererEventHandlers {
  select?: (tokenId: string) => void;
  deselect?: () => void;
  dragStart?: (tokenId: string, position: { x: number; y: number }) => void;
  dragMove?: (tokenId: string, position: { x: number; y: number }) => void;
  dragEnd?: (tokenId: string, position: { x: number; y: number }) => void;
  click?: (tokenId: string, event: PIXI.FederatedPointerEvent) => void;
  doubleClick?: (tokenId: string, event: PIXI.FederatedPointerEvent) => void;
  rightClick?: (tokenId: string, event: PIXI.FederatedPointerEvent) => void;
}

interface TokenRendererOptions {
  onTokenSelect?: (tokenId: string) => void;
  onTokenDeselect?: () => void;
  onTokenDragStart?: (tokenId: string, position: { x: number; y: number }) => void;
  onTokenDragMove?: (tokenId: string, position: { x: number; y: number }) => void;
  onTokenDragEnd?: (tokenId: string, position: { x: number; y: number }) => void;
  onTokenClick?: (tokenId: string) => void;
  onTokenRightClick?: (tokenId: string) => void;
}

/**
 * Manages token sprites with efficient pooling and rendering
 * Optimized for real-time token updates and smooth animations
 */
export class TokenRenderer {
  private tokenContainer: PIXI.Container;
  private tokenPool: TokenSprite[] = [];
  private activeTokens: Map<string, TokenSpriteData> = new Map();
  private textureCache: Map<string, PIXI.Texture> = new Map();
  private selectedTokenId: string | null = null;
  private targetTokenIds: Set<string> = new Set();
  private eventHandlers: TokenRendererEventHandlers = {};

  private dragEnabled: boolean = true;
  private scaleProvider?: () => number;
  private viewportManager?: ViewportManager;
  
  // Performance settings
  private maxPoolSize = 50;
  
  // Configuration
  private _gridSize: number = 50;
  private _snapToGrid: boolean = true;
  private _dragThreshold: number = 5; // pixels - minimum distance to start dragging
  private _doubleClickTime: number = 300; // milliseconds - time window for double-click detection
  
  // Simplified drag state - no complex PIXI drag logic
  private _isDragging = false;
  
  // Map data for bounds checking
  private _mapData: IMapResponse | null = null;
  
  constructor(tokenContainer: PIXI.Container, _options?: TokenRendererOptions, scaleProvider?: () => number, viewportManager?: ViewportManager) {
    this.tokenContainer = tokenContainer;
    this.scaleProvider = scaleProvider;
    this.viewportManager = viewportManager;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear all tokens
    this.clearAllTokens();
    
    // Clear texture cache
    this.textureCache.clear();
  }
  
  /**
   * Set grid size for snap-to-grid functionality
   */
  setGridSize(size: number): void {
    this._gridSize = size;
    // Update all existing tokens to new grid-based sizing
    this.activeTokens.forEach(async (tokenData) => {
      this.configureTokenSprite(tokenData.sprite, tokenData.token);
    });
  }
  
  /**
   * Enable or disable snap-to-grid
   */
  setSnapToGrid(enabled: boolean): void {
    this._snapToGrid = enabled;
  }
  
  /**
   * Get current grid size
   */
  getGridSize(): number {
    return this._gridSize;
  }
  
  /**
   * Set map data for bounds checking
   */
  setMapData(mapData: IMapResponse | null): void {
    this._mapData = mapData;
  }
  
  /**
   * Snap a position to the grid
   */
  private snapToGrid(position: TokenPosition): TokenPosition {
    if (!this._snapToGrid) return position;
    
    // Snap to grid cell centers for proper visual positioning
    // Grid cell centers are at (n * gridSize + gridSize/2)
    const gridCellX = Math.round((position.x - this._gridSize / 2) / this._gridSize);
    const gridCellY = Math.round((position.y - this._gridSize / 2) / this._gridSize);
    const gridX = gridCellX * this._gridSize + this._gridSize / 2;
    const gridY = gridCellY * this._gridSize + this._gridSize / 2;
    
    console.log('[TokenRenderer] Snap-to-grid calculation:', {
      originalPosition: position,
      gridSize: this._gridSize,
      gridCellX,
      gridCellY,
      snappedPosition: { x: gridX, y: gridY },
      resultingGridCoords: { x: gridX / this._gridSize, y: gridY / this._gridSize }
    });
    
    return { x: gridX, y: gridY };
  }
  
  /**
   * Calculate center position from grid bounds
   */
  private getCenterFromBounds(bounds: { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number } }): { x: number; y: number } {
    const centerGridX = (bounds.topLeft.x + bounds.bottomRight.x) / 2;
    const centerGridY = (bounds.topLeft.y + bounds.bottomRight.y) / 2;
    
    const worldX = centerGridX * this._gridSize + this._gridSize / 2;
    const worldY = centerGridY * this._gridSize + this._gridSize / 2;
    
    return {
      x: worldX,
      y: worldY
    };
  }
  
  /**
   * Calculate pixel size from grid bounds
   */
  private getPixelSizeFromBounds(bounds: { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number } }): number {
    const gridWidth = bounds.bottomRight.x - bounds.topLeft.x + 1;
    const gridHeight = bounds.bottomRight.y - bounds.topLeft.y + 1;
    
    // Use the larger dimension for square tokens
    const gridSize = Math.max(gridWidth, gridHeight);
    const pixelSize = gridSize * this._gridSize;
    
    return pixelSize;
  }
  
  /**
   * Calculate new bounds from center position, preserving size
   */
  private updateBoundsFromCenter(currentBounds: { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number }; elevation: number }, centerX: number, centerY: number): { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number }; elevation: number } {
    // Convert center world coordinates to grid coordinates
    const centerGridX = Math.round((centerX - this._gridSize / 2) / this._gridSize);
    const centerGridY = Math.round((centerY - this._gridSize / 2) / this._gridSize);
    
    // Calculate current size
    const width = currentBounds.bottomRight.x - currentBounds.topLeft.x;
    const height = currentBounds.bottomRight.y - currentBounds.topLeft.y;
    
    // Calculate new bounds centered on the new position
    const halfWidth = Math.floor(width / 2);
    const halfHeight = Math.floor(height / 2);
    
    return {
      topLeft: {
        x: centerGridX - halfWidth,
        y: centerGridY - halfHeight
      },
      bottomRight: {
        x: centerGridX + width - halfWidth,
        y: centerGridY + height - halfHeight
      },
      elevation: currentBounds.elevation
    };
  }
  
  /**
   * Add or update a token sprite
   */
  async addToken(token: Token): Promise<void> {
    try {
      // Remove existing token if it exists
      if (this.activeTokens.has(token.id)) {
        this.removeToken(token.id);
      }

      // Create a container for the token (tokenRoot)
      const tokenRoot = new PIXI.Container() as TokenContainer;
      tokenRoot.tokenId = token.id; // custom property for tracking

      // Get sprite from pool or create new one
      const sprite = this.acquireSprite();
      
      // Load texture for token
      const texture = await this.getTokenTexture(token);
      sprite.texture = texture;
      
      // Configure sprite
      this.configureTokenSprite(sprite, token);

      // Position the tokenRoot container at world coordinates (center of bounds)
      const centerPosition = this.getCenterFromBounds(token.bounds);
      tokenRoot.x = centerPosition.x;
      tokenRoot.y = centerPosition.y;

      // Add the sprite to the container
      tokenRoot.addChild(sprite);

      // Add the container to the main tokenContainer
      this.tokenContainer.addChild(tokenRoot);
      
      // Track both root and sprite for this token
      this.activeTokens.set(token.id, {
        id: token.id,
        root: tokenRoot,
        sprite,
        token
      });
      
    } catch (error) {
      console.error(`[TokenRenderer] Failed to add token ${token.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Update an existing token
   */
  async updateToken(token: Token): Promise<void> {
    const tokenData = this.activeTokens.get(token.id);
    if (!tokenData) {
      // Token doesn't exist, add it
      await this.addToken(token);
      return;
    }
    
    // Update texture if image changed
    if (tokenData.token.imageUrl !== token.imageUrl) {
      const texture = await this.getTokenTexture(token);
      tokenData.sprite.texture = texture;
    }
    
    // Update sprite configuration
    this.configureTokenSprite(tokenData.sprite, token);
    
    // Position the tokenRoot container at world coordinates (center of bounds)
    const centerPosition = this.getCenterFromBounds(token.bounds);
    const tokenRoot = tokenData.root as TokenContainer;
    tokenRoot.x = centerPosition.x;
    tokenRoot.y = centerPosition.y;
    
    // Update stored token data
    tokenData.token = token;
  }
  
  /**
   * Remove a token sprite
   */
  removeToken(tokenId: string): void {
    const tokenData = this.activeTokens.get(tokenId);
    if (!tokenData) return;
    
    // Remove from container
    this.tokenContainer.removeChild(tokenData.root);
    
    // Return sprite to pool
    this.releaseSprite(tokenData.sprite);
    
    // Remove from tracking
    this.activeTokens.delete(tokenId);
    
    // If this was the selected token, deselect it
    if (this.selectedTokenId === tokenId) {
      this.selectedTokenId = null;
    }
  }
  
  /**
   * Move a token to a new position with optional animation
   */
  moveToken(tokenId: string, newPosition: TokenPosition, animate = true): void {
    const tokenData = this.activeTokens.get(tokenId);
    if (!tokenData) return;
    const tokenRoot = tokenData.root as TokenContainer;
    
    // Snap position to grid if enabled
    const finalPosition = this.snapToGrid(newPosition);
    
    if (animate) {
      // Smooth animation to new position
      this.animateTokenMovement(tokenRoot, finalPosition);
    } else {
      // Instant movement
      tokenRoot.x = finalPosition.x;
      tokenRoot.y = finalPosition.y;
    }
    
    // Update token bounds based on new center position
    tokenData.token.bounds = this.updateBoundsFromCenter(tokenData.token.bounds, finalPosition.x, finalPosition.y);
  }
  
  /**
   * Get a token sprite by ID
   */
  getTokenSprite(tokenId: string): PIXI.Sprite | null {
    const tokenData = this.activeTokens.get(tokenId);
    return tokenData ? tokenData.sprite : null;
  }
  
  /**
   * Get all active tokens
   */
  getActiveTokens(): Map<string, TokenSpriteData> {
    return new Map(this.activeTokens);
  }
  
  /**
   * Clear all tokens
   */
  clearAllTokens(): void {
    // Remove all sprites from container
    this.activeTokens.forEach((tokenData) => {
      this.tokenContainer.removeChild(tokenData.root);
      this.releaseSprite(tokenData.sprite);
    });
    
    // Clear tracking
    this.activeTokens.clear();
    this.selectedTokenId = null;
  }
  
  /**
   * Select a token by ID
   */
  selectToken(tokenId: string): void {
    // Deselect current token if exists
    if (this.selectedTokenId) {
      this.deselectToken(this.selectedTokenId);
    }
    
    const tokenData = this.activeTokens.get(tokenId);
    if (!tokenData) {
      console.warn(`[TokenRenderer] Cannot select token ${tokenId}: token not found in activeTokens`);
      return;
    }
    
    // Apply selection visual
    this.updateSelectionVisual(tokenData.root as TokenContainer, tokenData.sprite, true);
    
    // Set as selected
    this.selectedTokenId = tokenId;
    
    // Trigger event
    if (this.eventHandlers.select) {
      this.eventHandlers.select(tokenId);
    }
  }
  
  /**
   * Deselect a token by ID
   */
  deselectToken(tokenId: string): void {
    const tokenData = this.activeTokens.get(tokenId);
    if (!tokenData) return;
    
    // Remove selection visual
    this.updateSelectionVisual(tokenData.root as TokenContainer, tokenData.sprite, false);
    
    // Clear selected token
    if (this.selectedTokenId === tokenId) {
      this.selectedTokenId = null;
    }
    
    // Trigger event
    if (this.eventHandlers.deselect) {
      this.eventHandlers.deselect();
    }
  }
  
  /**
   * Toggle token selection
   */
  toggleTokenSelection(tokenId: string): void {
    if (this.selectedTokenId === tokenId) {
      this.deselectToken(tokenId);
    } else {
      this.selectToken(tokenId);
    }
  }
  
  /**
   * Add a token as a target
   */
  addTarget(tokenId: string): void {
    this.targetTokenIds.add(tokenId);
    const tokenData = this.activeTokens.get(tokenId);
    if (tokenData) {
      this.updateTargetVisual(tokenData.root as TokenContainer, tokenData.sprite, true);
    }
  }
  
  /**
   * Remove a token as a target
   */
  removeTarget(tokenId: string): void {
    this.targetTokenIds.delete(tokenId);
    const tokenData = this.activeTokens.get(tokenId);
    if (tokenData) {
      this.updateTargetVisual(tokenData.root as TokenContainer, tokenData.sprite, false);
    }
  }
  
  /**
   * Clear all target tokens
   */
  clearTargets(): void {
    for (const tokenId of this.targetTokenIds) {
      this.removeTarget(tokenId);
    }
    this.targetTokenIds.clear();
  }
  
  /**
   * Check if a token is targeted
   */
  isTarget(tokenId: string): boolean {
    return this.targetTokenIds.has(tokenId);
  }
  
  /**
   * Set event handlers for token interactions
   */
  setEventHandlers(handlers: TokenRendererEventHandlers): void {
    this.eventHandlers = handlers;
    // Re-bind event listeners for all active tokens
    for (const tokenData of this.activeTokens.values()) {
      this.setupSpriteEvents(tokenData.sprite);
    }
  }
  
  /**
   * Enable or disable token dragging
   */
  setDragEnabled(enabled: boolean): void {
    this.dragEnabled = enabled;
  }
  
  /**
   * Acquire a sprite from the pool or create a new one
   */
  private acquireSprite(): TokenSprite {
    let sprite = this.tokenPool.pop() as TokenSprite;
    
    if (!sprite) {
      sprite = new PIXI.Sprite() as TokenSprite;
      sprite.eventMode = 'static';
      sprite.cursor = 'pointer';
      this.setupSpriteEvents(sprite);
    }
    
    // Reset sprite properties
    sprite.alpha = 1;
    sprite.visible = true;
    sprite.rotation = 0;
    sprite.scale.set(1, 1);
    sprite.tint = 0xFFFFFF;
    sprite.dragging = false;
    sprite.lastClickTime = 0;
    sprite.clickCount = 0;
    
    return sprite;
  }
  
  /**
   * Return a sprite to the pool
   */
  private releaseSprite(sprite: TokenSprite): void {
    // Clean up sprite
    sprite.removeAllListeners();
    sprite.eventMode = 'none';
    sprite.cursor = 'default';
    
    // Add back to pool if not at max size
    if (this.tokenPool.length < this.maxPoolSize) {
      this.tokenPool.push(sprite);
    } else {
      // Destroy if pool is full
      sprite.destroy();
    }
  }
  
  /**
   * Configure sprite properties based on token data
   */
  private configureTokenSprite(sprite: TokenSprite, token: Token): void {
    // Set token ID for reference
    sprite.tokenId = token.id;
    
    // Set sprite position relative to its parent container (tokenRoot)
    // The tokenRoot will be positioned at world coordinates, so sprite should be at (0, 0)
    sprite.x = 0;
    sprite.y = 0;
    
    // Make sprite draggable using HTML5 drag/drop (like character tabs)
    sprite.eventMode = 'static';
    sprite.cursor = 'grab';
    
    // Add HTML5 draggable properties to the sprite's DOM element if available
    if (sprite.eventMode && this.dragEnabled) {
      // The sprite will emit drag events that we can handle at the Vue component level
      sprite.cursor = 'grab';
    }
    
    // Calculate size based on grid bounds
    const size = this.getPixelSizeFromBounds(token.bounds);
    
    // Set anchor to center
    sprite.anchor.set(0.5);
    
    // Scale sprite to match desired size
    const scale = size / Math.max(sprite.width, sprite.height);
    sprite.scale.set(scale);
    
    // Enable interactivity
    sprite.eventMode = 'static';
    sprite.cursor = 'pointer';
    
    // Setup interactive events
    this.setupSpriteEvents(sprite);
    
    // Apply visual state
    if (token.id && this.selectedTokenId === token.id) {
      const tokenData = this.activeTokens.get(token.id);
      if (tokenData) {
        this.updateSelectionVisual(tokenData.root as TokenContainer, sprite, true);
      }
    }
  }
  

  
  /**
   * Get texture for token
   */
  private async getTokenTexture(token: Token): Promise<PIXI.Texture> {
    // No image URL, use default
    if (!token.imageUrl) {
      return PIXI.Texture.from(defaultTokenUrl);
    }
    
    // Transform localhost URLs for LAN access
    const transformedUrl = transformAssetUrl(token.imageUrl);
    
    // Check cache first (use transformed URL as cache key)
    if (this.textureCache.has(transformedUrl)) {
      return this.textureCache.get(transformedUrl)!;
    }
    
    // Load texture with timeout and fallback
    try {
      const texture = await this.loadTokenTextureWithTimeout(transformedUrl);
      
      // Cache for reuse (use transformed URL as cache key)
      this.textureCache.set(transformedUrl, texture);
      
      return texture;
    } catch (error) {
      console.error(`[TokenRenderer] Failed to load token texture: ${transformedUrl}`, error);
      return PIXI.Texture.from(defaultTokenUrl);
    }
  }

  /**
   * Load texture using HTMLImageElement (direct approach)
   */
  private async loadTokenTextureWithTimeout(imageUrl: string, timeoutMs: number = 10000): Promise<PIXI.Texture> {
    // Use HTMLImageElement directly instead of PIXI.Assets.load for reliability
    return this.loadTokenTextureFromHTMLImage(imageUrl, timeoutMs);
  }

  /**
   * Load texture using HTMLImageElement for tokens
   */
  private async loadTokenTextureFromHTMLImage(imageUrl: string, timeoutMs: number = 10000): Promise<PIXI.Texture> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Set up timeout
      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        reject(new Error(`HTMLImage load timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      
      img.onload = () => {
        clearTimeout(timeout);
        try {
          // Create PIXI texture from the loaded image
          const texture = PIXI.Texture.from(img);
          resolve(texture);
        } catch (textureError) {
          reject(new Error(`Failed to create PIXI texture from HTMLImage: ${textureError instanceof Error ? textureError.message : textureError}`));
        }
      };
      
      img.onerror = (event) => {
        clearTimeout(timeout);
        reject(new Error(`HTMLImage load error: ${event instanceof ErrorEvent ? event.message : 'Unknown error'}`));
      };
      
      img.src = imageUrl;
    });
  }
  
  /**
   * Setup interactive events for token sprite
   */
  private setupSpriteEvents(sprite: TokenSprite): void {
    sprite.removeAllListeners(); // Prevent duplicate event handlers
    
    // Simple click handler for selection
    sprite.on('pointerdown', this.handlePointerDown.bind(this, sprite));
    
    // Hover effects
    sprite.on('pointerover', this.handlePointerOver.bind(this, sprite));
    sprite.on('pointerout', this.handlePointerOut.bind(this, sprite));
    
    // Right-click context menu
    sprite.on('rightdown', (event: PIXI.FederatedPointerEvent) => {
      if (sprite.tokenId && this.eventHandlers.rightClick) {
        this.eventHandlers.rightClick(sprite.tokenId, event);
      }
    });
  }

  /**
   * Handle pointer over event
   */
  private handlePointerOver(sprite: TokenSprite): void {
    // Add hover effect if not selected
    if (sprite.tokenId && sprite.tokenId !== this.selectedTokenId) {
      const tokenData = this.activeTokens.get(sprite.tokenId);
      if (tokenData) {
        this.applyHoverVisual(tokenData.root as TokenContainer, sprite);
      }
    }
  }

  /**
   * Handle pointer out event
   */
  private handlePointerOut(sprite: TokenSprite): void {
    // Remove hover effect if not selected
    if (sprite.tokenId && sprite.tokenId !== this.selectedTokenId) {
      const tokenData = this.activeTokens.get(sprite.tokenId);
      if (tokenData) {
        this.removeHoverVisual(tokenData.root as TokenContainer);
      }
    }
  }

  /**
   * Handle pointer down event - emit drag start for Vue component to handle
   */
  private handlePointerDown(sprite: TokenSprite, event: PIXI.FederatedPointerEvent): void {
    if (!sprite.tokenId) return;
    
    if (event.button === 0 && this.dragEnabled) {
      // Emit drag start event - let Vue component handle the drag with character tab logic
      if (this.eventHandlers.dragStart) {
        this.eventHandlers.dragStart(sprite.tokenId, { x: event.global.x, y: event.global.y });
      }
      
      // Set cursor to dragging
      sprite.cursor = 'grabbing';
      
      // Set up listeners for drag end to reset cursor
      const stage = this.tokenContainer.parent;
      if (stage) {
        const handleDragEnd = () => {
          sprite.cursor = 'grab';
          stage.off('pointerup', handleDragEnd);
          stage.off('pointerupoutside', handleDragEnd);
        };
        stage.on('pointerup', handleDragEnd);
        stage.on('pointerupoutside', handleDragEnd);
      }
    } else {
      // Handle click and double-click detection for selection
      this.handleClickAndDoubleClick(sprite, event);
    }
  }
  
  /**
   * Handle click and double-click detection
   */
  private handleClickAndDoubleClick(sprite: TokenSprite, event: PIXI.FederatedPointerEvent): void {
    if (!sprite.tokenId) return;
    
    const currentTime = Date.now();
    const lastClickTime = sprite.lastClickTime || 0;
    const timeDifference = currentTime - lastClickTime;
    
    // Update click tracking
    sprite.lastClickTime = currentTime;
    
    if (timeDifference <= this._doubleClickTime) {
      // This is a double-click
      sprite.clickCount = 0; // Reset click count
      if (this.eventHandlers.doubleClick) {
        this.eventHandlers.doubleClick(sprite.tokenId, event);
      }
    } else {
      // This is a single click (for now)
      sprite.clickCount = 1;
      
      // Emit single click event immediately
      if (this.eventHandlers.click) {
        this.eventHandlers.click(sprite.tokenId, event);
      }
    }
  }
  
  // Complex PIXI drag system removed - will use HTML5 drag/drop instead
  
  // Drag end handler removed - will use HTML5 drag/drop instead
  

  
  // Complex drag calculation methods removed - will use HTML5 drag/drop instead
  

  
  /**
   * Apply hover visual effect to token
   */
  private applyHoverVisual(tokenRoot: TokenContainer, sprite: PIXI.Sprite): void {
    // Create hover effect if it doesn't exist
    if (!tokenRoot.children.find(child => child.label === 'hover-effect')) {
      const hoverEffect = new PIXI.Graphics();
      hoverEffect.label = 'hover-effect';
      // Get the actual rendered sprite size (after scaling)
      const tokenData = this.activeTokens.get(tokenRoot.tokenId);
      if (!tokenData) return;
      
      // Use the actual sprite dimensions (which are already scaled to the target size)
      const spriteRadius = Math.max(sprite.width, sprite.height) / 2;
      const circleRadius = spriteRadius;
      // Draw orange hover effect (different from red selection)
      hoverEffect.circle(0, 0, circleRadius)
        .stroke({ width: 2, color: 0xFF8800, alpha: 0.8 });
      // Add to token root container
      tokenRoot.addChild(hoverEffect);
    }
  }
  
  /**
   * Remove hover visual effect from token
   */
  private removeHoverVisual(tokenRoot: TokenContainer): void {
    // Find and remove hover effect
    const effect = tokenRoot.children.find(child => child.label === 'hover-effect');
    if (effect) {
      tokenRoot.removeChild(effect);
      effect.destroy();
    }
  }
  

  
  /**
   * Animate token movement
   */
  private animateTokenMovement(tokenRoot: TokenContainer, newPosition: TokenPosition): void {
    // Store starting position
    const startX = tokenRoot.x;
    const startY = tokenRoot.y;
    // Distance to move
    const dx = newPosition.x - startX;
    const dy = newPosition.y - startY;
    // Animation duration (ms)
    const duration = 200;
    const startTime = Date.now();
    // Animate movement
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing function (ease-out)
      const easeProgress = 1 - Math.pow(1 - progress, 2);
      // Calculate new position
      tokenRoot.x = startX + dx * easeProgress;
      tokenRoot.y = startY + dy * easeProgress;
      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    // Start animation
    animate();
  }

  /**
   * Update selection visual for a token
   */
  private updateSelectionVisual(tokenRoot: TokenContainer, sprite: PIXI.Sprite, selected: boolean): void {
    if (!tokenRoot.tokenId) return;
    // Remove existing selection visual
    const existingSelection = tokenRoot.children.find(child => child.label === 'selection');
    if (existingSelection) {
      tokenRoot.removeChild(existingSelection);
    }
    if (selected) {
      // Remove hover effect when selecting (to avoid conflict with orange circle)
      this.removeHoverVisual(tokenRoot);
      // Create red circle around the token
      const selectionCircle = new PIXI.Graphics();
      selectionCircle.label = 'selection';
      // Get the actual rendered sprite size (after scaling)
      const tokenData = this.activeTokens.get(tokenRoot.tokenId);
      if (!tokenData) return;
      
      // Use the actual sprite dimensions (which are already scaled to the target size)
      const spriteRadius = Math.max(sprite.width, sprite.height) / 2;
      const circleRadius = spriteRadius;
      // Draw red circle at the compensated radius
      selectionCircle.circle(0, 0, circleRadius)
        .stroke({ width: 5, color: 0xff0000 }); // Red color, 5px width (thicker)
      // Position the circle at the center of the token
      selectionCircle.x = 0;
      selectionCircle.y = 0;
      // Add the selection circle as a child of the token root
      tokenRoot.addChild(selectionCircle);
    } else {
      // When deselecting, restore hover effect if mouse is still over the token
      // (This will be handled by the hover event handlers)
    }
  }
  
  /**
   * Update target visual for a token (orange border)
   */
  private updateTargetVisual(tokenRoot: TokenContainer, sprite: PIXI.Sprite, targeted: boolean): void {
    if (!tokenRoot.tokenId) return;
    
    // Remove existing target visual
    const existingTarget = tokenRoot.children.find(child => child.label === 'target');
    if (existingTarget) {
      tokenRoot.removeChild(existingTarget);
    }
    
    if (targeted) {
      // Create orange circle around the token for targets
      const targetCircle = new PIXI.Graphics();
      targetCircle.label = 'target';
      
      // Get the actual rendered sprite size (after scaling)
      const tokenData = this.activeTokens.get(tokenRoot.tokenId);
      if (!tokenData) return;
      
      // Use the actual sprite dimensions (which are already scaled to the target size)
      const spriteRadius = Math.max(sprite.width, sprite.height) / 2;
      const circleRadius = spriteRadius;
      
      // Draw orange circle for targets
      targetCircle.circle(0, 0, circleRadius)
        .stroke({ width: 4, color: 0xff8800 }); // Orange color, 4px width (slightly thinner than selection)
        
      // Position the circle at the center of the token
      targetCircle.x = 0;
      targetCircle.y = 0;
      
      // Add the target circle as a child of the token root
      tokenRoot.addChild(targetCircle);
    }
  }
  
  /**
   * Update status bars for a token
   */
  updateTokenStatusBars(tokenId: string, statusBars: TokenStatusBarData[]): void {
    const tokenData = this.activeTokens.get(tokenId);
    if (!tokenData) {
      return;
    }
    
    const tokenRoot = tokenData.root as TokenContainer;
    const sprite = tokenData.sprite;
    
    // Remove existing status bars
    const existingStatusBars = tokenRoot.children.filter(child => 
      typeof child.label === 'string' && child.label.startsWith('status-bar-')
    );
    for (const bar of existingStatusBars) {
      tokenRoot.removeChild(bar);
      bar.destroy();
    }
    
    if (!statusBars.length) return;
    
    // Get sprite dimensions for positioning
    const spriteRadius = Math.max(sprite.width, sprite.height) / 2;
    
    // Group status bars by position
    const topBars = statusBars.filter(bar => bar.config.position === 'top' && bar.visible);
    const bottomBars = statusBars.filter(bar => bar.config.position === 'bottom' && bar.visible);
    
    // Render status bars
    this.renderStatusBarsAtPosition(tokenRoot, topBars, spriteRadius, 'top');
    this.renderStatusBarsAtPosition(tokenRoot, bottomBars, spriteRadius, 'bottom');
  }
  
  /**
   * Render status bars at a specific position (top or bottom)
   */
  private renderStatusBarsAtPosition(
    tokenRoot: TokenContainer, 
    statusBars: TokenStatusBarData[], 
    spriteRadius: number, 
    position: 'top' | 'bottom'
  ): void {
    if (!statusBars.length) {
      return;
    }
    
    const barWidth = spriteRadius * 1.8; // Status bar width relative to token size
    const barHeight = 6; // Fixed height for status bars
    const barSpacing = 2; // Spacing between multiple bars
    const marginFromSprite = 8; // Distance from token edge
    
    // Calculate starting Y position based on position type
    const baseY = position === 'top' 
      ? -spriteRadius - marginFromSprite - barHeight 
      : spriteRadius + marginFromSprite;
    
    statusBars.forEach((statusBar, index) => {
      const barContainer = new PIXI.Container();
      barContainer.label = `status-bar-${statusBar.config.id}`;
      
      // Calculate Y position for this bar
      const yOffset = position === 'top' 
        ? -(barHeight + barSpacing) * index 
        : (barHeight + barSpacing) * index;
      const barY = baseY + yOffset;
      
      // Create background bar (empty state)
      const backgroundBar = new PIXI.Graphics();
      backgroundBar.rect(-barWidth / 2, 0, barWidth, barHeight)
        .fill(0x333333) // Dark gray background
        .stroke({ width: 1, color: 0x666666 }); // Light gray border
      
      // Add background bar first (renders behind)
      barContainer.addChild(backgroundBar);
      
      // Create filled bar (current state) - add after background so it renders on top
      const fillWidth = barWidth * statusBar.percentage;
      if (fillWidth > 0) {
        const fillColor = this.parseHexColor(statusBar.displayColor);
        const fillBar = new PIXI.Graphics();
        fillBar.rect(-barWidth / 2, 0, fillWidth, barHeight)
          .fill(fillColor);
        barContainer.addChild(fillBar);
      }
      
      // Position the bar container
      barContainer.x = 0; // Centered horizontally
      barContainer.y = barY;
      
      // Add to token root
      tokenRoot.addChild(barContainer);
    });
  }
  
  /**
   * Parse hex color string to PIXI color number
   */
  private parseHexColor(hexColor: string): number {
    // Remove # prefix if present
    const hex = hexColor.replace('#', '');
    
    // Convert to number
    return parseInt(hex, 16);
  }
} 