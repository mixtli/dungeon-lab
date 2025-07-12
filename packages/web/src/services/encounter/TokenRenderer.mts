import * as PIXI from 'pixi.js';
import type { Token, TokenSize } from '@dungeon-lab/shared/types/tokens.mjs';
import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';
import defaultTokenUrl from '@/assets/images/default_token.svg';
import { isPositionWithinBounds, clampPositionToBounds } from '../../utils/bounds-validation.mjs';

export interface TokenSpriteData {
  id: string;
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
  private eventHandlers: TokenRendererEventHandlers = {};
  private _onTokenClick?: (tokenId: string) => void;

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
  
  constructor(tokenContainer: PIXI.Container, options?: TokenRendererOptions, scaleProvider?: () => number) {
    this.tokenContainer = tokenContainer;
    this._onTokenClick = options?.onTokenSelect;
    this.scaleProvider = scaleProvider;
    console.log('[TokenRenderer] initialized with container:', tokenContainer.name);
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
   * Get grid-based token size - tokens should completely fill the grid square
   */
  private getGridBasedTokenSize(tokenSize: TokenSize): number {
    // Base size is the grid size (tokens fill the entire grid square)
    let multiplier = 1;
    
    // Different token sizes occupy different numbers of grid squares
    switch (tokenSize) {
      case 'tiny':
        multiplier = 0.5; // Half a grid square
        break;
      case 'small':
      case 'medium':
        multiplier = 1; // One grid square
        break;
      case 'large':
        multiplier = 2; // Two grid squares
        break;
      case 'huge':
        multiplier = 3; // Three grid squares
        break;
      case 'gargantuan':
        multiplier = 4; // Four grid squares
        break;
    }
    
    return this._gridSize * multiplier;
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
      
      // Get sprite from pool or create new one
      const sprite = this.acquireSprite();
      
      // Load texture for token
      const texture = await this.getTokenTexture(token);
      sprite.texture = texture;
      
      // Configure sprite
      this.configureTokenSprite(sprite, token);
      
      // Add to container and tracking
      this.tokenContainer.addChild(sprite);
      this.activeTokens.set(token.id, {
        id: token.id,
        sprite,
        token
      });
      
    } catch (error) {
      console.error(`Failed to add token ${token.id}:`, error);
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
    this.tokenContainer.removeChild(tokenData.sprite);
    
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
    
    const sprite = tokenData.sprite;
    
    // Snap position to grid if enabled
    const finalPosition = this.snapToGrid(newPosition);
    console.log('[TokenRenderer] moveToken - original position:', newPosition, 'snapped position:', finalPosition);
    
    if (animate) {
      // Smooth animation to new position
      this.animateTokenMovement(sprite, finalPosition);
    } else {
      // Instant movement
      sprite.x = finalPosition.x;
      sprite.y = finalPosition.y;
    }
    
    // Update token data (convert to grid position with elevation)
    tokenData.token.position = {
      x: Math.round(finalPosition.x),
      y: Math.round(finalPosition.y),
      elevation: tokenData.token.position.elevation // Preserve elevation
    };
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
      this.tokenContainer.removeChild(tokenData.sprite);
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
    this.updateSelectionVisual(tokenData.sprite, true);
    
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
    this.updateSelectionVisual(tokenData.sprite, false);
    
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
    // Set token ID for reference
    sprite.tokenId = token.id;
    console.log('[TokenRenderer] configureTokenSprite set tokenId', token.id);
    
    // Snap position to grid if enabled
    let position = { x: token.position.x, y: token.position.y };
    if (this._snapToGrid) {
      position = this.snapToGrid(position);
      console.log('[TokenRenderer] snapped position to grid:', position);
    }
    
    // Set position - tokens are now children of mapContainer so we use world coordinates directly
    console.log('[TokenRenderer] configureTokenSprite setting position', token.id, position);
    sprite.x = position.x;
    sprite.y = position.y;
    console.log('[TokenRenderer] using world coordinates directly:', position);
    
    // Calculate size based on grid size and token size
    const size = this.getGridBasedTokenSize(token.size || 'medium');
    console.log('[TokenRenderer] calculated grid-based size:', size, 'for token size:', token.size || 'medium');
    
    // Set anchor to center
    sprite.anchor.set(0.5);
    
    // Scale sprite to match desired size
    const scale = size / Math.max(sprite.width, sprite.height);
    sprite.scale.set(scale);
    console.log('[TokenRenderer] set sprite scale to:', scale);
    
    // Enable interactivity
    sprite.eventMode = 'static';
    sprite.cursor = 'pointer';
    
    // Setup interactive events
    this.setupSpriteEvents(sprite);
    
    // Apply visual state
    if (this.selectedTokenId === token.id) {
      this.updateSelectionVisual(sprite, true);
    }
  }
  

  
  /**
   * Get texture for token
   */
  private async getTokenTexture(token: Token): Promise<PIXI.Texture> {
    // Check cache first
    if (token.imageUrl && this.textureCache.has(token.imageUrl)) {
      return this.textureCache.get(token.imageUrl)!;
    }
    
    // No image URL, use default
    if (!token.imageUrl) {
      return PIXI.Texture.from(defaultTokenUrl);
    }
    
    // Load texture
    try {
      const texture = await PIXI.Texture.fromURL(token.imageUrl);
      
      // Cache for reuse
      this.textureCache.set(token.imageUrl, texture);
      
      return texture;
    } catch (error) {
      console.error(`Failed to load token texture: ${token.imageUrl}`, error);
      return PIXI.Texture.from(defaultTokenUrl);
    }
  }
  
  /**
   * Setup interactive events for token sprite
   */
  private setupSpriteEvents(sprite: TokenSprite): void {
    // Click/tap handler
    sprite.on('pointerdown', this.handlePointerDown.bind(this, sprite));
    // Remove pointermove from individual sprites - we'll use stage-level listeners during drag
    // sprite.on('pointermove', this.handlePointerMove.bind(this, sprite));
    sprite.on('pointerup', this.handlePointerUp.bind(this, sprite));
    sprite.on('pointerupoutside', this.handlePointerUp.bind(this, sprite));
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
    if (sprite.tokenId !== this.selectedTokenId) {
      this.applyHoverVisual(sprite);
    }
  }

  /**
   * Handle pointer out event
   */
  private handlePointerOut(sprite: TokenSprite): void {
    // Remove hover effect if not selected
    if (sprite.tokenId !== this.selectedTokenId) {
      this.removeHoverVisual(sprite);
    }
  }

  /**
   * Handle pointer down event
   */
  private handlePointerDown(sprite: TokenSprite, event: PIXI.FederatedPointerEvent): void {
    console.log('[TokenRenderer] pointerdown', sprite.tokenId, event);
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
      console.log('[TokenRenderer] prepared for potential drag', sprite.tokenId, {
        spritePos: { x: sprite.x, y: sprite.y },
        globalPos: { x: event.global.x, y: event.global.y }
      });
    }
    // Always emit click event for external handlers
    if (this.eventHandlers.click) {
      this.eventHandlers.click(sprite.tokenId, event);
    }
    // Call the legacy click handler
    if (this._onTokenClick) {
      this._onTokenClick(sprite.tokenId);
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
    
    console.log('[TokenRenderer] stage drag move', sprite.tokenId, event);
    
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
        
        console.log('[TokenRenderer] drag threshold exceeded, starting drag', sprite.tokenId, {
          distance,
          threshold: this._dragThreshold
        });
        
        // Emit drag start event
        if (this.eventHandlers.dragStart) {
          const currentPos = { x: sprite.x, y: sprite.y };
          console.log('[TokenRenderer] calling dragStart handler', sprite.tokenId, currentPos);
          this.eventHandlers.dragStart(sprite.tokenId, currentPos);
        }
      } else {
        // Haven't exceeded threshold yet, don't move the token
        return;
      }
    }
    
