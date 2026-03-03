# Dynamic Lighting and Fog of War System

**Status:** Proposal
**Author:** AI Assistant
**Date:** 2025-01-04
**Priority:** High
**Related Systems:** Map Rendering, Token Management, Encounter Settings

## Executive Summary

This proposal outlines a comprehensive dynamic lighting and fog of war system for Dungeon Lab that provides VTT-standard visibility features:

- **Line of Sight** - Players only see areas within their token's vision range
- **Dynamic Lighting** - Light sources (torches, spells, ambient lights) illuminate the map
- **Vision Types** - Support for normal vision, darkvision, blindsight
- **Fog of War** - Unexplored areas remain hidden; explored areas persist
- **Global Illumination** - Optional setting to disable lighting and reveal entire map

The system uses **visibility polygon algorithms** combined with **Pixi.js rendering** to provide performant, real-time lighting calculations. Vision properties are stored on tokens (character-specific abilities), while global settings are stored on encounters (scene-wide rules).

## Current System Analysis

### Existing Map Architecture

**Map Data Structure** ([packages/shared/src/schemas/map.schema.mts](../../packages/shared/src/schemas/map.schema.mts))

The map schema already includes comprehensive lighting infrastructure:

```typescript
{
  mapData: {
    // Geometry that blocks light/vision
    walls: [{
      blocksLight: boolean,
      blocksMovement: boolean,
      transparency: number,  // 0 = opaque, 1 = transparent
      oneWayVision: boolean
    }],

    objects: [{
      blocksLight: boolean,
      height: number
    }],

    // Light sources placed on map
    lights: [{
      position: { x, y, z },
      type: 'point' | 'directional' | 'area' | 'ambient',
      brightRadius: number,
      dimRadius: number,
      color: string,
      intensity: number,
      shadows: boolean,
      animation: { type, speed, intensity }
    }],

    // Global environment settings
    environment: {
      globalIllumination: boolean,  // ✓ Already exists!
      ambientLight: { color, intensity },
      darkvisionRange: number
    }
  }
}
```

**Encounter Settings** ([packages/shared/src/schemas/encounters.schema.mts](../../packages/shared/src/schemas/encounters.schema.mts))

```typescript
{
  settings: {
    enableFogOfWar: boolean,       // ✓ Already exists!
    enableDynamicLighting: boolean // ✓ Already exists!
  }
}
```

**Current Rendering** ([packages/web/src/services/encounter/PixiMapRenderer.mts](../../packages/web/src/services/encounter/PixiMapRenderer.mts))

- Pixi.js-based 2D renderer
- Renders walls, objects, doors, lights as debug overlays (colored lines/polygons)
- No actual lighting calculations or visibility masking
- Token rendering via separate TokenRenderer service

### Gap Analysis

**What's Missing:**

1. **Vision Properties on Tokens** - No way to define token vision ranges, darkvision, etc.
2. **Light Emission from Tokens** - Carried torches/lanterns not implemented
3. **Visibility Calculation** - No algorithm to compute line of sight polygons
4. **Visibility Rendering** - No masking layer to hide unseen areas
5. **Explored Areas** - No fog of war memory/persistence
6. **Light Rendering** - Lights are only debug visualizations, not actual illumination
7. **Performance Optimization** - No caching for expensive visibility calculations

### Gap Solutions Summary

**How Each Gap Will Be Addressed:**

1. **Vision Properties** ✅
   - Add comprehensive `vision` object to token schema
   - Support: range, darkvision, blindsight, vision modes
   - Include flags for special vision (see through walls, see invisible)
   - Default values ensure backward compatibility

2. **Light Emission from Tokens** ✅
   - Add `lightSource` object to token schema
   - Support: bright/dim radius, color, intensity, animations
   - Include offset positioning and directional light support
   - Integrates with map lights for unified lighting system

3. **Visibility Calculation** ✅
   - Implement Red Blob Games visibility polygon algorithm (O(n log n))
   - Use `polygon-clipping` npm library for polygon operations
   - Spatial grid indexing (100px cells) for wall culling
   - Support for one-way vision and transparent walls

4. **Visibility Rendering** ✅
   - Pixi.js Graphics-based masking system
   - Separate containers for vision mask and fog of war
   - Support for multiple controlled tokens (merge vision polygons)
   - Layer-based rendering (map → lighting → tokens → vision)

5. **Explored Areas (Fog of War)** ✅
   - Store explored polygons per player in encounter state
   - Automatic polygon simplification (Douglas-Peucker algorithm)
   - Real-time sync to server (immediate updates)
   - Periodic merging to prevent unbounded growth

6. **Light Rendering** ✅
   - Lighting overlay system with additive blending
   - Support for colored lights with proper color mixing
   - Animated lights (flicker, pulse, torch effects)
   - Bright/dim light distinction with opacity gradients

7. **Performance Optimization** ✅
   - Multi-level caching (static lights, token vision, walls)
   - Level of Detail (LOD) system for mobile devices
   - Vision update throttling (60fps on desktop, 30fps on mobile)
   - Spatial partitioning reduces wall checks by ~90%

## Proposed Architecture

### 1. Data Model Changes

#### Token Vision Properties (NEW)

Add to token schema:

```typescript
// packages/shared/src/schemas/tokens.schema.mts
token: {
  // ... existing properties

  vision: {
    enabled: boolean,         // Can this token see? (false for inanimate objects, blinded conditions)
    range: number,            // Vision radius in world units (0 = blind, Infinity = unlimited)
    darkvision: number,       // Darkvision radius in world units (0 = none)
    blindsight: number,       // Blindsight radius in world units (0 = none)
    mode: 'normal' | 'darkvision' | 'blindsight' | 'tremorsense',

    // Vision through barriers
    seeThroughWalls: boolean,  // For ethereal/ghost tokens
    seeInvisible: boolean,     // For true seeing effects
    minimumLight: number,      // Minimum light level needed to see (0-1, 0 = can see in darkness)

    // Vision sharing (for party vision and familiar/scrying spells)
    shareVision: boolean,      // Shares vision with party/group
    visionGroupId: string,     // Which group to share with (if custom mode)
  },

  // Light source carried by token (torch, lantern, spell)
  lightSource: {
    enabled: boolean,
    brightRadius: number,    // Bright light radius in world units
    dimRadius: number,       // Dim light radius in world units (total, not additional)
    color: string,           // Hex color (#ffffff = white light)
    intensity: number,       // Brightness multiplier (0-1, default 1.0)
    animation: 'none' | 'flicker' | 'pulse' | 'strobe' | 'torch',
    animationSpeed: number,  // Animation cycles per second (default 1.0)

    // Advanced positioning
    offset: { x: number, y: number },  // Offset from token center (held torch vs helmet lamp)
    angle: number,           // Direction for directional lights (0-360 degrees)
    emissionAngle: number,   // Cone angle for directional lights (0-360, 360 = omnidirectional)
  }
}
```

