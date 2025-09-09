import * as PIXI from 'pixi.js';
import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';
import type { WallObject, ObjectEditorObject, DoorObject, LightObject } from '@dungeon-lab/shared/types/index.mjs';
import { initDevtools } from '@pixi/devtools';
import { transformAssetUrl } from '@/utils/asset-utils.mjs';

export type Platform = 'desktop' | 'tablet' | 'phone';

export interface EncounterMapConfig {
  platform: Platform;
  width: number;
  height: number;
  backgroundColor?: number;
}

export interface PixiRenderConfig {
  antialias: boolean;
  resolution: number;
  powerPreference?: GPUPowerPreference;
  backgroundColor: number;
}

// Define types for coordinate points
interface Point {
  x: number;
  y: number;
}

/**
 * High-performance Pixi.js-based map renderer for encounters
 * Optimized for real-time token interaction and smooth animations
 */
export class EncounterMapRenderer {
  private app: PIXI.Application;
  private mapContainer!: PIXI.Container;
  private backgroundSprite: PIXI.Sprite | null = null;
  private wallGraphics: PIXI.Graphics[] = [];
  private objectGraphics: PIXI.Graphics[] = [];
  private doorGraphics: PIXI.Graphics[] = [];
  private lightGraphics: PIXI.Graphics[] = [];
  private gridGraphics: PIXI.Graphics[] = [];
  
  // Platform-specific configuration
  private renderConfig: PixiRenderConfig;
  
  // Map data
  private currentMapData: IMapResponse | null = null;
  private isLoaded = false;
  private isInitialized = false;
  
  constructor(config: EncounterMapConfig) {
    this.renderConfig = this.getPlatformRenderConfig(config.platform);
    
    // Initialize Pixi.js application - will be initialized async
    this.app = new PIXI.Application();
    
    // Don't initialize here - let the caller handle async initialization
    // This prevents double initialization in usePixiMap
  }
  
  /**
   * Initialize the Pixi application asynchronously
   * Only call this once per instance to avoid "Cannot redefine property" errors
   */
  public async initializeApp(canvas: HTMLCanvasElement, config: EncounterMapConfig): Promise<void> {
    // Check if already initialized to prevent double initialization
    if (this.isInitialized) {
      console.warn('PixiMapRenderer already initialized, skipping re-initialization');
      return;
    }
    await this.app.init({
      canvas: canvas,
      width: config.width,
      height: config.height,
      ...this.renderConfig
    });

    initDevtools({ app: this.app });
    
    this.setupContainers();
    this.setupEventHandlers();
    
    // Mark as initialized to prevent double initialization
    this.isInitialized = true;
  }
  
  /**
   * Set up the container hierarchy for organized rendering
   */
  private setupContainers(): void {
    // Map container holds the background and static elements
    this.mapContainer = new PIXI.Container();
    this.mapContainer.label = 'mapContainer';
    this.app.stage.addChild(this.mapContainer);
    // Removed tokenContainer creation - tokens go directly in mapContainer
  }
  
