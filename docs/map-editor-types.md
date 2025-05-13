# Map Editor Type Definitions

This document outlines the TypeScript interfaces and types that will be used throughout the map editor implementation. These types will be defined in `packages/shared/src/types/mapEditor.ts`.

## Core Types

```typescript
/**
 * Editor object types
 */
export type EditorObjectType = 'wall' | 'portal' | 'light' | 'decoration';

/**
 * Available tool modes
 */
export type EditorToolType = 'select' | 'wall' | 'portal' | 'light' | 'pan' | 'zoom';

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
 * Grid configuration
 */
export interface GridConfig {
  visible: boolean;
  size: number;
  color: string;
  snap: boolean;
  opacity: number;
}

/**
 * Map metadata
 */
export interface MapMetadata {
  id?: string;
  name: string;
  description?: string;
  format: number;
  resolution: {
    map_origin: Point;
    map_size: {
      x: number;
      y: number;
    };
    pixels_per_grid: number;
  };
  environment?: {
    baked_lighting: boolean;
    ambient_light: string;
  };
  image: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}
```

## Object Types

```typescript
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
 * Light source object
 */
export interface LightObject extends EditorObject {
  objectType: 'light';
  position: Point;
  range: number;
  intensity: number;
  color: string;
  shadows: boolean;
  name?: string;
}

/**
 * Any editor object union type
 */
export type AnyEditorObject = WallObject | PortalObject | LightObject;
```

## Editor State

```typescript
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
```

## UVTT Format Types

```typescript
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
  color: string;
  shadows: boolean;
}
```

## Tool-Specific Types

```typescript
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
```

## Event Types

```typescript
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
```

## Usage Examples

### Creating Wall Objects

```typescript
const wall: WallObject = {
  id: `wall-${Date.now()}`,
  objectType: 'wall',
  points: [10, 10, 50, 10, 50, 50, 10, 50],
  stroke: '#ff3333',
  strokeWidth: 3,
  visible: true
};
```

### Creating Light Objects

```typescript
const light: LightObject = {
  id: `light-${Date.now()}`,
  objectType: 'light',
  position: { x: 100, y: 100 },
  range: 120,
  intensity: 0.8,
  color: '#ffdd00',
  shadows: true
};
```

### Using the Editor State

```typescript
const { walls, addWall, updateWall, selectObject } = useEditorState();

// Add a new wall
addWall({
  id: `wall-${Date.now()}`,
  objectType: 'wall',
  points: [10, 10, 50, 10, 50, 50, 10, 50]
});

// Update an existing wall
updateWall('wall-1', {
  points: [20, 20, 60, 20, 60, 60, 20, 60]
});

// Select an object
selectObject('wall-1');
```

## Next Steps

After reviewing these type definitions:

1. Create the shared types file in `packages/shared/src/types/mapEditor.ts`
2. Implement the core state management composable using these types
3. Begin building components that leverage the type system

These types may evolve during development as we refine our understanding of the requirements.