**Defaults:**
- Standard humanoid: `vision.range = 60` (world units), `darkvision = 0`
- Elf/dwarf: `darkvision = 60`
- Human with torch: `lightSource.brightRadius = 20`, `dimRadius = 40`

#### Encounter Vision State (MODIFICATIONS)

```typescript
// packages/shared/src/schemas/encounters.schema.mts
settings: {
  // ... existing
  enableFogOfWar: boolean,           // ✓ Already exists
  enableDynamicLighting: boolean,    // ✓ Already exists

  // NEW: Additional settings
  fogOfWarPersistence: 'session' | 'permanent',  // Does fog persist or reset?
  visionMode: 'individual' | 'shared-party' | 'custom',  // Vision sharing mode
  dimLightOpacity: number,                       // How dark is dim light? (0.3-0.7)

  // Custom vision sharing groups (when visionMode = 'custom')
  visionSharing: [{
    id: string,              // Unique group ID
    name: string,            // "Party", "Familiar Group", "Scrying Circle", etc.
    tokenIds: string[],      // Tokens that share vision in this group
  }]
}

// NEW: Fog of war exploration data
exploredAreas: {
  [playerId: string]: {
    polygons: Array<Array<{x: number, y: number}>>,  // Explored visibility polygons
    simplified: boolean,                             // Has been simplified?
    vertexCount: number,                             // Total vertices (for size tracking)
    lastUpdated: Date
  }
} | null
```

### 2. Visibility Calculation Algorithm

**Approach: Visibility Polygon Algorithm**

Use the Red Blob Games visibility polygon algorithm (O(n log n) complexity):

1. Collect all walls/objects that block light
2. Convert to line segments in world coordinates
3. Cast rays from token position to each segment endpoint
4. Sort rays by angle
5. Build polygon from ray intersections
6. Clip to maximum vision range

**Library: Custom Implementation**

Rather than adding a dependency, implement a lightweight visibility polygon calculator based on:
- **Red Blob Games algorithm** - Clean, well-documented approach
- **JavaScript port**: https://github.com/Silverwolf90/2d-visibility (reference implementation)

**File Structure:**
```
packages/web/src/services/visibility/
├── VisibilityPolygonCalculator.mts   # Core algorithm
├── LightingEngine.mts                 # Combines lights + vision
├── FogOfWarManager.mts                # Exploration persistence
└── types.mts                          # Shared types
```

**Algorithm Pseudocode:**

```typescript
class VisibilityPolygonCalculator {
  /**
   * Calculate visibility polygon from a point
   * @param origin - Token position {x, y}
   * @param walls - Array of wall segments [{start: {x,y}, end: {x,y}}]
   * @param maxRange - Maximum vision distance
   * @returns Polygon vertices [{x, y}, ...]
   */
  calculate(
    origin: {x: number, y: number},
    walls: WallSegment[],
    maxRange: number
  ): Polygon {
    // 1. Collect all unique wall endpoints
    const points = this.getUniquePoints(walls);

    // 2. Cast rays to each endpoint (and slight offsets for corners)
    const rays = this.castRays(origin, points, walls, maxRange);

    // 3. Sort rays by angle
    rays.sort((a, b) => a.angle - b.angle);

    // 4. Build polygon from intersection points
    const polygon = rays.map(ray => ray.intersection);

    // 5. Clip to maxRange circle
    return this.clipToCircle(polygon, origin, maxRange);
  }
}
```

**Spatial Partitioning for Performance:**

To avoid checking every wall for every vision calculation, use a spatial grid:

```typescript
// packages/web/src/services/visibility/SpatialGrid.mts

class SpatialGrid {
  private cellSize: number;
  private grid: Map<string, WallSegment[]>;

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  /**
   * Insert a wall segment into the grid
   */
  insert(wall: WallSegment) {
    const cells = this.getCellsForSegment(wall);
    for (const cellKey of cells) {
      if (!this.grid.has(cellKey)) {
        this.grid.set(cellKey, []);
      }
      this.grid.get(cellKey)!.push(wall);
    }
  }

  /**
   * Get wall segments near a point (only check nearby cells)
   * This reduces wall checks by ~90% for large maps
   */
  getSegmentsNear(point: Point, radius: number): WallSegment[] {
    const minX = Math.floor((point.x - radius) / this.cellSize);
    const maxX = Math.floor((point.x + radius) / this.cellSize);
    const minY = Math.floor((point.y - radius) / this.cellSize);
    const maxY = Math.floor((point.y + radius) / this.cellSize);

    const segments = new Set<WallSegment>(); // Use Set to avoid duplicates

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        const cellSegments = this.grid.get(key);
        if (cellSegments) {
          cellSegments.forEach(seg => segments.add(seg));
        }
      }
    }

    return Array.from(segments);
  }

  private getCellsForSegment(wall: WallSegment): string[] {
    // Get all grid cells that this wall segment touches
    const minX = Math.min(wall.start.x, wall.end.x);
    const maxX = Math.max(wall.start.x, wall.end.x);
    const minY = Math.min(wall.start.y, wall.end.y);
    const maxY = Math.max(wall.start.y, wall.end.y);

    const startCellX = Math.floor(minX / this.cellSize);
    const endCellX = Math.floor(maxX / this.cellSize);
    const startCellY = Math.floor(minY / this.cellSize);
    const endCellY = Math.floor(maxY / this.cellSize);

    const cells: string[] = [];
    for (let x = startCellX; x <= endCellX; x++) {
      for (let y = startCellY; y <= endCellY; y++) {
        cells.push(`${x},${y}`);
      }
    }
    return cells;
  }
}
```

**Polygon Operations Library:**

**Decision: Use `polygon-clipping` npm package**

For merging, intersecting, and performing complex polygon operations:

