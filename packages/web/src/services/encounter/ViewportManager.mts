import * as PIXI from 'pixi.js';

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
  bounds: ViewportBounds;
}

/**
 * Manages viewport controls for the encounter map
 * Handles pan, zoom, and bounds management
 */
export class ViewportManager {
  private app: PIXI.Application;
  private stage: PIXI.Container;
  private mapContainer: PIXI.Container;
  
  // Viewport state
  private currentScale = 1;
  private minScale = 0.1;
  private maxScale = 5;
  private panSpeed = 1;
  private zoomSpeed = 0.1;
  
  // Interaction state
  private isDragging = false;
  private lastPointerPosition: { x: number; y: number } | null = null;
  
  // Bounds constraints
  private mapBounds: ViewportBounds | null = null;
  private constrainToBounds = true;
  
  // Bound event handlers for proper cleanup
  private boundWheelHandler: (event: Event) => void;
  
  constructor(app: PIXI.Application, mapContainer: PIXI.Container) {
    this.app = app;
    this.stage = app.stage;
    this.mapContainer = mapContainer;
    
    // Bind wheel handler
    this.boundWheelHandler = this.onWheel.bind(this);
    
    this.setupEventHandlers();
  }
  
  /**
   * Set up event handlers for viewport interaction
   */
  private setupEventHandlers(): void {
    // Make stage interactive
    this.stage.interactive = true;
    this.stage.hitArea = new PIXI.Rectangle(0, 0, this.app.screen.width, this.app.screen.height);
    
    // Mouse/touch events for panning
    this.stage.on('pointerdown', this.onPointerDown.bind(this));
    this.stage.on('pointermove', this.onPointerMove.bind(this));
    this.stage.on('pointerup', this.onPointerUp.bind(this));
    this.stage.on('pointerupoutside', this.onPointerUp.bind(this));
    
    // Wheel event for zooming
    const canvas = this.app.view as HTMLCanvasElement;
    if (canvas && canvas.addEventListener) {
      canvas.addEventListener('wheel', this.boundWheelHandler, { passive: false });
    }
    
    // Handle app resize
    this.app.renderer.on('resize', this.onResize.bind(this));
  }
  
  /**
   * Handle pointer down (start panning)
   */
  private onPointerDown(event: PIXI.FederatedPointerEvent): void {
    // Only start panning if not clicking on a token
    const target = event.target;
    if (target && target !== this.stage) {
      return; // Clicked on a token or other interactive element
    }
    
    this.isDragging = true;
    this.lastPointerPosition = {
      x: event.global.x,
      y: event.global.y
    };
    
    // Change cursor to indicate dragging
    const canvas = this.app.view as HTMLCanvasElement;
    if (canvas && canvas.style) {
      canvas.style.cursor = 'grabbing';
    }
  }
  
  /**
   * Handle pointer move (panning)
   */
  private onPointerMove(event: PIXI.FederatedPointerEvent): void {
    if (!this.isDragging || !this.lastPointerPosition) return;
    
    const currentPosition = {
      x: event.global.x,
      y: event.global.y
    };
    
    // Calculate delta
    const deltaX = (currentPosition.x - this.lastPointerPosition.x) * this.panSpeed;
    const deltaY = (currentPosition.y - this.lastPointerPosition.y) * this.panSpeed;
    
    // Apply pan
    this.pan(deltaX, deltaY);
    
    // Update last position
    this.lastPointerPosition = currentPosition;
  }
  
  /**
   * Handle pointer up (stop panning)
   */
  private onPointerUp(): void {
    this.isDragging = false;
    this.lastPointerPosition = null;
    
    // Reset cursor
    const canvas = this.app.view as HTMLCanvasElement;
    if (canvas && canvas.style) {
      canvas.style.cursor = 'default';
    }
  }
  
  /**
   * Handle wheel event (zooming)
   */
  private onWheel(event: Event): void {
    const wheelEvent = event as WheelEvent;
    wheelEvent.preventDefault();
    
    // Get mouse position relative to canvas
    const canvas = this.app.view as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const mouseX = wheelEvent.clientX - rect.left;
    const mouseY = wheelEvent.clientY - rect.top;
    
    // Calculate zoom delta
    const zoomDelta = wheelEvent.deltaY > 0 ? -this.zoomSpeed : this.zoomSpeed;
    
    // Apply zoom at mouse position
    this.zoomAt(mouseX, mouseY, zoomDelta);
  }
  
  /**
   * Handle app resize
   */
  private onResize(): void {
    // Update hit area
    this.stage.hitArea = new PIXI.Rectangle(0, 0, this.app.screen.width, this.app.screen.height);
    
    // Constrain viewport if needed
    if (this.constrainToBounds && this.mapBounds) {
      this.constrainViewport();
    }
  }
  
  /**
   * Pan the viewport by delta amounts
   */
  pan(deltaX: number, deltaY: number): void {
    this.mapContainer.x += deltaX;
    this.mapContainer.y += deltaY;
    
    // Constrain to bounds if enabled
    if (this.constrainToBounds && this.mapBounds) {
      this.constrainViewport();
    }
    
    this.emitViewportChange();
  }
  
  /**
   * Set absolute pan position
   */
  setPan(x: number, y: number): void {
    this.mapContainer.x = x;
    this.mapContainer.y = y;
    
    if (this.constrainToBounds && this.mapBounds) {
      this.constrainViewport();
    }
    
    this.emitViewportChange();
  }
  
