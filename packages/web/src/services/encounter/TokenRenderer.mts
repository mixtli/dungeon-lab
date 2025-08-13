import * as PIXI from 'pixi.js';
import type { Token } from '@dungeon-lab/shared/types/tokens.mjs';
import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';
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
  rightClick: (tokenId: string, event: PIXI.FederatedPointerEvent) => void;
}

interface TokenRendererEventHandlers {
  select?: (tokenId: string) => void;
  deselect?: () => void;
  dragStart?: (tokenId: string, position: { x: number; y: number }) => void;
  dragMove?: (tokenId: string, position: { x: number; y: number }) => void;
  dragEnd?: (tokenId: string, position: { x: number; y: number }) => void;
  click?: (tokenId: string, event: PIXI.FederatedPointerEvent) => void;
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
  
  // Performance settings
  private maxPoolSize = 50;
  
  // Configuration
  private _gridSize: number = 50;
  private _snapToGrid: boolean = true;
  private _dragThreshold: number = 5; // pixels - minimum distance to start dragging
  
  // Drag state
  private _isDragging = false;
  private _dragTarget: TokenSprite | null = null;
  private _dragStartPosition: { x: number; y: number } | null = null;
  private _dragStartGlobal: { x: number; y: number } | null = null;
  
  // Map data for bounds checking
  private _mapData: IMapResponse | null = null;
  
  constructor(tokenContainer: PIXI.Container, _options?: TokenRendererOptions, scaleProvider?: () => number) {
    this.tokenContainer = tokenContainer;
    this.scaleProvider = scaleProvider;
    console.log('[TokenRenderer] initialized with container:', tokenContainer.label || 'unnamed');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear all tokens
    this.clearAllTokens();
    
    // Clear texture cache
    this.textureCache.clear();
    
    console.log('[TokenRenderer] Destroyed and cleaned up');
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
    
    // Snap to grid center - each grid square center is at (n * gridSize + gridSize/2)
    const gridX = Math.round((position.x - this._gridSize / 2) / this._gridSize) * this._gridSize + this._gridSize / 2;
    const gridY = Math.round((position.y - this._gridSize / 2) / this._gridSize) * this._gridSize + this._gridSize / 2;
    
    return { x: gridX, y: gridY };
  }
  
