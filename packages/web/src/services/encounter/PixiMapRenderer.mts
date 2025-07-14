import * as PIXI from 'pixi.js';
import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';
import { initDevtools } from '@pixi/devtools';
import { getAssetUrl } from '@/utils/getAssetUrl.mjs';

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

// Define types for UVTT data structure
interface Point {
  x: number;
  y: number;
}

interface Resolution {
  map_origin?: { x: number; y?: number };
  map_size?: { x: number; y: number };
  pixels_per_grid?: number;
}

interface Portal {
  position: Point;
  bounds: Point[];
  rotation: number;
  closed: boolean;
  freestanding: boolean;
}

interface Light {
  position: Point;
  range: number;
  intensity: number;
  color: string;
  shadows: boolean;
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
  private portalGraphics: PIXI.Graphics[] = [];
  private lightGraphics: PIXI.Graphics[] = [];
  
  // Platform-specific configuration
  private renderConfig: PixiRenderConfig;
  
  // Map data
  private currentMapData: IMapResponse | null = null;
  private isLoaded = false;
  private isInitialized = false;
  
  constructor(canvas: HTMLCanvasElement, config: EncounterMapConfig) {
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
   * Load map from database Map model (with uvtt field and image asset)
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
      
      // Render UVTT elements if present
      if (mapData.uvtt) {
        const uvtt = mapData.uvtt;
        
        // Render walls from line_of_sight data (blue) and objects_line_of_sight (black)
        if (uvtt.resolution) {
          // Render line_of_sight walls in blue
          if (uvtt.line_of_sight) {
            uvtt.line_of_sight.forEach(wall => {
              this.renderWallSegment(wall, uvtt.resolution!, 0x0000FF, 'walls');
            });
          }
          
          // Render objects_line_of_sight walls in red
          if (uvtt.objects_line_of_sight) {
            uvtt.objects_line_of_sight.forEach(wall => {
              this.renderWallSegment(wall, uvtt.resolution!, 0xFF0000, 'objects');
            });
          }
        }
        
        // Render portals
        if (uvtt.portals && uvtt.resolution) {
          this.renderPortals(uvtt.portals, uvtt.resolution);
        }
        
        // Render lights
        if (uvtt.lights && uvtt.resolution) {
          this.renderLights(uvtt.lights, uvtt.resolution);
        }
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
      const transformedUrl = getAssetUrl(imageUrl);
      console.log('[PixiMapRenderer] Loading background image:', transformedUrl);
      
      // Create texture from transformed URL
      const texture = await PIXI.Assets.load(transformedUrl);
      
      // Create sprite and add to map container
      this.backgroundSprite = new PIXI.Sprite(texture);
      this.backgroundSprite.label = 'background';
      this.mapContainer.addChild(this.backgroundSprite);
      
    } catch (error) {
      console.error('Failed to load background image:', error);
      throw error;
    }
  }
  

  
  /**
   * Render portals from UVTT data
   */
  private renderPortals(portals: Portal[], resolution: Resolution): void {
    if (!resolution.pixels_per_grid) return;
    
    portals.forEach((portal, index) => {
      const portalGraphic = new PIXI.Graphics();
      portalGraphic.label = `portal-${index}`;
      
      // Set portal style (bright green for highlighting)
      const color = 0x00FF00; // Bright green
      portalGraphic.stroke({
        width: 4,
        color: color,
        alpha: 1.0
      });
      
      // Draw portal bounds
      if (portal.bounds && portal.bounds.length > 0) {
        const startPoint = this.gridToPixel(portal.bounds[0], resolution);
        portalGraphic.moveTo(startPoint.x, startPoint.y);
        
        portal.bounds.slice(1).forEach(point => {
          const pixelPoint = this.gridToPixel(point, resolution);
          portalGraphic.lineTo(pixelPoint.x, pixelPoint.y);
        });
      }
      
      this.mapContainer.addChild(portalGraphic);
      this.portalGraphics.push(portalGraphic);
    });
  }
  
