import * as PIXI from 'pixi.js';
import type { IToken } from '@dungeon-lab/shared/types/tokens.mjs';

export interface TokenSpriteData {
  id: string;
  sprite: PIXI.Sprite;
  token: IToken;
}

// Extended sprite interface for token-specific properties
interface TokenSprite extends PIXI.Sprite {
  tokenId?: string;
  dragging?: boolean;
  dragData?: PIXI.FederatedPointerEvent;
  dragStartPosition?: { x: number; y: number };
  originalPosition?: { x: number; y: number };
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

/**
 * Manages token sprites with efficient pooling and rendering
 * Optimized for real-time token updates and smooth animations
 */
export class TokenRenderer {
  private tokenContainer: PIXI.Container;
  private tokenPool: PIXI.Sprite[] = [];
  private activeTokens: Map<string, TokenSpriteData> = new Map();
  private textureCache: Map<string, PIXI.Texture> = new Map();
  private selectedTokenId: string | null = null;
  private eventHandlers: Partial<TokenEvents> = {};
  private dragEnabled: boolean = true;
  
  // Performance settings
  private maxPoolSize = 50;
  private _cullDistance = 1000; // Pixels outside viewport to cull - reserved for future use
  
  constructor(tokenContainer: PIXI.Container) {
    this.tokenContainer = tokenContainer;
  }
  