  /**
   * Calculate center position from grid bounds
   */
  private getCenterFromBounds(bounds: { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number } }): { x: number; y: number } {
    console.log(`[TokenRenderer] 🧮 Calculating center from bounds:`, bounds);
    
    const centerGridX = (bounds.topLeft.x + bounds.bottomRight.x) / 2;
    const centerGridY = (bounds.topLeft.y + bounds.bottomRight.y) / 2;
    
    console.log(`[TokenRenderer] 📐 Grid center:`, { centerGridX, centerGridY });
    console.log(`[TokenRenderer] 📏 Grid size:`, this._gridSize);
    
    const worldX = centerGridX * this._gridSize + this._gridSize / 2;
    const worldY = centerGridY * this._gridSize + this._gridSize / 2;
    
    console.log(`[TokenRenderer] 🌍 World coordinates:`, { worldX, worldY });
    
    // Convert grid coordinates to world coordinates  
    return {
      x: worldX,
      y: worldY
    };
  }
  
  /**
   * Calculate pixel size from grid bounds
   */
  private getPixelSizeFromBounds(bounds: { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number } }): number {
    console.log(`[TokenRenderer] 📐 Calculating pixel size from bounds:`, bounds);
    
    const gridWidth = bounds.bottomRight.x - bounds.topLeft.x + 1;
    const gridHeight = bounds.bottomRight.y - bounds.topLeft.y + 1;
    
    console.log(`[TokenRenderer] 📊 Grid dimensions:`, { gridWidth, gridHeight });
    
    // Use the larger dimension for square tokens
    const gridSize = Math.max(gridWidth, gridHeight);
    const pixelSize = gridSize * this._gridSize;
    
    console.log(`[TokenRenderer] 🎯 Final pixel size:`, { gridSize, pixelSize });
    
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
    console.log(`[TokenRenderer] 🟢 Starting addToken for ${token.id}:`, {
      tokenName: token.name,
      bounds: token.bounds,
      imageUrl: token.imageUrl,
      isVisible: token.isVisible
    });
    
    try {
      // Remove existing token if it exists
      if (this.activeTokens.has(token.id)) {
        console.log(`[TokenRenderer] 🔄 Removing existing token ${token.id}`);
        this.removeToken(token.id);
      }

      // Create a container for the token (tokenRoot)
      const tokenRoot = new PIXI.Container() as TokenContainer;
      tokenRoot.tokenId = token.id; // custom property for tracking
      console.log(`[TokenRenderer] 📦 Created token container for ${token.id}`);

      // Get sprite from pool or create new one
      console.log(`[TokenRenderer] 🎭 Acquiring sprite for ${token.id}`);
      const sprite = this.acquireSprite();
      
      // Load texture for token
      console.log(`[TokenRenderer] 🖼️ Loading texture for ${token.id}`);
      const texture = await this.getTokenTexture(token);
      sprite.texture = texture;
      console.log(`[TokenRenderer] ✅ Texture loaded and assigned to sprite`);
      
      // Configure sprite
      console.log(`[TokenRenderer] ⚙️ Configuring sprite for ${token.id}`);
      this.configureTokenSprite(sprite, token);

      // Position the tokenRoot container at world coordinates (center of bounds)
      const centerPosition = this.getCenterFromBounds(token.bounds);
      tokenRoot.x = centerPosition.x;
      tokenRoot.y = centerPosition.y;
      console.log(`[TokenRenderer] 🎯 Positioned token container at:`, { x: tokenRoot.x, y: tokenRoot.y });

      // Add the sprite to the container
      tokenRoot.addChild(sprite);
      console.log(`[TokenRenderer] 🏗️ Added sprite to token container`);

      // Add the container to the main tokenContainer
      this.tokenContainer.addChild(tokenRoot);
      console.log(`[TokenRenderer] 🏗️ Added token container to main container`);
      
      // Track both root and sprite for this token
      this.activeTokens.set(token.id, {
        id: token.id,
        root: tokenRoot,
        sprite,
        token
      });
      
      console.log(`[TokenRenderer] 📊 Added to activeTokens map, total tokens:`, this.activeTokens.size);
      
      // Verify sprite is in container hierarchy
      const childIndex = this.tokenContainer.children.indexOf(tokenRoot);
      const spriteInRoot = tokenRoot.children.indexOf(sprite);
      console.log(`[TokenRenderer] 🔍 Verification:`, {
        tokenRootChildIndex: childIndex,
        spriteInRootIndex: spriteInRoot,
        mainContainerChildren: this.tokenContainer.children.length,
        tokenRootChildren: tokenRoot.children.length,
        spriteVisible: sprite.visible,
        spriteAlpha: sprite.alpha,
        spriteWidth: sprite.width,
        spriteHeight: sprite.height
      });
      
      console.log(`[TokenRenderer] ✅ Successfully added token ${token.id}`);
    } catch (error) {
      console.error(`[TokenRenderer] ❌ Failed to add token ${token.id}:`, error);
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
    if (!tokenData) return;
    
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
    console.log(`[TokenRenderer] ⚙️ Configuring sprite for token ${token.id}`);
    
    // Set token ID for reference
    sprite.tokenId = token.id;
    console.log(`[TokenRenderer] 🏷️ Set token ID on sprite:`, token.id);
    
    // Note: Position snapping is handled by the parent tokenRoot container
    
    // Set sprite position relative to its parent container (tokenRoot)
    // The tokenRoot will be positioned at world coordinates, so sprite should be at (0, 0)
    sprite.x = 0;
    sprite.y = 0;
    console.log(`[TokenRenderer] 📍 Set sprite position relative to container:`, { x: sprite.x, y: sprite.y });
    
    // Calculate size based on grid bounds
    const size = this.getPixelSizeFromBounds(token.bounds);
    console.log(`[TokenRenderer] 📏 Target size for sprite:`, size);
    
    // Set anchor to center
    sprite.anchor.set(0.5);
    console.log(`[TokenRenderer] ⚓ Set anchor to center:`, { x: sprite.anchor.x, y: sprite.anchor.y });
    
    // Scale sprite to match desired size
    const originalWidth = sprite.width;
    const originalHeight = sprite.height;
    const scale = size / Math.max(sprite.width, sprite.height);
    sprite.scale.set(scale);
    
    console.log(`[TokenRenderer] 🔍 Sprite scaling:`, {
      originalSize: { width: originalWidth, height: originalHeight },
      targetSize: size,
      scale: scale,
      finalSize: { width: sprite.width, height: sprite.height }
    });
    
    // Enable interactivity
    sprite.eventMode = 'static';
    sprite.cursor = 'pointer';
    console.log(`[TokenRenderer] 🖱️ Enabled sprite interactivity`);
    
    // Setup interactive events
    this.setupSpriteEvents(sprite);
    console.log(`[TokenRenderer] 🎯 Set up sprite events`);
    
    // Apply visual state
    if (token.id && this.selectedTokenId === token.id) {
      const tokenData = this.activeTokens.get(token.id);
      if (tokenData) {
        console.log(`[TokenRenderer] 🎨 Applying selection visual for already selected token`);
        this.updateSelectionVisual(tokenData.root as TokenContainer, sprite, true);
      }
    }
    
    console.log(`[TokenRenderer] ✅ Sprite configuration complete for ${token.id}`);
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
      console.log('[TokenRenderer] Loading token texture:', {
        original: token.imageUrl,
        transformed: transformedUrl,
        tokenName: token.name
      });
      
      const texture = await this.loadTokenTextureWithTimeout(transformedUrl);
      
      // Cache for reuse (use transformed URL as cache key)
      this.textureCache.set(transformedUrl, texture);
      
      return texture;
    } catch (error) {
      console.error(`Failed to load token texture: ${transformedUrl}`, error);
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
      
      console.log('[TokenRenderer] Loading token texture with HTMLImageElement:', imageUrl);
      img.src = imageUrl;
    });
  }
  
  /**
   * Setup interactive events for token sprite
   */
  private setupSpriteEvents(sprite: TokenSprite): void {
    sprite.removeAllListeners(); // Prevent duplicate event handlers
    // Click/tap handler
    sprite.on('pointerdown', this.handlePointerDown.bind(this, sprite));
    // Remove pointermove from individual sprites - we'll use stage-level listeners during drag
    // sprite.on('pointermove', this.handlePointerMove.bind(this, sprite));
    sprite.on('pointerup', this.handlePointerUp.bind(this));
    sprite.on('pointerupoutside', this.handlePointerUp.bind(this));
    // Hover effects
    sprite.on('pointerover', this.handlePointerOver.bind(this, sprite));
    sprite.on('pointerout', this.handlePointerOut.bind(this, sprite));
    // Add rightdown event for right-click context menu
    sprite.on('rightdown', (event: PIXI.FederatedPointerEvent) => {
      if (sprite.tokenId && this.eventHandlers.rightClick) {
        console.log('[TokenRenderer] rightdown event detected for token', sprite.tokenId, event);
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
   * Handle pointer down event
   */
  private handlePointerDown(sprite: TokenSprite, event: PIXI.FederatedPointerEvent): void {
    if (!sprite.tokenId) return;
    // Store original position before any potential drag
    sprite.originalPosition = { x: sprite.x, y: sprite.y };
    // Remove right-click logic from here; handled by rightdown event
    // Left click - prepare for potential drag (but don't start dragging yet)
    if (event.button === 0 && this.dragEnabled) {
      // Store drag start information but don't mark as dragging yet
      this._dragTarget = sprite;
      this._dragStartPosition = { x: sprite.x, y: sprite.y };
      this._dragStartGlobal = { x: event.global.x, y: event.global.y };
      // Set up stage-level listeners to detect if this becomes a drag
      const stage = this.tokenContainer.parent;
      if (stage) {
        stage.on('pointermove', this.handleStageDragMove, this);
        stage.on('pointerup', this.handleStageDragEnd, this);
        stage.on('pointerupoutside', this.handleStageDragEnd, this);
      }
    }
    // Always emit click event for external handlers
    if (this.eventHandlers.click) {
      this.eventHandlers.click(sprite.tokenId, event);
    }
    
    console.log('Token clicked:', sprite.tokenId);
  }
  
  /**
   * Handle stage-level drag move event
   */
  private handleStageDragMove(event: PIXI.FederatedPointerEvent): void {
    if (!this._dragTarget || !this._dragStartGlobal || !this._dragStartPosition) return;
    
    const sprite = this._dragTarget;
    if (!sprite.tokenId) return;
    
    // Calculate distance from initial mouse position
    const deltaX = event.global.x - this._dragStartGlobal.x;
    const deltaY = event.global.y - this._dragStartGlobal.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // If not dragging yet, check if we've exceeded the threshold
    if (!this._isDragging) {
      if (distance >= this._dragThreshold) {
        // Start dragging
        this._isDragging = true;
        sprite.dragging = true;
        
        // Emit drag start event
        if (this.eventHandlers.dragStart) {
          const currentPos = { x: sprite.x, y: sprite.y };
          this.eventHandlers.dragStart(sprite.tokenId, currentPos);
        }
      } else {
        // Haven't exceeded threshold yet, don't move the token
        return;
      }
    }
    
    // Continue dragging - update sprite position
    const newPosition = this.calculateDragPosition(sprite, event);
    sprite.x = newPosition.x;
    sprite.y = newPosition.y;
    
    // Emit drag move event
    if (this.eventHandlers.dragMove) {
      this.eventHandlers.dragMove(sprite.tokenId, { x: sprite.x, y: sprite.y });
    }
  }
  
  /**
   * Handle stage-level drag end event
   */
  private handleStageDragEnd(): void {
    if (!this._dragTarget) return;
    
    const sprite = this._dragTarget;
    if (!sprite.tokenId) return;
    
    // Remove stage-level event listeners
    const stage = this.tokenContainer.parent;
    if (stage) {
      stage.off('pointermove', this.handleStageDragMove, this);
      stage.off('pointerup', this.handleStageDragEnd, this);
      stage.off('pointerupoutside', this.handleStageDragEnd, this);
    }
    
    // Check if we were actually dragging
    if (this._isDragging && sprite.dragging) {
      // This was a drag operation
      const originalPos = this._dragStartPosition;
      const currentPos = { x: sprite.x, y: sprite.y };
      
      // Check if the token actually moved
      const hasMoved = originalPos && (
        Math.abs(currentPos.x - originalPos.x) > 0.1 || 
        Math.abs(currentPos.y - originalPos.y) > 0.1
      );
      
      if (hasMoved) {
        // Snap the final position to grid
        const snappedPosition = this.snapToGrid(currentPos);
        
        // Check if the snapped position is within map bounds
        if (!isPositionWithinBounds(snappedPosition, this._mapData)) {
          const clampedPosition = clampPositionToBounds(snappedPosition, this._mapData);
          
          // Update sprite to clamped position
          sprite.x = clampedPosition.x;
          sprite.y = clampedPosition.y;
          
          // Emit drag end event with clamped position
          if (this.eventHandlers.dragEnd) {
            this.eventHandlers.dragEnd(sprite.tokenId, clampedPosition);
          }
        } else {
          // Position is within bounds, use snapped position
          sprite.x = snappedPosition.x;
          sprite.y = snappedPosition.y;
          
          // Emit drag end event with snapped position
          if (this.eventHandlers.dragEnd) {
            this.eventHandlers.dragEnd(sprite.tokenId, snappedPosition);
          }
        }
      } else {
        // Token didn't actually move, reset to original position
        if (originalPos) {
          sprite.x = originalPos.x;
          sprite.y = originalPos.y;
        }
      }
    } else {
      // This was a click (not a drag) - let parent component handle selection
      // The click event was already emitted in handlePointerDown
      console.log('[TokenRenderer] Click detected on token:', sprite.tokenId, '- parent component will handle selection');
    }
    
    // Clean up drag state
    this._isDragging = false;
    this._dragTarget = null;
    this._dragStartPosition = null;
    this._dragStartGlobal = null;
    
    // Clean up sprite drag state
    sprite.dragging = false;
    sprite.originalPosition = undefined;
  }
  

  
  /**
   * Handle pointer up event
   */
  private handlePointerUp(): void {
    // The stage drag end handler will handle all the drag/selection logic
  }
  
  /**
   * Calculate new position during drag
   */
  private calculateDragPosition(sprite: TokenSprite, event: PIXI.FederatedPointerEvent): TokenPosition {
    if (!this._dragStartGlobal || !this._dragStartPosition) return { x: sprite.x, y: sprite.y };

    // Calculate the difference in global coordinates (screen pixels)
    const dx = event.global.x - this._dragStartGlobal.x;
    const dy = event.global.y - this._dragStartGlobal.y;

    // Get the current scale from the scale provider (ViewportManager)
    const scale = this.scaleProvider ? this.scaleProvider() : 1;
    
    // Convert screen pixel movement to world coordinate movement
    const worldDx = dx / scale;
    const worldDy = dy / scale;


    return {
      x: this._dragStartPosition.x + worldDx,
      y: this._dragStartPosition.y + worldDy
    };
  }
  

  
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
} 