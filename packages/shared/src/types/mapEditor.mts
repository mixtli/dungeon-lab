/**
 * Map Editor Type Definitions
 * Types for the map editor using new mapData schema format
 */

/**
 * Editor object types - aligned with new mapData schema
 */
export type EditorObjectType = 'wall' | 'door' | 'light' | 'object' | 'terrain' | 'region';

/**
 * Available tool modes - aligned with new object types
 */
export type EditorToolType = 'select' | 'wall' | 'door' | 'light' | 'object' | 'terrain' | 'region' | 'pan' | 'grid-adjust';

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
 * Map metadata using world coordinate system - aligned with mapData schema
 */
export interface MapMetadata {
  id?: string;
  name: string;
  description?: string;
  
  // World coordinate system (matches worldCoordinateSystemSchema)
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
    display: {                      // Grid display options
      visible: boolean;
      color: string;
      opacity: number;
      lineWidth: number;
    };
  };
  
  // Environment settings (matches enhancedEnvironmentSchema)
  environment: {
    ambientLight: {
      color: string;
      intensity: number;
      temperature?: number;
    };
    globalIllumination: boolean;
    darkvisionRange: number;
    weather: {
      type: 'none' | 'rain' | 'snow' | 'fog' | 'storm' | 'sandstorm';
      intensity: number;
      windDirection: number;
      windSpeed: number;
      temperature?: number;
      visibility: number;
    };
    atmosphere: {
      fogColor: string;
      fogDensity: number;
      skyColor?: string;
      horizonColor?: string;
    };
    audio: {
      ambientTrack?: string;
      reverbLevel: number;
      soundOcclusion: boolean;
    };
  };
  
  // Image reference
  image: string;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  user_id?: string;
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
 * Door object using simplified line segment geometry (matches doorSchema)
 */
export interface DoorObject extends EditorObject {
  objectType: 'door';
  coords: number[]; // [x1, y1, x2, y2] line segment coordinates
  state: 'open' | 'closed' | 'locked' | 'stuck'; // Door state
  material: 'wood' | 'stone' | 'metal' | 'magic' | 'glass' | 'force'; // Door material
  stroke: string; // Door color
  strokeWidth: number; // Door line width
  requiresKey: boolean; // Whether door requires a key to open
  openSound?: string; // Sound effect when opening
  closeSound?: string; // Sound effect when closing
  name?: string; // Door name
  description?: string; // Door description
  tags: string[]; // For AI and automation
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
 * Map object using simplified editor format (matches mapObjectSchema)
 */
export interface ObjectEditorObject extends EditorObject {
  objectType: 'object';
  position: Point;
  rotation: number;
  points: number[]; // Flat array of [x1, y1, x2, y2, ...] relative to position for compatibility with Konva
  shapeType: 'circle' | 'rectangle' | 'polygon';
  type: 'furniture' | 'container' | 'decoration' | 'mechanism' | 'trap' | 'treasure' | 'altar' | 'pillar' | 'door' | 'other';
  height: number;
  blocksMovement: boolean;
  blocksLight: boolean;
  blocksSound: boolean;
  interactable: boolean;
  searchable: boolean;
  moveable: boolean;
  sprite?: string;
  color: string;
  opacity: number;
  name?: string;
  description?: string;
  tags: string[];
}

/**
 * Terrain region object (matches terrainSchema)
 */
export interface TerrainObject extends EditorObject {
  objectType: 'terrain';
  points: number[]; // Polygon boundary points as flat array
  type: 'normal' | 'difficult' | 'hazardous' | 'impassable' | 'water' | 'swamp' | 'ice' | 'sand' | 'lava' | 'pit' | 'stairs' | 'ramp' | 'teleporter';
  elevation: number;
  movementCost: number;
  minimumSpeed: number;
  damagePerRound: number;
  damageType?: 'fire' | 'cold' | 'acid' | 'poison' | 'necrotic' | 'radiant';
  color?: string;
  opacity: number;
  texture?: string;
  teleportDestination?: Point;
  elevationChange: number;
  name?: string;
  description?: string;
  tags: string[];
}

/**
 * Special region object (matches regionSchema)
 */
export interface RegionObject extends EditorObject {
  objectType: 'region';
  points: number[]; // Polygon boundary points as flat array
  type: 'teleport' | 'trap' | 'aura' | 'sanctuary' | 'antimagic' | 'silence' | 'darkness' | 'weather' | 'script' | 'spawn';
  elevationRange?: {
    min: number;
    max: number;
  };
  triggerOn: 'enter' | 'exit' | 'presence' | 'interaction';
  affectedTypes: ('player' | 'npc' | 'monster' | 'object' | 'all')[];
  teleportDestination?: Point;
  teleportMapId?: string;
  effectData?: Record<string, any>;
  visible: boolean;
  color: string;
  opacity: number;
  name?: string;
  description?: string;
  tags: string[];
}

/**
 * Any editor object union type - updated for new schema
 */
export type AnyEditorObject = WallObject | DoorObject | LightObject | ObjectEditorObject | TerrainObject | RegionObject;

/**
 * Complete editor state - updated for new schema
 */
export interface EditorState {
  currentTool: EditorToolType;
  walls: WallObject[];
  doors: DoorObject[];
  lights: LightObject[];
  objects: ObjectEditorObject[];
  terrain: TerrainObject[];
  regions: RegionObject[];
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

// UVTT types removed - they now only exist in uvtt-import-export.schema.mts for import/export operations

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