```typescript
// packages/web/src/services/visibility/PolygonOperations.mts
import * as polyclip from 'polygon-clipping';

interface Point { x: number; y: number; }
type Polygon = Point[];

class PolygonOperations {
  /**
   * Merge multiple polygons into one (union)
   * Used for combining vision from multiple tokens
   */
  union(polygons: Polygon[]): Polygon[] {
    if (polygons.length === 0) return [];
    if (polygons.length === 1) return polygons;

    const formatted = polygons.map(p =>
      [[p.map(pt => [pt.x, pt.y] as [number, number])]]
    );

    const result = polyclip.union(...formatted);
    return this.formatResult(result);
  }

  /**
   * Find intersection of two polygons
   * Used for finding lit areas within vision
   */
  intersect(poly1: Polygon, poly2: Polygon): Polygon[] {
    const result = polyclip.intersection(
      [[poly1.map(pt => [pt.x, pt.y] as [number, number])]],
      [[poly2.map(pt => [pt.x, pt.y] as [number, number])]]
    );
    return this.formatResult(result);
  }

  /**
   * Subtract one polygon from another
   * Used for creating holes (e.g., darkness with lit cutouts)
   */
  difference(poly1: Polygon, poly2: Polygon): Polygon[] {
    const result = polyclip.difference(
      [[poly1.map(pt => [pt.x, pt.y] as [number, number])]],
      [[poly2.map(pt => [pt.x, pt.y] as [number, number])]]
    );
    return this.formatResult(result);
  }

  /**
   * Convert polygon-clipping result back to our format
   */
  private formatResult(result: number[][][][]): Polygon[] {
    return result.map(multiPoly =>
      multiPoly[0].map(point => ({ x: point[0], y: point[1] }))
    );
  }
}
```

**Why `polygon-clipping`:**
- Robust, well-tested implementation (used in production by many projects)
- Supports all operations we need (union, intersection, difference, xor)
- Good performance for VTT polygon sizes (hundreds of vertices)
- Active maintenance and bug fixes
- TypeScript type definitions available

### 3. Lighting Engine Architecture

```typescript
// packages/web/src/services/visibility/LightingEngine.mts

class LightingEngine {
  private calculator: VisibilityPolygonCalculator;
  private fogOfWar: FogOfWarManager;

  /**
   * Calculate what a player can see
   */
  calculatePlayerVision(
    playerTokens: Token[],           // Tokens player controls
    allLights: Light[],              // Map lights + token light sources
    walls: WallSegment[],            // Vision-blocking geometry
    encounterSettings: EncounterSettings
  ): VisionResult {

    if (encounterSettings.globalIllumination) {
      // Everything visible, no lighting needed
      return { visibleArea: 'all', litArea: 'all' };
    }

    const visiblePolygons: Polygon[] = [];
    const litPolygons: Polygon[] = [];

    // For each token player controls
    for (const token of playerTokens) {
      // 1. Calculate vision polygon
      const visionPoly = this.calculator.calculate(
        token.position,
        walls,
        token.vision.range
      );
      visiblePolygons.push(visionPoly);

      // 2. Calculate lit areas within vision
      if (encounterSettings.enableDynamicLighting) {
        const litInVision = this.calculateLitAreas(
          visionPoly,
          allLights,
          walls,
          token.vision.darkvision
        );
        litPolygons.push(...litInVision);
      }
    }

    // 3. Merge all visible areas
    const totalVisible = this.mergePolygons(visiblePolygons);
    const totalLit = this.mergePolygons(litPolygons);

    // 4. Apply fog of war
    if (encounterSettings.enableFogOfWar) {
      return this.fogOfWar.applyFog(totalVisible, totalLit);
    }

    return { visibleArea: totalVisible, litArea: totalLit };
  }

  /**
   * Calculate which areas are lit by light sources
   */
  private calculateLitAreas(
    visionPolygon: Polygon,
    lights: Light[],
    walls: WallSegment[],
    darkvision: number
  ): Polygon[] {
    const litAreas: Polygon[] = [];

    for (const light of lights) {
      // Calculate light polygon (blocked by walls)
      const brightPoly = this.calculator.calculate(
        light.position,
        walls,
        light.brightRadius
      );

      const dimPoly = this.calculator.calculate(
        light.position,
        walls,
        light.dimRadius
      );

      // Intersect with vision polygon (can only see lit areas you can see)
      const visibleBright = this.intersectPolygons(brightPoly, visionPolygon);
      const visibleDim = this.intersectPolygons(dimPoly, visionPolygon);

      litAreas.push(
        { polygon: visibleBright, intensity: 1.0 },
        { polygon: visibleDim, intensity: 0.5 }
      );
    }

    // Add darkvision area (if any)
    if (darkvision > 0) {
      const darkvisionPoly = this.calculator.calculate(
        token.position,
        walls,
        darkvision
      );
      litAreas.push({ polygon: darkvisionPoly, intensity: 0.3 });
    }

    return litAreas;
  }
}
```

### 4. Rendering Architecture

**Pixi.js Rendering Layers:**

```
app.stage
├── mapContainer
│   ├── backgroundSprite       (map image)
│   ├── terrainGraphics         (terrain overlays)
│   ├── objectGraphics          (objects/walls - debug)
│   └── gridGraphics            (grid overlay)
├── lightingContainer          (NEW)
│   ├── litAreasGraphics        (bright/dim light rendering)
│   └── lightAnimations         (torch flicker effects)
├── tokenContainer
│   └── tokens...               (token sprites)
└── visionContainer            (NEW)
    ├── visibilityMask          (player vision mask)
    └── fogOfWarOverlay         (unexplored areas)
```

**Vision Masking Approach:**

Use Pixi.js Graphics with alpha masking:

```typescript
class VisionRenderer {
  private visibilityMask: PIXI.Graphics;
  private fogOfWarGraphics: PIXI.Graphics;

  renderPlayerVision(visionResult: VisionResult) {
    // 1. Clear previous mask
    this.visibilityMask.clear();

    // 2. Draw visible area as white (alpha = 1)
    this.visibilityMask.beginFill(0xFFFFFF, 1.0);
    for (const polygon of visionResult.visibleArea) {
      this.drawPolygon(this.visibilityMask, polygon);
    }
    this.visibilityMask.endFill();

    // 3. Apply mask to map container
    this.mapContainer.mask = this.visibilityMask;
    this.tokenContainer.mask = this.visibilityMask;

    // 4. Render fog of war (unexplored = dark overlay)
    this.renderFogOfWar(visionResult.exploredArea);

    // 5. Render lighting (dim areas darker)
    this.renderLighting(visionResult.litArea);
  }

  renderLighting(litAreas: LitArea[]) {
    this.lightingGraphics.clear();

    // Draw dim overlay over entire visible area
    this.lightingGraphics.beginFill(0x000000, 0.6);
    this.lightingGraphics.drawRect(0, 0, mapWidth, mapHeight);
    this.lightingGraphics.endFill();

    // Cut out lit areas (blend mode: erase)
    for (const area of litAreas) {
      const alpha = 1.0 - (area.intensity * 0.6); // Brighter = less dark
      this.lightingGraphics.beginFill(0x000000, alpha);
      this.drawPolygon(this.lightingGraphics, area.polygon);
      this.lightingGraphics.endFill();
    }
  }

  renderFogOfWar(exploredArea: Polygon) {
    this.fogOfWarGraphics.clear();

    // Entire map is dark
    this.fogOfWarGraphics.beginFill(0x000000, 1.0);
    this.fogOfWarGraphics.drawRect(0, 0, mapWidth, mapHeight);
    this.fogOfWarGraphics.endFill();

    // Cut out explored areas (holes in the darkness)
    this.fogOfWarGraphics.beginHole();
    this.drawPolygon(this.fogOfWarGraphics, exploredArea);
    this.fogOfWarGraphics.endHole();
  }
}
```

