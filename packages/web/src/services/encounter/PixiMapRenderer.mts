import * as PIXI from 'pixi.js';
import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';

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
  powerPreference: 'default' | 'high-performance' | 'low-power';
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
  private tokenContainer!: PIXI.Container;
  private backgroundSprite: PIXI.Sprite | null = null;
  private wallGraphics: PIXI.Graphics[] = [];
  private portalGraphics: PIXI.Graphics[] = [];
  private lightGraphics: PIXI.Graphics[] = [];
  
  // Platform-specific configuration
  private renderConfig: PixiRenderConfig;
  
  // Map data
  private currentMapData: IMapResponse | null = null;
  private isLoaded = false;
  
  constructor(canvas: HTMLCanvasElement, config: EncounterMapConfig) {
    this.renderConfig = this.getPlatformRenderConfig(config.platform);
    
    // Initialize Pixi.js application
    this.app = new PIXI.Application({
      view: canvas,
      width: config.width,
      height: config.height,
      ...this.renderConfig
    });
    
    this.setupContainers();
    this.setupEventHandlers();
  }
  
  /**
   * Set up the container hierarchy for organized rendering
   */
  private setupContainers(): void {
    // Map container holds the background and static elements
    this.mapContainer = new PIXI.Container();
    this.mapContainer.name = 'mapContainer';
    this.app.stage.addChild(this.mapContainer);
    
    // Token container holds all dynamic tokens (rendered on top)
    this.tokenContainer = new PIXI.Container();
    this.tokenContainer.name = 'tokenContainer';
    this.app.stage.addChild(this.tokenContainer);
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
        
        // Render walls from line_of_sight data
        if (uvtt.line_of_sight && uvtt.resolution) {
          uvtt.line_of_sight.forEach(wall => {
            this.renderWalls(wall, uvtt.resolution!);
          });
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
      // Create texture from URL
      const texture = await PIXI.Texture.fromURL(imageUrl);
      
      // Create sprite and add to map container
      this.backgroundSprite = new PIXI.Sprite(texture);
      this.backgroundSprite.name = 'background';
      this.mapContainer.addChild(this.backgroundSprite);
      
    } catch (error) {
      console.error('Failed to load background image:', error);
      throw error;
    }
  }
  
  /**
   * Render walls from UVTT line_of_sight data
   */
  private renderWalls(walls: Point[], resolution: Resolution): void {
    if (walls.length < 2 || !resolution.pixels_per_grid) return;
    
    // Create graphics object for walls
    const wallGraphic = new PIXI.Graphics();
    wallGraphic.name = 'walls';
    
    // Set wall style
    wallGraphic.lineStyle({
      width: 2,
      color: 0x000000,
      alpha: 0.8
    });
    
    // Draw wall segments
    for (let i = 0; i < walls.length - 1; i++) {
      const startPoint = this.gridToPixel(walls[i], resolution);
      const endPoint = this.gridToPixel(walls[i + 1], resolution);
      
      wallGraphic.moveTo(startPoint.x, startPoint.y);
      wallGraphic.lineTo(endPoint.x, endPoint.y);
    }
    
    this.mapContainer.addChild(wallGraphic);
    this.wallGraphics.push(wallGraphic);
  }
  
  /**
   * Render portals from UVTT data
   */
  private renderPortals(portals: Portal[], resolution: Resolution): void {
    if (!resolution.pixels_per_grid) return;
    
    portals.forEach((portal, index) => {
      const portalGraphic = new PIXI.Graphics();
      portalGraphic.name = `portal-${index}`;
      
      // Set portal style (different color for open/closed)
      const color = portal.closed ? 0x8B4513 : 0x4169E1; // Brown for closed, blue for open
      portalGraphic.lineStyle({
        width: 3,
        color: color,
        alpha: 0.8
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
        lightGraphic.name = `light-${index}`;
        
        // Convert light position to pixels
        const pixelPos = this.gridToPixel(light.position, resolution);
        const pixelRange = light.range * (resolution.pixels_per_grid || 50);
        
        // Parse color safely with fallback
        let color;
        try {
          // Try to parse as hex string first
          if (typeof light.color === 'string' && light.color.startsWith('#')) {
            color = parseInt(light.color.replace('#', ''), 16);
          } 
          // Try to parse as number if it's not a string
          else if (typeof light.color === 'number') {
            // Convert number to hex string first to ensure valid format
            const hexColor = (light.color as number).toString(16).padStart(6, '0');
            color = parseInt(hexColor, 16);
          }
          // If all else fails, use a default color
          else {
            console.warn(`Invalid light color format for light ${index}, using default`);
            color = 0xFFFFFF; // Default to white
          }
        } catch (colorError) {
          console.warn(`Error parsing light color for light ${index}, using default:`, colorError);
          color = 0xFFFFFF; // Default to white
        }
        
        // Draw light as a circle with gradient effect
        lightGraphic.beginFill(color, light.intensity * 0.3);
        lightGraphic.drawCircle(pixelPos.x, pixelPos.y, pixelRange);
        lightGraphic.endFill();
        
        // Add a bright center
        lightGraphic.beginFill(color, light.intensity * 0.8);
        lightGraphic.drawCircle(pixelPos.x, pixelPos.y, pixelRange * 0.1);
        lightGraphic.endFill();
        
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
        powerPreference: 'default',
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
      this.backgroundSprite.destroy();
      this.backgroundSprite = null;
    }
    
    // Clear walls
    this.wallGraphics.forEach(graphic => graphic.destroy());
    this.wallGraphics = [];
    
    // Clear portals
    this.portalGraphics.forEach(graphic => graphic.destroy());
    this.portalGraphics = [];
    
    // Clear lights
    this.lightGraphics.forEach(graphic => graphic.destroy());
    this.lightGraphics = [];
    
    // Clear containers
    this.mapContainer.removeChildren();
    this.tokenContainer.removeChildren();
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
   */
  public getTokenContainer(): PIXI.Container {
    return this.tokenContainer;
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
   * Destroy the renderer and clean up resources
   */
  public destroy(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.clearMap();
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }
} 