    // Continue dragging - update sprite position
    console.log('[TokenRenderer] before move - sprite position:', { x: sprite.x, y: sprite.y });
    
    const newPosition = this.calculateDragPosition(sprite, event);
    console.log('[TokenRenderer] calculated new position:', newPosition);
    
    sprite.x = newPosition.x;
    sprite.y = newPosition.y;
    
    console.log('[TokenRenderer] after move - sprite position:', { x: sprite.x, y: sprite.y });
    
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
    
    console.log('[TokenRenderer] stage drag end', sprite.tokenId);
    
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
        console.log('[TokenRenderer] Final drag position before snap:', currentPos);
        console.log('[TokenRenderer] Final drag position after snap:', snappedPosition);
        
        // Check if the snapped position is within map bounds
        if (!isPositionWithinBounds(snappedPosition, this._mapData)) {
          console.log('[TokenRenderer] Position is outside map bounds, clamping to bounds');
          const clampedPosition = clampPositionToBounds(snappedPosition, this._mapData);
          console.log('[TokenRenderer] Clamped position:', clampedPosition);
          
          // Update sprite to clamped position
          sprite.x = clampedPosition.x;
          sprite.y = clampedPosition.y;
          
          // Emit drag end event with clamped position
          if (this.eventHandlers.dragEnd) {
            console.log('[TokenRenderer] Calling dragEnd handler with clamped position:', sprite.tokenId, clampedPosition);
            this.eventHandlers.dragEnd(sprite.tokenId, clampedPosition);
            console.log('[TokenRenderer] dragEnd handler called');
          }
        } else {
          // Position is within bounds, use snapped position
          sprite.x = snappedPosition.x;
          sprite.y = snappedPosition.y;
          
          // Emit drag end event with snapped position
          if (this.eventHandlers.dragEnd) {
            console.log('[TokenRenderer] Calling dragEnd handler with snapped position:', sprite.tokenId, snappedPosition);
            this.eventHandlers.dragEnd(sprite.tokenId, snappedPosition);
            console.log('[TokenRenderer] dragEnd handler called');
          }
        }
      } else {
        // Token didn't actually move, reset to original position
        if (originalPos) {
          sprite.x = originalPos.x;
          sprite.y = originalPos.y;
        }
        console.log('[TokenRenderer] Token did not move, no server update needed');
      }
    } else {
      // This was a click (not a drag) - handle selection
      console.log('[TokenRenderer] handling click selection for', sprite.tokenId);
      
      // Toggle selection
      if (this.selectedTokenId === sprite.tokenId) {
        // Deselect if already selected
        this.deselectToken(sprite.tokenId);
      } else {
        // Select this token
        this.selectToken(sprite.tokenId);
      }
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
  private handlePointerUp(sprite: TokenSprite): void {
    console.log('[TokenRenderer] pointerup', sprite.tokenId, 'dragging:', sprite.dragging);
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

    console.log('[TokenRenderer] calculateDragPosition', {
      dragStartX: this._dragStartPosition.x,
      dragStartY: this._dragStartPosition.y,
      eventGlobal: { x: event.global.x, y: event.global.y },
      dragStartGlobal: this._dragStartGlobal,
      screenDelta: { dx, dy },
      scale: scale,
      worldDelta: { worldDx, worldDy }
    });

    return {
      x: this._dragStartPosition.x + worldDx,
      y: this._dragStartPosition.y + worldDy
    };
  }
  

  
  /**
   * Apply hover visual effect to token
   */
  private applyHoverVisual(sprite: PIXI.Sprite): void {
    // Create hover effect if it doesn't exist
    if (!sprite.children.find(child => child.name === 'hover-effect')) {
      const hoverEffect = new PIXI.Graphics();
      hoverEffect.name = 'hover-effect';
      
      // Get the world coordinate radius (compensating for sprite scale)
      // The token should fill a grid square, so its radius should be gridSize/2
      const worldTokenRadius = this._gridSize / 2; // 60 for gridSize 120
      const hoverWorldRadius = worldTokenRadius + 3; // Add 3 world units padding (smaller than selection)
      
      // Compensate for sprite scaling: if sprite is scaled down, we need to scale the circle up
      const spriteScale = sprite.scale.x; // Assuming uniform scaling
      const circleRadius = hoverWorldRadius / spriteScale;
      
      // Draw orange hover effect (different from red selection)
      hoverEffect.lineStyle(2, 0xFF8800, 0.8);
      hoverEffect.drawCircle(0, 0, circleRadius);
      
      // Add to sprite
      sprite.addChild(hoverEffect);
      
      console.log('[TokenRenderer] Added hover effect to token - hoverWorldRadius:', hoverWorldRadius, 'spriteScale:', spriteScale, 'circleRadius:', circleRadius);
    }
  }
  
  /**
   * Remove hover visual effect from token
   */
  private removeHoverVisual(sprite: PIXI.Sprite): void {
    // Find and remove hover effect
    const effect = sprite.children.find(child => child.name === 'hover-effect');
    if (effect) {
      sprite.removeChild(effect);
      effect.destroy();
    }
  }
  

  
  /**
   * Animate token movement
   */
  private animateTokenMovement(sprite: PIXI.Sprite, newPosition: TokenPosition): void {
    // Store starting position
    const startX = sprite.x;
    const startY = sprite.y;
    
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
      sprite.x = startX + dx * easeProgress;
      sprite.y = startY + dy * easeProgress;
      
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
  private updateSelectionVisual(sprite: TokenSprite, selected: boolean): void {
    if (!sprite.tokenId) return;
    
    // Remove existing selection visual
    const existingSelection = sprite.getChildByName('selection');
    if (existingSelection) {
      sprite.removeChild(existingSelection);
    }
    
    if (selected) {
      // Remove hover effect when selecting (to avoid conflict with orange circle)
      this.removeHoverVisual(sprite);
      
      // Create red circle around the token
      const selectionCircle = new PIXI.Graphics();
      selectionCircle.name = 'selection';
      
      // Get the world coordinate radius (compensating for sprite scale)
      // The token should fill a grid square, so its radius should be gridSize/2
      const worldTokenRadius = this._gridSize / 2; // 60 for gridSize 120
      const selectionWorldRadius = worldTokenRadius + 8; // Add 8 world units padding
      
      // Compensate for sprite scaling: if sprite is scaled down, we need to scale the circle up
      const spriteScale = sprite.scale.x; // Assuming uniform scaling
      const circleRadius = selectionWorldRadius / spriteScale;
      
      // Draw red circle at the compensated radius
      selectionCircle.lineStyle(5, 0xff0000); // Red color, 5px width (thicker)
      selectionCircle.drawCircle(0, 0, circleRadius);
      
      // Position the circle at the center of the token
      selectionCircle.x = 0;
      selectionCircle.y = 0;
      
      // Add the selection circle as a child of the token sprite
      sprite.addChild(selectionCircle);
      
      console.log('[TokenRenderer] Added red selection circle to token:', sprite.tokenId, 
        'worldTokenRadius:', worldTokenRadius, 
        'selectionWorldRadius:', selectionWorldRadius,
        'spriteScale:', spriteScale,
        'circleRadius:', circleRadius);
    } else {
      // When deselecting, restore hover effect if mouse is still over the token
      // (This will be handled by the hover event handlers)
      console.log('[TokenRenderer] Removed selection visual from token:', sprite.tokenId);
    }
  }
} 