### 5. Performance Optimization

**Caching Strategy:**

```typescript
class VisionCache {
  // Cache visibility polygons for static lights
  private staticLightCache: Map<string, {
    polygon: Polygon,
    wallsHash: string  // Invalidate if walls change
  }>;

  // Cache token vision (recalculate on movement only)
  private tokenVisionCache: Map<string, {
    polygon: Polygon,
    position: {x, y},
    walls: WallSegment[]
  }>;

  // Throttle recalculation
  private lastCalculation: number = 0;
  private minCalculationInterval: number = 16; // ~60fps

  shouldRecalculate(): boolean {
    const now = performance.now();
    if (now - this.lastCalculation < this.minCalculationInterval) {
      return false;
    }
    this.lastCalculation = now;
    return true;
  }
}
```

**Level of Detail (LOD) System for Mobile:**

Automatically adjust quality based on device capabilities:

```typescript
// packages/web/src/services/visibility/LODManager.mts

class LODManager {
  private deviceTier: 'high' | 'medium' | 'low';

  constructor() {
    this.deviceTier = this.detectDeviceTier();
  }

  private detectDeviceTier(): 'high' | 'medium' | 'low' {
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    const memory = (navigator as any).deviceMemory || 4; // GB
    const cores = navigator.hardwareConcurrency || 4;

    // Desktop with good specs
    if (!isMobile && memory >= 8 && cores >= 4) return 'high';

    // Desktop with medium specs or high-end mobile
    if (!isMobile && memory >= 4) return 'medium';

    // Low-end devices
    return 'low';
  }

  /**
   * Get vision calculation settings based on device tier
   */
  getVisionSettings() {
    switch (this.deviceTier) {
      case 'high':
        return {
          maxWalls: Infinity,           // No limit
          rayCount: 360,                // Full 360-degree precision
          polygonSimplifyTolerance: 0.5, // Minimal simplification (0.5px)
          updateInterval: 16,           // 60fps
          enableAnimations: true,       // Full light animations
          shadowQuality: 'high',        // High-quality shadows
        };

      case 'medium':
        return {
          maxWalls: 1000,               // Check 1000 nearest walls
          rayCount: 180,                // Half precision (every 2 degrees)
          polygonSimplifyTolerance: 2.0, // More simplification (2px)
          updateInterval: 33,           // 30fps
          enableAnimations: true,       // Light animations enabled
          shadowQuality: 'medium',      // Medium shadows
        };

      case 'low':
        return {
          maxWalls: 500,                // Check 500 nearest walls
          rayCount: 90,                 // Quarter precision (every 4 degrees)
          polygonSimplifyTolerance: 5.0, // Heavy simplification (5px)
          updateInterval: 66,           // 15fps
          enableAnimations: false,      // Disable animations
          shadowQuality: 'low',         // Simple shadows
        };
    }
  }

  /**
   * Simplify polygon based on LOD settings
   */
  simplifyPolygon(polygon: Polygon): Polygon {
    const settings = this.getVisionSettings();
    return this.douglasPeucker(polygon, settings.polygonSimplifyTolerance);
  }

  /**
   * Douglas-Peucker polygon simplification
   * Reduces vertex count while maintaining shape
   */
  private douglasPeucker(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) return points;

    // Find point farthest from line between first and last
    let maxDistance = 0;
    let maxIndex = 0;

    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(points[i], start, end);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than tolerance, recursively simplify
    if (maxDistance > tolerance) {
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
      const right = this.douglasPeucker(points.slice(maxIndex), tolerance);
      return [...left.slice(0, -1), ...right];
    } else {
      return [start, end];
    }
  }

  private perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);

    const u = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (mag * mag);
    const intersect = {
      x: lineStart.x + u * dx,
      y: lineStart.y + u * dy
    };

    return Math.hypot(point.x - intersect.x, point.y - intersect.y);
  }
}
```

**Performance Monitoring:**

```typescript
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  track(operation: string, durationMs: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    const history = this.metrics.get(operation)!;
    history.push(durationMs);

    // Keep last 100 measurements
    if (history.length > 100) history.shift();
  }

  getAverageTime(operation: string): number {
    const history = this.metrics.get(operation);
    if (!history || history.length === 0) return 0;
    return history.reduce((a, b) => a + b, 0) / history.length;
  }

  report(): { operation: string; avgTime: number; p95Time: number }[] {
    const report: any[] = [];
    for (const [operation, history] of this.metrics) {
      const sorted = [...history].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      report.push({
        operation,
        avgTime: this.getAverageTime(operation),
        p95Time: sorted[p95Index] || 0
      });
    }
    return report;
  }
}
```

**Optimization Techniques:**

1. **Static Light Caching** - Pre-calculate static map lights once
2. **Token Movement Throttling** - Recalculate vision only after movement stops
3. **Spatial Partitioning** - Only check nearby walls (quadtree/grid)
4. **LOD (Level of Detail)** - Reduce polygon precision at distance
5. **WebWorker** - Move calculations off main thread (future enhancement)
6. **Dirty Flagging** - Only recalculate when tokens move or lights change

### 6. Client-Side vs Server-Side

**Client-Side Rendering (RECOMMENDED):**

- Vision calculations happen in each player's browser
- Server sends map data, token positions, light positions
- Each client calculates own visibility
- **Advantages:**
  - No server load for vision calculations
  - Instant visual feedback
  - No network latency
  - Can't cheat by inspecting network traffic (calculations local)

**Server Authority:**