  /**
   * Render lights from UVTT data
   */
  private renderLights(lights: Light[], resolution: Resolution): void {
    if (!resolution.pixels_per_grid) return;
    
    lights.forEach((light, index) => {
      try {
        const lightGraphic = new PIXI.Graphics();
        lightGraphic.label = `light-${index}`;
        lightGraphic.visible = false; // Hide lights by default
        
        // Convert light position to pixels
        const pixelPos = this.gridToPixel(light.position, resolution);
        const pixelRange = light.range * (resolution.pixels_per_grid || 50);
        
        // Parse color safely with fallback
        let color;
        let alpha;
        try {
          if (typeof light.color === 'string') {
            // Handle 8-character hex (RRGGBBAA)
            if (/^[0-9a-fA-F]{8}$/.test(light.color)) {
              color = parseInt(light.color.slice(0, 6), 16);
              alpha = parseInt(light.color.slice(6, 8), 16) / 255;
              // Clamp to minimum alpha for visibility
              const MIN_ALPHA = 0.2;
              alpha = Math.max(alpha, MIN_ALPHA);
              // Optionally combine with light.intensity
              alpha = alpha * (light.intensity ?? 1);
              console.log(`[PixiMapRenderer] Light ${index}: 8-char hex`, { original: light.color, color, alpha });
            } else if (light.color.startsWith('#')) {
              color = parseInt(light.color.replace('#', ''), 16);
              alpha = (light.intensity ?? 1) * 0.3;
              // Clamp to minimum alpha for visibility
              const MIN_ALPHA = 0.2;
              alpha = Math.max(alpha, MIN_ALPHA);
              console.log(`[PixiMapRenderer] Light ${index}: #RRGGBB`, { original: light.color, color, alpha });
            } else if (/^[0-9a-fA-F]{6}$/.test(light.color)) {
              color = parseInt(light.color, 16);
              alpha = (light.intensity ?? 1) * 0.3;
              // Clamp to minimum alpha for visibility
              const MIN_ALPHA = 0.2;
              alpha = Math.max(alpha, MIN_ALPHA);
              console.log(`[PixiMapRenderer] Light ${index}: 6-char hex`, { original: light.color, color, alpha });
            } else {
              console.warn(`[PixiMapRenderer] Invalid light color format for light ${index}, using default`, { original: light.color });
              color = 0xFFFFFF;
              alpha = (light.intensity ?? 1) * 0.3;
              // Clamp to minimum alpha for visibility
              const MIN_ALPHA = 0.2;
              alpha = Math.max(alpha, MIN_ALPHA);
            }
          } else if (typeof light.color === 'number') {
            // Convert number to hex string first to ensure valid format
            const hexColor = (light.color as number).toString(16).padStart(6, '0');
            color = parseInt(hexColor, 16);
            alpha = (light.intensity ?? 1) * 0.3;
            // Clamp to minimum alpha for visibility
            const MIN_ALPHA = 0.2;
            alpha = Math.max(alpha, MIN_ALPHA);
            console.log(`[PixiMapRenderer] Light ${index}: numeric color`, { original: light.color, color, alpha });
          } else {
            console.warn(`[PixiMapRenderer] Invalid light color format for light ${index}, using default`, { original: light.color });
            color = 0xFFFFFF;
            alpha = (light.intensity ?? 1) * 0.3;
            // Clamp to minimum alpha for visibility
            const MIN_ALPHA = 0.2;
            alpha = Math.max(alpha, MIN_ALPHA);
          }
        } catch (colorError) {
          console.warn(`Error parsing light color for light ${index}, using default:`, colorError);
          color = 0xFFFFFF;
          alpha = (light.intensity ?? 1) * 0.3;
          // Clamp to minimum alpha for visibility
          const MIN_ALPHA = 0.2;
          alpha = Math.max(alpha, MIN_ALPHA);
        }
        
        // Draw light as a circle with gradient effect
        lightGraphic.circle(pixelPos.x, pixelPos.y, pixelRange)
          .fill({ color: color, alpha: alpha });
        
        // Add a bright center (use higher alpha, but clamp to 1)
        const centerAlpha = Math.min(alpha * 2.5, 1);
        lightGraphic.circle(pixelPos.x, pixelPos.y, pixelRange * 0.1)
          .fill({ color: color, alpha: centerAlpha });
        
        this.mapContainer.addChild(lightGraphic);
        this.lightGraphics.push(lightGraphic);
      } catch (error) {
        console.error(`Failed to render light ${index}:`, error);
        // Continue to next light instead of breaking the entire map
      }
    });
  }
  
  /**
   * Convert grid coordinates to pixel coordinates
   */
  private gridToPixel(gridPos: Point, resolution: Resolution): Point {
    const mapOrigin = resolution.map_origin || { x: 0, y: 0 };
    const pixelsPerGrid = resolution.pixels_per_grid || 50;
    
    return {
      x: (gridPos.x - mapOrigin.x) * pixelsPerGrid,
      y: (gridPos.y - (mapOrigin.y || 0)) * pixelsPerGrid
    };
  }
  