  /**
   * Zoom by a delta amount
   */
  zoom(delta: number): void {
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.currentScale + delta));
    this.setZoom(newScale);
  }
  
  /**
   * Zoom at a specific point
   */
  zoomAt(x: number, y: number, delta: number): void {
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.currentScale + delta));
    
    if (newScale === this.currentScale) return;
    
    // Calculate world position before zoom
    const worldPos = this.screenToWorld(x, y);
    
    // Apply zoom
    this.setZoom(newScale);
    
    // Calculate new screen position
    const newScreenPos = this.worldToScreen(worldPos.x, worldPos.y);
    
    // Adjust pan to keep the zoom point in the same place
    const deltaX = x - newScreenPos.x;
    const deltaY = y - newScreenPos.y;
    
    this.pan(deltaX, deltaY);
  }
  
  /**
   * Set absolute zoom level
   */
  setZoom(scale: number): void {
    this.currentScale = Math.max(this.minScale, Math.min(this.maxScale, scale));
    this.mapContainer.scale.set(this.currentScale);
    
    if (this.constrainToBounds && this.mapBounds) {
      this.constrainViewport();
    }
    
    this.emitViewportChange();
  }
  
  /**
   * Fit the map to the viewport
   */
  fitToScreen(): void {
    if (!this.mapBounds) return;
    
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    
    const scaleX = screenWidth / this.mapBounds.width;
    const scaleY = screenHeight / this.mapBounds.height;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to add some padding
    
    this.setZoom(scale);
    this.centerOnBounds();
  }
  
  /**
   * Center the viewport on the map bounds
   */
  centerOnBounds(): void {
    if (!this.mapBounds) return;
    
    const screenCenterX = this.app.screen.width / 2;
    const screenCenterY = this.app.screen.height / 2;
    
    const mapCenterX = (this.mapBounds.x + this.mapBounds.width / 2) * this.currentScale;
    const mapCenterY = (this.mapBounds.y + this.mapBounds.height / 2) * this.currentScale;
    
    this.setPan(screenCenterX - mapCenterX, screenCenterY - mapCenterY);
  }
  
  /**
   * Center the viewport on a specific world position
   */
  centerOn(worldX: number, worldY: number): void {
    const screenCenterX = this.app.screen.width / 2;
    const screenCenterY = this.app.screen.height / 2;
    
    const scaledX = worldX * this.currentScale;
    const scaledY = worldY * this.currentScale;
    
    this.setPan(screenCenterX - scaledX, screenCenterY - scaledY);
  }
  
  /**
   * Set map bounds for constraint calculations
   */
  setMapBounds(bounds: ViewportBounds): void {
    this.mapBounds = bounds;
    
    if (this.constrainToBounds) {
      this.constrainViewport();
    }
  }
  
  /**
   * Enable or disable bounds constraints
   */
  setConstrainToBounds(constrain: boolean): void {
    this.constrainToBounds = constrain;
    
    if (constrain && this.mapBounds) {
      this.constrainViewport();
    }
  }
  
  /**
   * Set zoom limits
   */
  setZoomLimits(min: number, max: number): void {
    this.minScale = min;
    this.maxScale = max;
    
    // Constrain current zoom if needed
    if (this.currentScale < min || this.currentScale > max) {
      this.setZoom(Math.max(min, Math.min(max, this.currentScale)));
    }
  }
  
  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.mapContainer.x) / this.currentScale,
      y: (screenY - this.mapContainer.y) / this.currentScale
    };
  }
  
  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.currentScale + this.mapContainer.x,
      y: worldY * this.currentScale + this.mapContainer.y
    };
  }
  
  /**
   * Get current viewport state
   */
  getViewportState(): ViewportState {
    const worldBounds = this.getWorldBounds();
    
    return {
      x: this.mapContainer.x,
      y: this.mapContainer.y,
      scale: this.currentScale,
      bounds: worldBounds
    };
  }
  
  /**
   * Get the world bounds currently visible on screen
   */
  getWorldBounds(): ViewportBounds {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.app.screen.width, this.app.screen.height);
    
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    };
  }
  
  /**
   * Constrain viewport to map bounds
   */
  private constrainViewport(): void {
    if (!this.mapBounds) return;
    
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    const scaledMapWidth = this.mapBounds.width * this.currentScale;
    const scaledMapHeight = this.mapBounds.height * this.currentScale;
    
    // Calculate constraints
    let minX = screenWidth - scaledMapWidth;
    let maxX = 0;
    let minY = screenHeight - scaledMapHeight;
    let maxY = 0;
    
    // If map is smaller than screen, center it
    if (scaledMapWidth < screenWidth) {
      minX = maxX = (screenWidth - scaledMapWidth) / 2;
    }
    
    if (scaledMapHeight < screenHeight) {
      minY = maxY = (screenHeight - scaledMapHeight) / 2;
    }
    
    // Apply constraints
    this.mapContainer.x = Math.max(minX, Math.min(maxX, this.mapContainer.x));
    this.mapContainer.y = Math.max(minY, Math.min(maxY, this.mapContainer.y));
  }
  
  /**
   * Emit viewport change event
   */
  private emitViewportChange(): void {
    const state = this.getViewportState();
    this.app.stage.emit('viewport:changed', state);
  }
  
  /**
   * Clean up event handlers
   */
  destroy(): void {
    this.stage.removeAllListeners();
    const canvas = this.app.view as HTMLCanvasElement;
    if (canvas && canvas.removeEventListener) {
      canvas.removeEventListener('wheel', this.boundWheelHandler);
    }
    this.app.renderer.off('resize', this.onResize.bind(this));
  }
} 