  /**
   * Set up basic event handlers
   */
  private setupEventHandlers(): void {
    // Handle application resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  /**
   * Load map from database Map model (with mapData field and image asset)
   */
  async loadMapFromDatabase(mapData: IMapResponse): Promise<void> {
    try {
      this.currentMapData = mapData;
      
      // Clear existing map elements
      this.clearMap();
      
      // Load background image from asset
      if (mapData.image?.url) {
        await this.loadBackground(mapData.image.url);
      }
      
      // Render map elements from new mapData format
      if (mapData.mapData) {
        const internalMapData = mapData.mapData;
        
        // Render walls (blue)
        if (internalMapData.walls && internalMapData.walls.length > 0) {
          console.log(`[PixiMapRenderer] Loading ${internalMapData.walls.length} walls`);
          internalMapData.walls.forEach(wall => {
            this.renderWall(wall, 0x0000FF);
          });
        }
        
        // Render objects (red)
        if (internalMapData.objects && internalMapData.objects.length > 0) {
          console.log(`[PixiMapRenderer] Loading ${internalMapData.objects.length} objects`);
          internalMapData.objects.forEach(object => {
            this.renderObject(object, 0xFF0000);
          });
        }
        
        // Render doors (green)
        if (internalMapData.doors && internalMapData.doors.length > 0) {
          console.log(`[PixiMapRenderer] Loading ${internalMapData.doors.length} doors`);
          internalMapData.doors.forEach(door => {
            this.renderDoor(door, 0x00FF00);
          });
        }
        
        // Render lights
        if (internalMapData.lights && internalMapData.lights.length > 0) {
          console.log(`[PixiMapRenderer] Loading ${internalMapData.lights.length} lights`);
          internalMapData.lights.forEach(light => {
            this.renderLight(light);
          });
        }

        // Render grid
        this.renderGrid();
      }
      
      this.isLoaded = true;
      
    } catch (error) {
      console.error('Failed to load map from database:', error);
      throw error;
    }
  }
  
  /**
   * Load and display the background image
   */
  private async loadBackground(imageUrl: string): Promise<void> {
    try {
      // Transform localhost URLs for LAN access
      const transformedUrl = transformAssetUrl(imageUrl);
      console.log('[PixiMapRenderer] Loading background image:', transformedUrl);
      
      // Create texture from transformed URL with timeout and fallback
      const texture = await this.loadTextureWithTimeout(transformedUrl);
      
      // Create sprite and add to map container
      this.backgroundSprite = new PIXI.Sprite(texture);
      this.backgroundSprite.label = 'background';
      this.mapContainer.addChild(this.backgroundSprite);
      
      console.log('[PixiMapRenderer] Background image loaded successfully');
      
    } catch (error) {
      console.error('Failed to load background image:', error);
      throw error;
    }
  }

  /**
   * Load texture using HTMLImageElement (direct approach)
   */
  private async loadTextureWithTimeout(imageUrl: string, timeoutMs: number = 10000): Promise<PIXI.Texture> {
    // Use HTMLImageElement directly instead of PIXI.Assets.load for reliability
    return this.loadTextureFromHTMLImage(imageUrl, timeoutMs);
  }

  /**
   * Load texture using HTMLImageElement
   */
  private async loadTextureFromHTMLImage(imageUrl: string, timeoutMs: number = 10000): Promise<PIXI.Texture> {
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
      
      console.log('[PixiMapRenderer] Loading background image with HTMLImageElement:', imageUrl);
      img.src = imageUrl;
    });
  }
  

  
  /**
   * Render a single wall from new mapData format
   * Note: WallObject in mapEditor uses points array, but mapData schema uses start/end
   * This method handles both formats for compatibility
   */
  private renderWall(wall: any, color: number): void {
    const wallGraphic = new PIXI.Graphics();
    wallGraphic.label = `wall-${wall.id}`;
    wallGraphic.visible = false; // Hide walls by default
    
    // Handle different wall formats
    if (wall.start && wall.end) {
      // Schema format (from mapData)
      wallGraphic.moveTo(wall.start.x, wall.start.y);
      wallGraphic.lineTo(wall.end.x, wall.end.y);
      
      wallGraphic.stroke({
        width: wall.thickness || 4,
        color: color,
        alpha: 1.0
      });
    } else if (wall.points && wall.points.length >= 4) {
      // Editor format (from mapEditor components)
      const points = wall.points;
      wallGraphic.moveTo(points[0], points[1]);
      
      for (let i = 2; i < points.length; i += 2) {
        wallGraphic.lineTo(points[i], points[i + 1]);
      }
      
      wallGraphic.stroke({
        width: wall.strokeWidth || 4,
        color: color,
        alpha: 1.0
      });
    }
    
    this.mapContainer.addChild(wallGraphic);
    this.wallGraphics.push(wallGraphic);
  }
  
  /**
   * Render a single object from new mapData format
   * Handles both schema format (bounds polygon) and editor format (points array)
   */
  private renderObject(object: any, color: number): void {
    const objectGraphic = new PIXI.Graphics();
    objectGraphic.label = `object-${object.id}`;
    objectGraphic.visible = false; // Hide objects by default
    
    // Handle different object formats
    if (object.bounds && object.bounds.length > 0) {
      // Schema format (from mapData) - bounds is array of {x,y} points
      const startPoint = object.bounds[0];
      objectGraphic.moveTo(startPoint.x, startPoint.y);
      
      object.bounds.slice(1).forEach((point: Point) => {
        objectGraphic.lineTo(point.x, point.y);
      });
      
      objectGraphic.closePath();
      objectGraphic.stroke({
        width: 2,
        color: color,
        alpha: 1.0
      });
    } else if (object.points && object.points.length >= 6) {
      // Editor format (from mapEditor components) - points is flat array [x1,y1,x2,y2,...]
      const points = object.points;
      objectGraphic.moveTo(object.position.x + points[0], object.position.y + points[1]);
      
      for (let i = 2; i < points.length; i += 2) {
        objectGraphic.lineTo(object.position.x + points[i], object.position.y + points[i + 1]);
      }
      
      objectGraphic.closePath();
      objectGraphic.stroke({
        width: 2,
        color: color,
        alpha: 1.0
      });
    }
    
    this.mapContainer.addChild(objectGraphic);
    this.objectGraphics.push(objectGraphic);
  }
  
  /**
   * Render a single door from new mapData format
   */
  private renderDoor(door: DoorObject, color: number): void {
    const doorGraphic = new PIXI.Graphics();
    doorGraphic.label = `door-${door.id}`;
    doorGraphic.visible = false; // Hide doors by default
    
    // Door coords are [x1, y1, x2, y2] in world units
    const [x1, y1, x2, y2] = door.coords;
    
    // Draw door line
    doorGraphic.moveTo(x1, y1);
    doorGraphic.lineTo(x2, y2);
    
    // Apply stroke style - use different style if door is open vs closed
    const strokeWidth = door.state === 'open' ? 2 : 4;
    const alpha = door.state === 'open' ? 0.5 : 1.0;
    
    doorGraphic.stroke({
      width: strokeWidth,
      color: color,
      alpha: alpha
    });
    
    this.mapContainer.addChild(doorGraphic);
    this.doorGraphics.push(doorGraphic);
  }
  
  /**
   * Render a single light from new mapData format
   */
  private renderLight(light: LightObject): void {
    try {
      const lightGraphic = new PIXI.Graphics();
      lightGraphic.label = `light-${light.id}`;
      lightGraphic.visible = false; // Hide lights by default
      
      // Light position is already in world coordinates
      const worldPos = light.position;
      
      // Use the larger of brightRadius or dimRadius for rendering
      const lightRange = Math.max(light.brightRadius || 0, light.dimRadius || 0);
      
      // Parse color safely with fallback
      let color;
      let alpha;
      try {
        if (typeof light.color === 'string') {
          if (light.color.startsWith('#')) {
            color = parseInt(light.color.replace('#', ''), 16);
            alpha = (light.intensity ?? 1) * 0.3;
            // Clamp to minimum alpha for visibility
            const MIN_ALPHA = 0.2;
            alpha = Math.max(alpha, MIN_ALPHA);
          } else if (/^[0-9a-fA-F]{6}$/.test(light.color)) {
            color = parseInt(light.color, 16);
            alpha = (light.intensity ?? 1) * 0.3;
            const MIN_ALPHA = 0.2;
            alpha = Math.max(alpha, MIN_ALPHA);
          } else {
            console.warn(`[PixiMapRenderer] Invalid light color format for light ${light.id}, using default`);
            color = 0xFFFFFF;
            alpha = (light.intensity ?? 1) * 0.3;
            const MIN_ALPHA = 0.2;
            alpha = Math.max(alpha, MIN_ALPHA);
          }
        } else {
          color = 0xFFFFFF;
          alpha = (light.intensity ?? 1) * 0.3;
          const MIN_ALPHA = 0.2;
          alpha = Math.max(alpha, MIN_ALPHA);
        }
      } catch (colorError) {
        console.warn(`Error parsing light color for light ${light.id}, using default:`, colorError);
        color = 0xFFFFFF;
        alpha = (light.intensity ?? 1) * 0.3;
        const MIN_ALPHA = 0.2;
        alpha = Math.max(alpha, MIN_ALPHA);
      }
      
      // Draw light as a circle with gradient effect
      lightGraphic.circle(worldPos.x, worldPos.y, lightRange)
        .fill({ color: color, alpha: alpha });
      
      // Add a bright center (use higher alpha, but clamp to 1)
      const centerAlpha = Math.min(alpha * 2.5, 1);
      lightGraphic.circle(worldPos.x, worldPos.y, lightRange * 0.1)
        .fill({ color: color, alpha: centerAlpha });
      
      this.mapContainer.addChild(lightGraphic);
      this.lightGraphics.push(lightGraphic);
    } catch (error) {
      console.error(`Failed to render light ${light.id}:`, error);
      // Continue to next light instead of breaking the entire map
    }
  }

  /**
   * Render grid based on map coordinates
   */
  private renderGrid(): void {
    if (!this.currentMapData?.mapData?.coordinates) {
      console.warn('[PixiMapRenderer] No coordinates found for grid rendering');
      return;
    }

    const coordinates = this.currentMapData.mapData.coordinates;
    const gridSize = coordinates.worldUnitsPerGridCell;
    const offset = coordinates.offset;
    const dimensions = coordinates.dimensions;

    // Calculate grid bounds in world coordinates
    const startX = offset.x;
    const startY = offset.y;
    const endX = offset.x + (dimensions.width * gridSize);
    const endY = offset.y + (dimensions.height * gridSize);

    const gridGraphic = new PIXI.Graphics();
    gridGraphic.label = 'grid-lines';
    gridGraphic.visible = false; // Initially hidden

    // Draw vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      gridGraphic.moveTo(x, startY);
      gridGraphic.lineTo(x, endY);
    }

    // Draw horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      gridGraphic.moveTo(startX, y);
      gridGraphic.lineTo(endX, y);
    }

    // Apply black stroke
    gridGraphic.stroke({ width: 1, color: 0x000000, alpha: 0.5 });

    this.mapContainer.addChild(gridGraphic);
    this.gridGraphics.push(gridGraphic);
  }
  
  /**
   * Convert world coordinates to grid coordinates
   */
  public worldToGrid(worldPos: Point): Point {
    if (!this.currentMapData?.mapData?.coordinates) {
      throw new Error('No map data loaded');
    }
    
    const coordinates = this.currentMapData.mapData.coordinates;
    const gridSize = coordinates.worldUnitsPerGridCell;
    
    return {
      x: Math.floor(worldPos.x / gridSize),
      y: Math.floor(worldPos.y / gridSize)
    };
  }
  
  /**
   * Convert grid coordinates to world coordinates
   */
  public gridToWorld(gridPos: Point): Point {
    if (!this.currentMapData?.mapData?.coordinates) {
      throw new Error('No map data loaded');
    }
    
    const coordinates = this.currentMapData.mapData.coordinates;
    const gridSize = coordinates.worldUnitsPerGridCell;
    
    return {
      x: gridPos.x * gridSize,
      y: gridPos.y * gridSize
    };
  }
  
  /**
   * Get platform-specific render configuration
   */
  private getPlatformRenderConfig(platform: Platform): PixiRenderConfig {
    const configs: Record<Platform, PixiRenderConfig> = {
      desktop: {
        antialias: true,
        resolution: window.devicePixelRatio,
        powerPreference: 'high-performance',
        backgroundColor: 0x1a1a1a
      },
      tablet: {
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        powerPreference: undefined, // 'default' is not a valid GPUPowerPreference value
        backgroundColor: 0x1a1a1a
      },
      phone: {
        antialias: false,
        resolution: 1,
        powerPreference: 'low-power',
        backgroundColor: 0x1a1a1a
      }
    };
    
    return configs[platform];
  }
  
  /**
   * Clear all map elements
   */
  private clearMap(): void {
    // Remove background
    if (this.backgroundSprite) {
      this.mapContainer.removeChild(this.backgroundSprite);
      this.backgroundSprite.destroy();
      this.backgroundSprite = null;
    }
    // Remove all wall, object, door, and light graphics
    for (const g of this.wallGraphics) this.mapContainer.removeChild(g);
    for (const g of this.objectGraphics) this.mapContainer.removeChild(g);
    for (const g of this.doorGraphics) this.mapContainer.removeChild(g);
    for (const g of this.lightGraphics) this.mapContainer.removeChild(g);
    for (const g of this.gridGraphics) this.mapContainer.removeChild(g);
    this.wallGraphics = [];
    this.objectGraphics = [];
    this.doorGraphics = [];
    this.lightGraphics = [];
    this.gridGraphics = [];
    // Tokens are managed by TokenRenderer, which uses mapContainer
  }
  
  /**
   * Handle window resize
   */
  private handleResize(): void {
    // This will be implemented when we add viewport management
    // For now, just log that resize was detected
    console.log('Window resize detected - viewport management will handle this');
  }
  
  /**
   * Get the Pixi.js application instance
   */
  public getApp(): PIXI.Application {
    return this.app;
  }
  
  /**
   * Get the token container for external token management
   * Returns mapContainer so tokens pan/zoom with the map
   */
  public getTokenContainer(): PIXI.Container {
    // For compatibility, always return mapContainer
    return this.mapContainer;
  }
  
  /**
   * Get the map container
   */
  public getMapContainer(): PIXI.Container {
    return this.mapContainer;
  }
  
  /**
   * Check if map is loaded
   */
  public isMapLoaded(): boolean {
    return this.isLoaded;
  }
  
  /**
   * Get current map data
   */
  public getCurrentMapData(): IMapResponse | null {
    return this.currentMapData;
  }
  
  /**
   * Resize the renderer
   */
  public resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
  }
  
  /**
   * Set visibility of wall highlights
   */
  public setWallHighlights(visible: boolean): void {
    console.log('[PixiMapRenderer] setWallHighlights called with:', visible, 'wallGraphics count:', this.wallGraphics.length);
    this.wallGraphics.forEach(graphic => {
      graphic.visible = visible;
    });
  }
  
  /**
   * Set visibility of object highlights
   */
  public setObjectHighlights(visible: boolean): void {
    console.log('[PixiMapRenderer] setObjectHighlights called with:', visible, 'objectGraphics count:', this.objectGraphics.length);
    this.objectGraphics.forEach((graphic) => {
     // console.log(`[PixiMapRenderer] Object graphic ${index}:`, {
      //   visible: graphic.visible,
      //   width: graphic.width,
      //   height: graphic.height,
      //   x: graphic.x,
      //   y: graphic.y,
      //   alpha: graphic.alpha,
      //   parent: graphic.parent?.label || 'no parent'
      // });
      graphic.visible = visible;
      //console.log(`[PixiMapRenderer] Object graphic ${index} after setting visible:`, graphic.visible);
    });
  }
  
  /**
   * Set visibility of door highlights
   */
  public setDoorHighlights(visible: boolean): void {
    console.log('[PixiMapRenderer] setDoorHighlights called with:', visible, 'doorGraphics count:', this.doorGraphics.length);
    this.doorGraphics.forEach(graphic => {
      graphic.visible = visible;
    });
  }
  
  /**
   * Set visibility of light highlights
   */
  public setLightHighlights(visible: boolean): void {
    console.log('[PixiMapRenderer] setLightHighlights called with:', visible, 'lightGraphics count:', this.lightGraphics.length);
    this.lightGraphics.forEach(graphic => {
      graphic.visible = visible;
    });
  }

  /**
   * Set visibility of grid highlights
   */
  public setGridHighlights(visible: boolean): void {
    console.log('[PixiMapRenderer] setGridHighlights called with:', visible, 'gridGraphics count:', this.gridGraphics.length);
    this.gridGraphics.forEach(graphic => {
      graphic.visible = visible;
    });
  }
  
  /**
   * Update wall rendering styles and colors
   */
  public updateWallStyles(wallColor: number = 0x0000FF, objectColor: number = 0xFF0000): void {
    if (!this.currentMapData?.mapData) return;
    
    const internalMapData = this.currentMapData.mapData;
    
    // Clear existing wall graphics
    this.wallGraphics.forEach(graphic => graphic.destroy());
    this.wallGraphics = [];
    
    // Clear existing object graphics
    this.objectGraphics.forEach(graphic => graphic.destroy());
    this.objectGraphics = [];
    
    // Re-render walls
    if (internalMapData.walls) {
      internalMapData.walls.forEach(wall => {
        this.renderWall(wall, wallColor);
      });
    }
    
    // Re-render objects
    if (internalMapData.objects) {
      internalMapData.objects.forEach(object => {
        this.renderObject(object, objectColor);
      });
    }
  }
  
  
  /**
   * Destroy the renderer and clean up resources
   */
  public destroy(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.clearMap();
    this.app.destroy(true, { children: true, texture: true });
  }
} 