  /**
   * Convert pixel coordinates to grid coordinates
   */
  public pixelToGrid(pixelPos: Point): Point {
    if (!this.currentMapData?.uvtt?.resolution) {
      throw new Error('No map data loaded');
    }
    
    const resolution = this.currentMapData.uvtt.resolution;
    const mapOrigin = resolution.map_origin || { x: 0, y: 0 };
    const pixelsPerGrid = resolution.pixels_per_grid || 50;
    
    return {
      x: Math.round(pixelPos.x / pixelsPerGrid + mapOrigin.x),
      y: Math.round(pixelPos.y / pixelsPerGrid + (mapOrigin.y || 0))
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
    // Remove all wall, object, portal, and light graphics
    for (const g of this.wallGraphics) this.mapContainer.removeChild(g);
    for (const g of this.objectGraphics) this.mapContainer.removeChild(g);
    for (const g of this.portalGraphics) this.mapContainer.removeChild(g);
    for (const g of this.lightGraphics) this.mapContainer.removeChild(g);
    this.wallGraphics = [];
    this.objectGraphics = [];
    this.portalGraphics = [];
    this.lightGraphics = [];
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
    this.wallGraphics.forEach(graphic => {
      graphic.visible = visible;
    });
  }
  
  /**
   * Set visibility of object highlights
   */
  public setObjectHighlights(visible: boolean): void {
    this.objectGraphics.forEach(graphic => {
      graphic.visible = visible;
    });
  }
  
  /**
   * Set visibility of portal highlights
   */
  public setPortalHighlights(visible: boolean): void {
    this.portalGraphics.forEach(graphic => {
      graphic.visible = visible;
    });
  }
  
  /**
   * Set visibility of light highlights
   */
  public setLightHighlights(visible: boolean): void {
    this.lightGraphics.forEach(graphic => {
      graphic.visible = visible;
    });
  }
  
  /**
   * Update wall rendering styles and colors
   */
  public updateWallStyles(lineOfSightColor: number = 0x0000FF, objectsLineOfSightColor: number = 0xFF0000): void {
    if (!this.currentMapData?.uvtt?.resolution) return;
    
    const resolution = this.currentMapData.uvtt.resolution;
    
    // Clear existing wall graphics
    this.wallGraphics.forEach(graphic => graphic.destroy());
    this.wallGraphics = [];
    
    // Clear existing object graphics
    this.objectGraphics.forEach(graphic => graphic.destroy());
    this.objectGraphics = [];
    
    // Re-render line_of_sight walls in blue
    if (this.currentMapData.uvtt.line_of_sight) {
      this.currentMapData.uvtt.line_of_sight.forEach(wall => {
        this.renderWallSegment(wall, resolution, lineOfSightColor, 'walls');
      });
    }
    
    // Re-render objects_line_of_sight walls in red
    if (this.currentMapData.uvtt.objects_line_of_sight) {
      this.currentMapData.uvtt.objects_line_of_sight.forEach(wall => {
        this.renderWallSegment(wall, resolution, objectsLineOfSightColor, 'objects');
      });
    }
  }
  
  /**
   * Render a single wall segment with specified color
   */
  private renderWallSegment(walls: Point[], resolution: Resolution, color: number, type: 'walls' | 'objects' = 'walls'): void {
    if (walls.length < 2 || !resolution.pixels_per_grid) return;
    
    // Create graphics object for walls
    const wallGraphic = new PIXI.Graphics();
    wallGraphic.label = type;
    
    // Set wall style with specified color
    wallGraphic.stroke({
      width: 4,
      color: color,
      alpha: 1.0
    });
    
    // Draw wall segments
    for (let i = 0; i < walls.length - 1; i++) {
      const startPoint = this.gridToPixel(walls[i], resolution);
      const endPoint = this.gridToPixel(walls[i + 1], resolution);
      
      wallGraphic.moveTo(startPoint.x, startPoint.y);
      wallGraphic.lineTo(endPoint.x, endPoint.y);
    }
    
    this.mapContainer.addChild(wallGraphic);
    
    // Store in appropriate array based on type
    if (type === 'walls') {
      this.wallGraphics.push(wallGraphic);
    } else {
      this.objectGraphics.push(wallGraphic);
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