- Server validates token positions (no moving through walls)
- Server stores fog of war state (explored areas)
- Server enforces encounter settings (lighting enabled/disabled)

**Fog of War Synchronization:**

Real-time sync strategy for explored areas:

```typescript
// packages/web/src/services/visibility/FogOfWarSync.mts

class FogOfWarSync {
  private socket: Socket;
  private syncQueue: Map<string, Polygon[]>;
  private isSyncing: boolean = false;

  /**
   * Update fog immediately (real-time sync)
   * Called whenever player discovers new areas
   */
  updateFog(playerId: string, exploredPolygons: Polygon[]) {
    this.syncQueue.set(playerId, exploredPolygons);

    // Immediate sync (don't wait)
    if (!this.isSyncing) {
      this.syncToServer();
    }
  }

  /**
   * Send queued fog updates to server
   * Server is authoritative and stores the state
   */
  private async syncToServer() {
    if (this.syncQueue.size === 0) return;

    this.isSyncing = true;

    // Send all queued updates
    for (const [playerId, polygons] of this.syncQueue) {
      // Simplify before sending to reduce payload size
      const simplified = this.simplifyForTransport(polygons);

      this.socket.emit('gameAction:request', {
        type: 'update-fog-of-war',
        playerId,
        exploredPolygons: simplified
      });
    }

    this.syncQueue.clear();
    this.isSyncing = false;
  }

  /**
   * Simplify polygons before sending over network
   * Reduces payload size by ~70%
   */
  private simplifyForTransport(polygons: Polygon[]): Polygon[] {
    return polygons.map(poly =>
      poly.map(point => ({
        x: Math.round(point.x * 10) / 10,  // Round to 1 decimal place
        y: Math.round(point.y * 10) / 10
      }))
    );
  }

  /**
   * Receive fog update from server (when other players explore)
   * Only GM client receives all players' fog updates
   */
  onFogUpdate(data: { playerId: string; exploredPolygons: Polygon[] }) {
    // Update local fog state
    this.fogManager.setExploredAreas(data.playerId, data.exploredPolygons);

    // Re-render if this is the current player's view
    if (this.isViewingPlayer(data.playerId)) {
      this.visionRenderer.updateFog();
    }
  }
}
```

**Sync Flow:**

1. **Player Client**: Token moves → calculate vision → update explored areas → send to server
2. **Server (GM Client)**: Validate request → store in encounter state → broadcast to GM
3. **GM Client**: Receive update → can view any player's fog state
4. **Player Client**: Fog persists across sessions (if permanent mode enabled)

**Payload Optimization:**
- Round coordinates to 1 decimal place
- Merge polygons before sending (union operation)
- Only send delta updates (new areas since last sync)
- Typical payload: ~2KB for normal exploration, ~10KB for large reveal

**Anti-Cheat:**

Players could theoretically modify client code to see through walls. Mitigations:

1. **Server-side validation** - Server validates all actions (movement, targeting)
2. **GM visibility** - GM sees what each player should see
3. **Audit logs** - Track suspicious behavior
4. **Future enhancement** - Server-side vision validation for competitive play

### 7. Integration Points

#### With Existing Systems

**Token Movement** ([packages/web/src/services/handlers/actions/move-token.handler.mts](../../packages/web/src/services/handlers/actions/move-token.handler.mts))

```typescript
// After token moves, recalculate vision
onTokenMoved(tokenId: string) {
  if (this.encounterSettings.enableDynamicLighting) {
    this.lightingEngine.invalidateCache(tokenId);
    this.visionRenderer.updateVision();
  }
}
```

**Map Renderer** ([packages/web/src/services/encounter/PixiMapRenderer.mts](../../packages/web/src/services/encounter/PixiMapRenderer.mts))

```typescript
// Extract walls from map data for visibility
getVisionBlockingWalls(): WallSegment[] {
  return this.mapData.walls
    .filter(wall => wall.blocksLight)
    .map(wall => ({
      start: {x: wall.start.x, y: wall.start.y},
      end: {x: wall.end.x, y: wall.end.y}
    }));
}
```

**Game State Store** ([packages/web/src/stores/game-state.store.mts](../../packages/web/src/stores/game-state.store.mts))

```typescript
// Watch for token updates and recalculate vision
watch(
  () => gameState.currentEncounter?.tokens,
  () => {
    if (encounterSettings.enableDynamicLighting) {
      lightingEngine.updateVision();
    }
  },
  { deep: true }
);
```

#### New Services

```typescript
// packages/web/src/services/visibility/index.mts

export class VisibilityService {
  private engine: LightingEngine;
  private renderer: VisionRenderer;
  private cache: VisionCache;

  initialize(pixiApp: PIXI.Application, mapData: IMapResponse) {
    this.engine = new LightingEngine();
    this.renderer = new VisionRenderer(pixiApp);
  }

  updateVision(
    playerTokens: Token[],
    encounterSettings: EncounterSettings
  ) {
    // Only recalculate if needed
    if (!this.cache.shouldRecalculate()) return;

    const walls = this.extractWalls(this.mapData);
    const lights = this.extractLights(this.mapData, playerTokens);

    const visionResult = this.engine.calculatePlayerVision(
      playerTokens,
      lights,
      walls,
      encounterSettings
    );

    this.renderer.renderPlayerVision(visionResult);
  }
}
```

### 8. User Interface

#### GM Controls

**Encounter Settings Panel:**

```
┌─ Visibility Settings ────────────────────┐
│                                          │
│ ☑ Enable Dynamic Lighting                │
│   When enabled, tokens need light        │
│   sources to see                         │
│                                          │
│ ☑ Enable Fog of War                      │
│   Unexplored areas remain hidden         │
│                                          │
│ ○ Session Only                           │
│ ● Permanent (saves exploration)          │
│                                          │
│ ☐ Global Illumination                    │
│   Entire map is lit (debugging)          │
│                                          │
│ Dim Light Opacity: [======□···] 60%      │
│                                          │
└──────────────────────────────────────────┘
```

**Token Vision Editor:**

Right-click token → Edit Vision

```
┌─ Token Vision ───────────────────────────┐
│                                          │
│ Vision Range:    [60] world units        │
│ Darkvision:      [60] world units        │
│ Blindsight:      [0 ] world units        │
│                                          │
│ Vision Mode: [Normal      ▾]             │
│   ○ Normal                               │
│   ● Darkvision                           │
│   ○ Blindsight                           │
│   ○ Tremorsense                          │
│                                          │
│ ─── Light Source ───                     │
│                                          │
│ ☑ Emit Light (torch/lantern)             │
│                                          │
│ Bright Radius:   [20] world units        │
│ Dim Radius:      [40] world units        │
│ Color:           [🎨 #ffaa00]            │
│ Animation:       [Flicker    ▾]          │
│                                          │
│         [Cancel]  [Apply]                │
└──────────────────────────────────────────┘
```

