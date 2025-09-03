/**
 * Map Editor Type Definitions
 * Types for the map editor and UVTT format integration
 */

/**
 * Editor object types
 */
export type EditorObjectType = 'wall' | 'portal' | 'light' | 'decoration';

/**
 * Available tool modes
 */
export type EditorToolType = 'select' | 'wall' | 'portal' | 'light' | 'pan';

/**
 * Point in 2D space
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Size dimensions
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Base interface for all editor objects
 */
export interface EditorObject {
  id: string;
  objectType: EditorObjectType;
  visible?: boolean;
  locked?: boolean;
  selected?: boolean;
}

/**
 * Grid configuration for world coordinate system
 */
export interface GridConfig {
  visible: boolean;
  worldUnitsPerCell: number;  // World units per grid cell (replaces pixels_per_grid)
  color: string;
  snap: boolean;
  opacity: number;
}

/**
 * Map metadata using world coordinate system
 */
export interface MapMetadata {
  id?: string;
  name: string;
  description?: string;
  
  // World coordinate system (replaces UVTT resolution)
  coordinates: {
    worldUnitsPerGridCell: number;  // World units per grid cell
    offset: Point;                  // Grid alignment offset in world units
    dimensions: {                   // Grid dimensions in cells
      width: number;
      height: number;
    };
    imageDimensions: {             // Source image dimensions in pixels
      width: number;
      height: number;
    };
  };
  
  // Environment settings
  environment?: {
    ambientLight: {
      color: string;
      intensity: number;
    };
    globalIllumination: boolean;
  };
  
  // Image reference
  image: string;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  
  // Legacy UVTT support (for backward compatibility)
  uvtt?: {
    format: number;
    resolution: {
      map_origin: Point;
      map_size: { x: number; y: number };
      pixels_per_grid: number;
    };
  };
}

/**
 * Wall object
 */
export interface WallObject extends EditorObject {
  objectType: 'wall';
  points: number[]; // Flat array of [x1, y1, x2, y2, ...] for compatibility with Konva
  stroke?: string;
  strokeWidth?: number;
}

/**
 * Portal/Door object
 */
export interface PortalObject extends EditorObject {
  objectType: 'portal';
  position: Point;
  rotation: number;
  bounds: Point[]; // Array of points defining the portal shape
  closed: boolean;
  freestanding: boolean;
  doorType?: string; // Optional, for different door styles
}

/**
 * Light source object using enhanced lighting schema
 */
export interface LightObject extends EditorObject {
  objectType: 'light';
  position: Point;
  type: 'point' | 'directional' | 'area' | 'ambient';
  brightRadius: number;
  dimRadius: number;
  intensity: number;
  color: string; // Hex color like '#ffffff'
  temperature?: number; // Color temperature in Kelvin
  shadows: boolean;
  shadowQuality: 'low' | 'medium' | 'high';
  falloffType: 'linear' | 'quadratic' | 'exponential';
  animation: {
    type: 'none' | 'flicker' | 'pulse' | 'strobe' | 'wave';
    speed: number;
    intensity: number;
  };
  enabled: boolean;
  controllable: boolean;
  name?: string;
  description?: string;
}

/**
 * Any editor object union type
 */
export type AnyEditorObject = WallObject | PortalObject | LightObject;

/**
 * Complete editor state
 */
export interface EditorState {
  currentTool: EditorToolType;
  walls: WallObject[];
  portals: PortalObject[];
  lights: LightObject[];
  selectedObjectIds: string[];
  gridConfig: GridConfig;
  mapMetadata: MapMetadata;
  isDrawing: boolean;
  isModified: boolean;
  viewportTransform: {
    scale: number;
    position: Point;
  };
}

/**
 * History command interface for undo/redo
 */
export interface EditorCommand {
  execute(): void;
  undo(): void;
  description: string;
}

/**
 * Universal VTT format structure
 */
export interface UVTTData {
  format: number;
  resolution: {
    map_origin: {
      x: number;
      y: number;
    };
    map_size: {
      x: number;
      y: number;
    };
    pixels_per_grid: number;
  };
  line_of_sight: Point[];
  objects_line_of_sight?: Point[];
  portals: UVTTPortal[];
  environment: {
    baked_lighting: boolean;
    ambient_light: string;
  };
  lights: UVTTLight[];
  image: string;
}

/**
 * UVTT Portal definition
 */
export interface UVTTPortal {
  position: Point;
  bounds: Point[];
  rotation: number;
  closed: boolean;
  freestanding: boolean;
}

/**
 * UVTT Light definition
 */
export interface UVTTLight {
  position: Point;
  range: number;
  intensity: number;
  /**
   * Color as 8-character hex string: RRGGBBAA (6 for RGB, 2 for alpha channel, no #)
   * Example: 'ff575112' (RGB: ff5751, Alpha: 12)
   */
  color: string;
  shadows: boolean;
}

/**
 * Wall tool state
 */
export interface WallToolState {
  currentPoints: number[];
  isDrawing: boolean;
  multiPointMode: boolean;
}

/**
 * Selection tool state
 */
export interface SelectionToolState {
  selectionRect?: {
    start: Point;
    end: Point;
  };
  isSelecting: boolean;
  dragStartPosition?: Point;
}

/**
 * Editor event types
 */
export type EditorEventType =
  | 'object:added'
  | 'object:modified'
  | 'object:removed'
  | 'selection:changed'
  | 'tool:changed'
  | 'grid:changed'
  | 'viewport:changed'
  | 'history:changed';

/**
 * Base editor event
 */
export interface EditorEvent {
  type: EditorEventType;
  timestamp: number;
}

/**
 * Object event with payload
 */
export interface ObjectEvent extends EditorEvent {
  type: 'object:added' | 'object:modified' | 'object:removed';
  objectIds: string[];
  objectType: EditorObjectType;
}

/**
 * Selection changed event
 */
export interface SelectionEvent extends EditorEvent {
  type: 'selection:changed';
  selectedIds: string[];
}

/**
 * Tool changed event
 */
export interface ToolEvent extends EditorEvent {
  type: 'tool:changed';
  tool: EditorToolType;
}