  /**
   * Add or update a token sprite
   */
  async addToken(token: IToken): Promise<void> {
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
  async updateToken(token: IToken): Promise<void> {
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
    
    if (animate) {
      // Smooth animation to new position
      this.animateTokenMovement(sprite, newPosition);
    } else {
      // Instant movement
      sprite.x = newPosition.x;
      sprite.y = newPosition.y;
    }
    
    // Update token data (convert to grid position with elevation)
    tokenData.token.position = {
      x: Math.round(newPosition.x),
      y: Math.round(newPosition.y),
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
    this.applySelectionVisual(tokenData.sprite);
    
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
    this.removeSelectionVisual(tokenData.sprite);
    
    // Clear selected token
    if (this.selectedTokenId === tokenId) {
      this.selectedTokenId = null;
    }
    
    // Trigger event
    if (this.eventHandlers.deselect) {
      this.eventHandlers.deselect(tokenId);
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
  setEventHandlers(handlers: Partial<TokenEvents>): void {
    this.eventHandlers = handlers;
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
  private configureTokenSprite(sprite: TokenSprite, token: IToken): void {
    // Position (convert from grid to pixel coordinates)
    sprite.x = token.position.x;
    sprite.y = token.position.y;
    
    // Size based on token size
    const size = this.getTokenPixelSize(token.size);
    sprite.width = size;
    sprite.height = size;
    
    // Anchor to center
    sprite.anchor.set(0.5, 0.5);
    
    // Visibility
    sprite.visible = token.isVisible !== false;
    
    // Store token ID for event handling
    sprite.name = `token-${token.id}`;
    sprite.tokenId = token.id;
    
    // Add visual effects based on token state
    this.applyTokenEffects(sprite, token);
    
    // Apply selection visual if this is the selected token
    if (this.selectedTokenId === token.id) {
      this.applySelectionVisual(sprite);
    }
  }
  
  /**
   * Get pixel size for token based on size category
   */
  private getTokenPixelSize(size: string): number {
    const sizeMap: Record<string, number> = {
      'tiny': 25,
      'small': 50,
      'medium': 50,
      'large': 100,
      'huge': 150,
      'gargantuan': 200
    };
    
    return sizeMap[size] || 50; // Default to medium
  }
  
  /**
   * Get texture for token
   */
  private async getTokenTexture(token: IToken): Promise<PIXI.Texture> {
    // Check cache first
    if (token.imageUrl && this.textureCache.has(token.imageUrl)) {
      return this.textureCache.get(token.imageUrl)!;
    }
    
    // No image URL, use default
    if (!token.imageUrl) {
      return PIXI.Texture.from('default_token.png');
    }
    
    // Load texture
    try {
      const texture = await PIXI.Texture.fromURL(token.imageUrl);
      
      // Cache for reuse
      this.textureCache.set(token.imageUrl, texture);
      
      return texture;
    } catch (error) {
      console.error(`Failed to load token texture: ${token.imageUrl}`, error);
      return PIXI.Texture.from('default_token.png');
    }
  }
  
  /**
   * Setup interactive events for token sprite
   */
  private setupSpriteEvents(sprite: TokenSprite): void {
    // Click/tap handler
    sprite.on('pointerdown', this.handlePointerDown.bind(this, sprite));
    sprite.on('pointermove', this.handlePointerMove.bind(this, sprite));
    sprite.on('pointerup', this.handlePointerUp.bind(this, sprite));
    sprite.on('pointerupoutside', this.handlePointerUp.bind(this, sprite));
    
    // Hover effects
    sprite.on('pointerover', this.handlePointerOver.bind(this, sprite));
    sprite.on('pointerout', this.handlePointerOut.bind(this, sprite));
  }
  
  /**
   * Handle pointer down event
   */
  private handlePointerDown(sprite: TokenSprite, event: PIXI.FederatedPointerEvent): void {
    if (!sprite.tokenId) return;
    
    // Store original position before drag
    sprite.originalPosition = { x: sprite.x, y: sprite.y };
    
    // Right click (context menu)
    if (event.button === 2) {
      if (this.eventHandlers.rightClick) {
        this.eventHandlers.rightClick(sprite.tokenId, event);
      }
      return;
    }
    
    // Left click - select and prepare for drag
    this.selectToken(sprite.tokenId);
    
    if (this.dragEnabled) {
      sprite.dragging = true;
      sprite.dragData = event;
      sprite.dragStartPosition = { x: sprite.x, y: sprite.y };
      
      // Emit drag start event
      if (this.eventHandlers.dragStart) {
        this.eventHandlers.dragStart(sprite.tokenId, { x: sprite.x, y: sprite.y });
      }
    }
    
    // Emit click event
    if (this.eventHandlers.click) {
      this.eventHandlers.click(sprite.tokenId, event);
    }
  }
  
  /**
   * Handle pointer move event
   */
  private handlePointerMove(sprite: TokenSprite, event: PIXI.FederatedPointerEvent): void {
    if (!sprite.dragging || !sprite.dragData || !sprite.tokenId) return;
    
    // Calculate new position
    const newPosition = this.calculateDragPosition(sprite, event);
    
    // Update sprite position
    sprite.x = newPosition.x;
    sprite.y = newPosition.y;
    
    // Emit drag move event
    if (this.eventHandlers.dragMove) {
      this.eventHandlers.dragMove(sprite.tokenId, newPosition);
    }
  }
  
  /**
   * Handle pointer up event
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handlePointerUp(sprite: TokenSprite, event: PIXI.FederatedPointerEvent): void {
    if (!sprite.dragging || !sprite.tokenId) return;
    
    // End drag
    sprite.dragging = false;
    
    // Final position after drag
    const finalPosition = { x: sprite.x, y: sprite.y };
    
    // Update token data
    const tokenData = this.activeTokens.get(sprite.tokenId);
    if (tokenData) {
      tokenData.token.position = {
        x: Math.round(finalPosition.x),
        y: Math.round(finalPosition.y),
        elevation: tokenData.token.position.elevation
      };
    }
    
    // Emit drag end event
    if (this.eventHandlers.dragEnd) {
      this.eventHandlers.dragEnd(sprite.tokenId, finalPosition);
    }
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
   * Calculate new position during drag
   */
  private calculateDragPosition(sprite: TokenSprite, event: PIXI.FederatedPointerEvent): TokenPosition {
    if (!sprite.dragData || !sprite.dragStartPosition) return { x: sprite.x, y: sprite.y };
    
    // Calculate the movement delta
    const dx = event.globalX - sprite.dragData.globalX;
    const dy = event.globalY - sprite.dragData.globalY;
    
    // Apply to the starting position
    return {
      x: sprite.dragStartPosition.x + dx,
      y: sprite.dragStartPosition.y + dy
    };
  }
  
  /**
   * Apply selection visual effect to token
   */
  private applySelectionVisual(sprite: PIXI.Sprite): void {
    // Create selection ring if it doesn't exist
    if (!sprite.children.find(child => child.name === 'selection-ring')) {
      const ring = new PIXI.Graphics();
      ring.name = 'selection-ring';
      
      // Draw selection ring
      ring.lineStyle(3, 0x00ff00, 0.8);
      ring.drawCircle(0, 0, sprite.width / 2 + 5);
      
      // Add to sprite
      sprite.addChild(ring);
    }
  }
  
  /**
   * Remove selection visual effect from token
   */
  private removeSelectionVisual(sprite: PIXI.Sprite): void {
    // Find and remove selection ring
    const ring = sprite.children.find(child => child.name === 'selection-ring');
    if (ring) {
      sprite.removeChild(ring);
      ring.destroy();
    }
  }
  
  /**
   * Apply hover visual effect to token
   */
  private applyHoverVisual(sprite: PIXI.Sprite): void {
    // Create hover effect if it doesn't exist
    if (!sprite.children.find(child => child.name === 'hover-effect')) {
      const hoverEffect = new PIXI.Graphics();
      hoverEffect.name = 'hover-effect';
      
      // Draw hover effect
      hoverEffect.lineStyle(2, 0xffff00, 0.6);
      hoverEffect.drawCircle(0, 0, sprite.width / 2 + 3);
      
      // Add to sprite
      sprite.addChild(hoverEffect);
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
   * Apply visual effects based on token state
   */
  private applyTokenEffects(sprite: PIXI.Sprite, token: IToken): void {
    // TODO: Apply visual effects for conditions, HP, etc.
    
    // Invisible or hidden tokens
    if (token.isVisible === false) {
      sprite.alpha = 0.5;
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
} 