#### Player View

**Visibility Indicators:**

- **Black overlay** - Unexplored fog of war
- **Dark grey overlay** - Explored but not currently visible
- **Dim overlay** - Visible but not brightly lit (darkvision or dim light)
- **Full brightness** - Visible and brightly lit

**UI Hints:**

- Mini-map shows explored areas (optional)
- "You need a light source" message when entering dark area
- Token outline glows when in darkness

### 9. Migration and Backwards Compatibility

**Default Values:**

All new properties have sensible defaults:

```typescript
// Default vision for existing tokens
vision: {
  range: 60,           // Standard human vision
  darkvision: 0,       // No darkvision
  blindsight: 0,       // No blindsight
  mode: 'normal'
}

lightSource: {
  enabled: false,      // No light emission by default
  brightRadius: 0,
  dimRadius: 0,
  color: '#ffffff',
  animation: 'none'
}
```

**Feature Flags:**

```typescript
// Encounters default to lighting disabled
settings: {
  enableDynamicLighting: false,  // Opt-in
  enableFogOfWar: false,         // Opt-in
  fogOfWarPersistence: 'session'
}
```

Existing encounters continue working unchanged until GM enables lighting features.

### 10. Testing Strategy

**Unit Tests:**

```typescript
describe('VisibilityPolygonCalculator', () => {
  it('calculates simple visibility with no walls', () => {
    const origin = {x: 0, y: 0};
    const walls = [];
    const range = 60;

    const polygon = calculator.calculate(origin, walls, range);

    // Should be a circle approximation
    expect(polygon.length).toBeGreaterThan(32);
  });

  it('blocks vision behind walls', () => {
    const origin = {x: 0, y: 0};
    const walls = [
      {start: {x: 30, y: -20}, end: {x: 30, y: 20}}
    ];
    const range = 60;

    const polygon = calculator.calculate(origin, walls, range);

    // Should not include points behind the wall
    const pointBehindWall = {x: 50, y: 0};
    expect(isPointInPolygon(pointBehindWall, polygon)).toBe(false);
  });
});
```

**Integration Tests:**

- Load map with walls and lights
- Place token with specific vision
- Verify correct visibility polygon
- Move token and verify update
- Test fog of war persistence

**Performance Tests:**

- 1000 walls → should calculate in < 50ms
- 50 light sources → should render at 60fps
- Token movement → should update in < 16ms

### 11. Files to Create

**Core Visibility System:**

```
packages/web/src/services/visibility/
├── index.mts                          # Main export and service facade
├── types.mts                          # Shared types (Point, Polygon, WallSegment, etc.)
├── VisibilityPolygonCalculator.mts    # Core visibility algorithm (Red Blob Games)
├── PolygonOperations.mts              # Wrapper for polygon-clipping library
├── SpatialGrid.mts                    # Spatial indexing for wall optimization
├── LightingEngine.mts                 # Combines vision + lights calculations
├── VisionRenderer.mts                 # Pixi.js vision mask rendering
├── LightingRenderer.mts               # Pixi.js light overlay rendering
├── LightAnimator.mts                  # Light animation system (flicker, pulse, torch)
├── FogOfWarManager.mts                # Fog persistence and polygon simplification
├── FogOfWarSync.mts                   # Real-time server synchronization
├── VisionCache.mts                    # Multi-level caching system
├── VisionUpdateScheduler.mts          # Throttling and update scheduling
├── LODManager.mts                     # Level of Detail for mobile devices
├── PerformanceMonitor.mts             # Performance tracking and reporting
└── VisibilityService.mts              # Main service facade for external use
```

**Schema Changes:**

```
packages/shared/src/schemas/
├── tokens.schema.mts                  # Add vision + lightSource properties
└── encounters.schema.mts              # Add exploredAreas + vision settings
```

**Game Actions:**

```
packages/shared/src/types/
└── game-actions.mts                   # Add fog-related actions
    - UpdateFogOfWarAction
    - ResetFogOfWarAction
    - ToggleLightingAction
```

**UI Components:**

```
packages/web/src/components/encounter/
├── LightingSettingsPanel.vue          # GM lighting/fog controls
├── TokenVisionEditor.vue              # Token vision editor dialog
└── VisionDebugOverlay.vue             # GM debug view (show player visions)
```

**Integration Updates:**

```
packages/web/src/services/encounter/
├── PixiMapRenderer.mts                # Add getVisionBlockingWalls() method
└── TokenRenderer.mts                  # Add light source visualization
```

**Action Handlers:**

```
packages/web/src/services/handlers/actions/
├── move-token.handler.mts             # Add vision recalculation on move
├── update-fog-of-war.handler.mts      # NEW: Handle fog updates
└── reset-fog-of-war.handler.mts       # NEW: Handle fog reset
```

**Tests:**

```
packages/web/src/services/visibility/__tests__/
├── VisibilityPolygonCalculator.test.mts
├── PolygonOperations.test.mts
├── SpatialGrid.test.mts
├── LightingEngine.test.mts
├── FogOfWarManager.test.mts
├── LODManager.test.mts
└── performance.test.mts

packages/web/e2e/
├── lighting.spec.mts                  # E2E tests for lighting
└── fog-of-war.spec.mts                # E2E tests for fog
```

**Total Files:** ~30 new files, ~5 modified files

### 12. Implementation Phases

**Timeline:** 5 weeks (~25 development days)

#### Phase 1: Foundation (Week 1 - 5-6 days)

**Goal:** Core visibility calculation and basic rendering

- [ ] Install `polygon-clipping` npm package
- [ ] Create types.mts (Point, Polygon, WallSegment, etc.)
- [ ] Implement VisibilityPolygonCalculator core algorithm
  - Ray casting logic
  - Angle sorting
  - Circle clipping
- [ ] Implement SpatialGrid for wall indexing
- [ ] Implement PolygonOperations wrapper (union, intersection, difference)
- [ ] Add vision properties to token schema (with defaults)
- [ ] Add lightSource properties to token schema (with defaults)
- [ ] Create basic VisionRenderer with Pixi.js masking
- [ ] Unit tests for visibility algorithm (simple cases, wall blocking)
- [ ] Integration test: Single token vision on empty map

