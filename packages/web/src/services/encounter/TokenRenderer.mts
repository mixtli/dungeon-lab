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
}

// Token position for Pixi (2D only)
interface TokenPosition {
  x: number;
  y: number;
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
  
  // Performance settings
  private maxPoolSize = 50;
  private cullDistance = 1000; // Pixels outside viewport to cull
  
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
  }
  
  /**
   * Acquire a sprite from the pool or create a new one
   */
  private acquireSprite(): TokenSprite {
    let sprite = this.tokenPool.pop() as TokenSprite;
    
    if (!sprite) {
      sprite = new PIXI.Sprite() as TokenSprite;
      sprite.interactive = true;
      sprite.cursor = 'pointer';
      this.setupSpriteEvents(sprite);
    }
    
    // Reset sprite properties
    sprite.alpha = 1;
    sprite.visible = true;
    sprite.rotation = 0;
    sprite.scale.set(1, 1);
    sprite.tint = 0xFFFFFF;
    
    return sprite;
  }
  
  /**
   * Return a sprite to the pool
   */
  private releaseSprite(sprite: TokenSprite): void {
    // Clean up sprite
    sprite.removeAllListeners();
    sprite.interactive = false;
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
   * Apply visual effects based on token state
   */
  private applyTokenEffects(sprite: TokenSprite, token: IToken): void {
    // Reset effects
    sprite.tint = 0xFFFFFF;
    sprite.alpha = 1;
    
    // Apply conditions/effects
    if (token.conditions && token.conditions.length > 0) {
      // Example: Apply red tint for bloodied condition
      if (token.conditions.some(c => c.name === 'bloodied')) {
        sprite.tint = 0xFF6666;
      }
      
      // Example: Reduce alpha for unconscious
      if (token.conditions.some(c => c.name === 'unconscious')) {
        sprite.alpha = 0.5;
      }
    }
    
    // Apply selection highlight if selected (custom property)
    const spriteWithSelection = sprite as TokenSprite & { selected?: boolean };
    if (spriteWithSelection.selected) {
      sprite.tint = 0x66FF66; // Green tint for selection
    }
  }
  
  /**
   * Set up event handlers for sprite interaction
   */
  private setupSpriteEvents(sprite: TokenSprite): void {
    // Mouse/touch events will be handled by the parent component
    // This is just the setup for interactivity
    sprite.on('pointerdown', this.onTokenPointerDown.bind(this));
    sprite.on('pointerup', this.onTokenPointerUp.bind(this));
    sprite.on('pointermove', this.onTokenPointerMove.bind(this));
    sprite.on('pointerover', this.onTokenPointerOver.bind(this));
    sprite.on('pointerout', this.onTokenPointerOut.bind(this));
  }
  
  /**
   * Handle token pointer down (start of drag or selection)
   */
  private onTokenPointerDown(event: PIXI.FederatedPointerEvent): void {
    const sprite = event.currentTarget as TokenSprite;
    const tokenId = sprite.tokenId;
    
    // Emit custom event for parent component to handle
    sprite.emit('token:pointerdown', { tokenId, event });
  }
  
  /**
   * Handle token pointer up (end of drag or click)
   */
  private onTokenPointerUp(event: PIXI.FederatedPointerEvent): void {
    const sprite = event.currentTarget as TokenSprite;
    const tokenId = sprite.tokenId;
    
    sprite.emit('token:pointerup', { tokenId, event });
  }
  
  /**
   * Handle token pointer move (during drag)
   */
  private onTokenPointerMove(event: PIXI.FederatedPointerEvent): void {
    const sprite = event.currentTarget as TokenSprite;
    const tokenId = sprite.tokenId;
    
    sprite.emit('token:pointermove', { tokenId, event });
  }
  
  /**
   * Handle token hover start
   */
  private onTokenPointerOver(event: PIXI.FederatedPointerEvent): void {
    const sprite = event.currentTarget as TokenSprite;
    const tokenId = sprite.tokenId;
    
    // Add hover effect
    sprite.scale.set(1.1, 1.1);
    
    sprite.emit('token:pointerover', { tokenId, event });
  }
  
  /**
   * Handle token hover end
   */
  private onTokenPointerOut(event: PIXI.FederatedPointerEvent): void {
    const sprite = event.currentTarget as TokenSprite;
    const tokenId = sprite.tokenId;
    
    // Remove hover effect
    sprite.scale.set(1, 1);
    
    sprite.emit('token:pointerout', { tokenId, event });
  }
  
  /**
   * Animate token movement
   */
  private animateTokenMovement(sprite: PIXI.Sprite, targetPosition: TokenPosition): void {
    // Simple linear interpolation animation
    const startX = sprite.x;
    const startY = sprite.y;
    const deltaX = targetPosition.x - startX;
    const deltaY = targetPosition.y - startY;
    
    const duration = 300; // milliseconds
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out animation
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      sprite.x = startX + deltaX * easeProgress;
      sprite.y = startY + deltaY * easeProgress;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  /**
   * Get or load texture for token
   */
  private async getTokenTexture(token: IToken): Promise<PIXI.Texture> {
    // Check cache first
    if (this.textureCache.has(token.imageUrl)) {
      return this.textureCache.get(token.imageUrl)!;
    }
    
    try {
      // Load texture
      const texture = await PIXI.Texture.fromURL(token.imageUrl);
      
      // Cache texture
      this.textureCache.set(token.imageUrl, texture);
      
      return texture;
    } catch (error) {
      console.error(`Failed to load texture for token ${token.id}:`, error);
      
      // Return default texture (could be a placeholder)
      return PIXI.Texture.WHITE;
    }
  }
  
  /**
   * Perform viewport culling for performance
   */
  cullTokens(viewportBounds: PIXI.Rectangle): void {
    this.activeTokens.forEach((tokenData) => {
      const sprite = tokenData.sprite;
      const bounds = sprite.getBounds();
      
      // Check if token is within culling distance of viewport
      const distance = this.getDistanceToViewport(bounds, viewportBounds);
      sprite.visible = distance <= this.cullDistance;
    });
  }
  
  /**
   * Calculate distance from sprite bounds to viewport
   */
  private getDistanceToViewport(spriteBounds: PIXI.Rectangle, viewportBounds: PIXI.Rectangle): number {
    const dx = Math.max(0, Math.max(viewportBounds.x - spriteBounds.right, spriteBounds.x - viewportBounds.right));
    const dy = Math.max(0, Math.max(viewportBounds.y - spriteBounds.bottom, spriteBounds.y - viewportBounds.bottom));
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearAllTokens();
    
    // Clear texture cache
    this.textureCache.forEach(texture => texture.destroy());
    this.textureCache.clear();
    
    // Destroy pooled sprites
    this.tokenPool.forEach(sprite => sprite.destroy());
    this.tokenPool = [];
  }
} 