**Deliverable:** Token can have vision range, visibility polygon calculated correctly

#### Phase 2: Lighting Engine (Week 2 - 5-6 days)

**Goal:** Light sources illuminate the map

- [ ] Implement LightingEngine
  - Extract lights from map + tokens
  - Calculate lit areas (bright/dim polygons)
  - Support for darkvision
- [ ] Implement LightingRenderer
  - Darkness overlay
  - Light cutouts with additive blending
  - Colored lights support
- [ ] Implement LightAnimator
  - Flicker animation
  - Pulse animation
  - Torch animation (realistic)
- [ ] Add token light source rendering (visual indicator)
- [ ] Implement shared vision system
  - Individual mode
  - Shared-party mode
  - Custom groups mode
- [ ] Update encounter settings schema (visionMode, visionSharing)
- [ ] Integration tests (lights + vision, overlapping lights)

**Deliverable:** Lights work, darkvision works, party can share vision

#### Phase 3: Fog of War (Week 3 - 5-6 days)

**Goal:** Explored areas persist

- [ ] Add exploredAreas to encounter schema
- [ ] Implement FogOfWarManager
  - Store explored polygons per player
  - Douglas-Peucker polygon simplification
  - Periodic merging (union > 50 polygons)
- [ ] Implement FogOfWarSync
  - Real-time sync to server
  - Payload optimization (coordinate rounding)
  - Handle sync failures
- [ ] Add game actions (update-fog-of-war, reset-fog-of-war)
- [ ] Implement fog rendering (explored vs unexplored)
- [ ] Add fog persistence options (session vs permanent)
- [ ] Add reset fog functionality
- [ ] Integration tests (fog persistence, sync, reset)

**Deliverable:** Fog of war works, persists across sessions, syncs to server

#### Phase 4: Performance & Polish (Week 4 - 4-5 days)

**Goal:** Smooth performance on all devices

- [ ] Implement VisionCache
  - Static light caching
  - Token vision caching (per position)
  - Wall hash for invalidation
- [ ] Implement VisionUpdateScheduler (throttling)
- [ ] Implement LODManager
  - Device tier detection
  - Adaptive settings (ray count, simplification, FPS)
  - Douglas-Peucker implementation
- [ ] Implement PerformanceMonitor
  - Track operation times
  - Report averages and p95
- [ ] Optimize polygon operations (profile and fix bottlenecks)
- [ ] Add performance tests
  - 1000 walls < 50ms
  - 60 FPS with 50 tokens + 20 lights
- [ ] Mobile testing on real devices

**Deliverable:** Hits performance targets, works smoothly on mobile

#### Phase 5: UI & Integration (Week 5 - 4-5 days)

**Goal:** User-facing controls and integration

- [ ] Create LightingSettingsPanel.vue
  - Enable/disable dynamic lighting
  - Enable/disable fog of war
  - Fog persistence mode
  - Vision mode selector
  - Dim light opacity slider
  - Global illumination toggle
- [ ] Create TokenVisionEditor.vue
  - Vision range input
  - Darkvision input
  - Blindsight input
  - Light source controls
  - Color picker
  - Animation selector
- [ ] Create VisionDebugOverlay.vue (GM view)
  - Toggle between player views
  - Show all visions simultaneously
- [ ] Integrate with token movement handler
  - Invalidate cache on move
  - Trigger vision recalculation
- [ ] Integrate with PixiMapRenderer
  - getVisionBlockingWalls() method
  - Extract lights from map
- [ ] Add player vision indicators (UI hints)
- [ ] E2E tests with Playwright
  - Enable lighting → verify darkness
  - Token moves → verify vision updates
  - Fog persists → reload page, verify fog still there
  - GM toggles lighting → verify immediate update

**Deliverable:** Complete feature with UI, ready for production

#### Phase 6: Advanced Features (Future)

**Not in MVP - deferred to post-launch**

- [ ] Darkvision greyscale ColorMatrixFilter
- [ ] One-way vision (windows, arrow slits)
- [ ] Transparent walls with partial transparency
- [ ] Elevation-based vision blocking (3D line of sight)
- [ ] Weather effects (fog reduces vision, rain adds noise)
- [ ] WebWorker support (offload calculations to background thread)
- [ ] Directional lights (cones, beams)
- [ ] Light intensity falloff curves (linear, quadratic, realistic)
- [ ] Vision modes UI polish (better visualization)
- [ ] Mobile-specific optimizations (touch gestures for vision)

## Technical Specifications

### Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Visibility Calculation | < 50ms | For 1000 wall segments |
| Rendering FPS | 60 FPS (desktop) | With 50 tokens + 20 lights |
| Rendering FPS | 30 FPS (mobile) | LOD system adjusts quality |
| Memory Usage | < 50MB | For vision data + caches |
| Network Payload | ~2KB typical | Per fog update (compressed) |
| Cache Hit Rate | > 80% | During normal gameplay |
| Token Movement Latency | < 16ms | Vision update after move |

### Browser Compatibility

- **Minimum:** Chrome 90+, Firefox 88+, Safari 14+
- **WebGL:** Required for Pixi.js rendering (hardware acceleration)
- **Canvas2D:** Fallback for older browsers (limited features, lower performance)
- **Mobile:** iOS 14+, Android Chrome 90+

### Algorithm Complexity

| Operation | Complexity | Implementation |
|-----------|------------|----------------|
| Visibility Polygon | O(n log n) | Red Blob Games algorithm |
| Spatial Grid Lookup | O(k) | Where k = nearby walls (~10% of total) |
| Polygon Union | O(n²) worst case | `polygon-clipping` library |
| Polygon Intersection | O(n + m) | `polygon-clipping` library |
| Douglas-Peucker | O(n²) worst case | For polygon simplification |
| Rendering | O(m) | Where m = polygon vertices |

**Optimization Impact:**
- Spatial grid reduces wall checks by ~90%
- Caching reduces recalculations by ~80%
- LOD reduces mobile calculations by ~75%

## Alternative Approaches Considered

### 1. Ray Marching

**Description:** Cast rays in all directions from token, march until hit wall

**Pros:**
- Simple to implement
- Works well for circular vision

**Cons:**
- O(n × m) complexity (rays × walls)
- Produces jagged polygons at low ray counts
- Poor performance with many light sources

**Decision:** Rejected - Visibility polygon algorithm is more efficient

### 2. Grid-Based Visibility

**Description:** Shadowcasting on grid cells (roguelike approach)

**Pros:**
- Very fast for grid-aligned maps
- Simple line-of-sight checks

**Cons:**
- Limited to grid-aligned vision
- Poor with diagonal walls
- Doesn't support arbitrary polygons

**Decision:** Rejected - Maps use arbitrary wall segments, not grid-aligned

### 3. Pixi-Lights Plugin

**Description:** Use existing pixi-lights library for deferred lighting

**Pros:**
- Pre-built solution
- Professional quality

**Cons:**
- Last updated 4 years ago
- Requires @pixi/layers (additional dependency)
- Overkill for 2D top-down VTT
- Doesn't include vision polygon calculation

**Decision:** Rejected - Custom implementation better fits our needs

### 4. Server-Side Rendering

**Description:** Calculate vision on server, send mask images to clients

**Pros:**
- Prevents client-side cheating
- Consistent across clients

**Cons:**
- High server CPU usage
- Network latency
- Bandwidth overhead (images)
- Doesn't scale with player count

**Decision:** Rejected - Client-side rendering more scalable

## Security Considerations

### Preventing Vision Cheating

**Threat Model:**
- Player modifies client code to see through walls
- Player disables vision mask rendering
- Player inspects WebSocket traffic for token positions

**Mitigations:**

1. **Server Validation**
   - Server validates all actions (targeting, movement)
   - Can't target what you shouldn't see (server checks)
   - Movement validation prevents phasing through walls

2. **GM Monitoring**
   - GM can see what each player sees
   - Suspicious behavior logged
   - Admin tools to audit player actions

3. **Limited Impact**
   - Cooperative gameplay (not competitive)
   - Trust-based system (like physical tabletop)
   - Cheating ruins own experience

4. **Future Enhancement**
   - Server-side vision validation (optional strict mode)
   - Hash verification of client code
   - Replay validation for competitive games

## Architectural Decisions (Resolved)

1. **Polygon Clipping Library** ✅ **RESOLVED**
   - **Decision:** Use `polygon-clipping` npm package
   - **Rationale:** Robust, well-tested, supports all needed operations (union, intersection, difference)
   - **Alternative considered:** martinez-polygon-clipping (less maintained)

2. **WebWorker Support** ✅ **RESOLVED**
   - **Decision:** Defer to Phase 6+ (future enhancement)
   - **Rationale:** Adds significant complexity, not needed for MVP performance targets
   - **Note:** Architecture designed to support WebWorkers later if needed

3. **Mobile Performance** ✅ **RESOLVED**
   - **Decision:** Implement Level of Detail (LOD) system
   - **Approach:** Device tier detection (high/medium/low) with adaptive settings
   - **Settings adjusted:** Ray count, polygon simplification, update interval, animations

4. **Shared Vision** ✅ **RESOLVED**
   - **Decision:** Support both automatic party sharing AND manual per-token sharing
   - **Modes:**
     - `individual`: Each token has separate vision
     - `shared-party`: All player tokens automatically share vision
     - `custom`: GM defines custom vision groups (familiars, scrying, etc.)

5. **Light Colors** ✅ **RESOLVED**
   - **Decision:** Support colored lights from day 1
   - **Implementation:** Additive blending for overlapping lights (red + blue = purple)
   - **Rationale:** Easier to implement now than retrofit later

6. **Darkvision Rendering** ✅ **RESOLVED**
   - **Decision:** Start with dimmer rendering, add greyscale filter as Phase 6 enhancement
   - **Phase 1-5:** Darkvision areas rendered at 30% intensity
   - **Phase 6:** Optional greyscale ColorMatrixFilter for darkvision areas

7. **Fog Sync Strategy** ✅ **RESOLVED**
   - **Decision:** Real-time (immediate) synchronization
   - **Rationale:** Provides instant feedback, payload size manageable (~2KB typical)
   - **Optimization:** Round coordinates, merge polygons before sending

## Open Questions (Remaining)

1. **Shadow Quality Presets:** What specific settings for high/medium/low shadow quality?
2. **Light Animation Presets:** Define exact parameters for flicker/pulse/torch animations
3. **Vision Group UI:** How should GM create and manage custom vision groups?
4. **Fog Reset Behavior:** Should fog reset require confirmation? GM-only or per-player?
5. **Explored Area Limits:** Maximum polygon count before forced simplification?
6. **Network Retry Logic:** How to handle failed fog sync (retry, queue, discard)?

## References

- **Red Blob Games - 2D Visibility:** https://www.redblobgames.com/articles/visibility/
- **Nicky Case - Sight & Light:** https://ncase.me/sight-and-light/
- **Visibility Polygon JS:** https://github.com/Silverwolf90/2d-visibility
- **Foundry VTT Lighting:** https://foundryvtt.com/article/lighting/
- **Pixi.js Graphics Documentation:** https://pixijs.com/guides/components/graphics

## Appendix: Code Examples

### Example: Token with Vision

```typescript
const token: Token = {
  id: 'token-123',
  name: 'Elara (Elf Ranger)',
  position: {x: 500, y: 300},
  vision: {
    range: 60,
    darkvision: 60,  // Elves have darkvision
    blindsight: 0,
    mode: 'darkvision'
  },
  lightSource: {
    enabled: true,
    brightRadius: 20,  // Torch
    dimRadius: 40,
    color: '#ff8800',
    animation: 'flicker'
  }
};
```

### Example: Calculating Visibility

```typescript
const walls = mapRenderer.getVisionBlockingWalls();
const lights = [
  ...mapData.lights,
  ...tokens.filter(t => t.lightSource.enabled).map(t => ({
    position: t.position,
    brightRadius: t.lightSource.brightRadius,
    dimRadius: t.lightSource.dimRadius,
    color: t.lightSource.color
  }))
];

const visionResult = lightingEngine.calculatePlayerVision(
  [token],
  lights,
  walls,
  encounter.settings
);

visionRenderer.renderPlayerVision(visionResult);
```

### Example: Fog of War State

```typescript
encounter.exploredAreas = {
  'player-abc': {
    polygons: [
      [{x: 0, y: 0}, {x: 100, y: 0}, {x: 100, y: 100}, {x: 0, y: 100}],
      [{x: 200, y: 200}, {x: 300, y: 200}, {x: 300, y: 300}]
    ],
    lastUpdated: new Date('2025-01-04T10:30:00Z')
  },
  'player-xyz': {
    polygons: [
      [{x: 50, y: 50}, {x: 150, y: 50}, {x: 150, y: 150}, {x: 50, y: 150}]
    ],
    lastUpdated: new Date('2025-01-04T10:32:00Z')
  }
};
```

---

**End of Proposal**
