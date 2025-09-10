import type { IMapResponse } from '@dungeon-lab/shared/types/api/index.mjs';
import { z } from 'zod';
import { worldCoordinateSystemSchema } from '@dungeon-lab/shared/schemas/map.schema.mjs';

type WorldCoordinateSystem = z.infer<typeof worldCoordinateSystemSchema>;

export interface Point {
  x: number;
  y: number;
}

export interface LineSegment {
  start: Point;
  end: Point;
}

/**
 * Check if a line segment intersects with any walls or objects in the map
 * @param currentGridPos Current position of the token in grid coordinates
 * @param targetGridPos Target position of the token in grid coordinates
 * @param mapData Map data containing walls and objects
 * @param debug Enable detailed collision logging
 * @returns true if movement would intersect with a wall or object
 */
export function checkWallCollision(
  currentGridPos: Point,
  targetGridPos: Point,
  mapData: IMapResponse | null,
  debug: boolean = false
): boolean {
  if (!mapData?.mapData) {
    if (debug) {
      console.log('[CollisionDetection] No mapData found, movement allowed');
    }
    return false; // No map data, movement allowed
  }

  const coordinates = mapData.mapData.coordinates;
  if (!coordinates) {
    if (debug) {
      console.log('[CollisionDetection] No coordinates found, movement allowed');
    }
    return false;
  }

  // Convert grid positions to world coordinates for collision detection
  const currentWorldPos = gridToWorld(currentGridPos, coordinates);
  const targetWorldPos = gridToWorld(targetGridPos, coordinates);

  const movementLine: LineSegment = {
    start: currentWorldPos,
    end: targetWorldPos
  };

  if (debug) {
    console.log(`[CollisionDetection] Movement in world coords: (${currentWorldPos.x}, ${currentWorldPos.y}) → (${targetWorldPos.x}, ${targetWorldPos.y})`);
  }

  // Check intersection with walls
  if (mapData.mapData.walls && Array.isArray(mapData.mapData.walls)) {
    if (debug) {
      console.log(`[CollisionDetection] 🧱 Checking ${mapData.mapData.walls.length} walls`);
    }
    
    for (let wallIndex = 0; wallIndex < mapData.mapData.walls.length; wallIndex++) {
      const wall = mapData.mapData.walls[wallIndex];
      
      // Skip walls that don't block movement
      if (!wall.blocksMovement) {
        if (debug) {
          console.log(`[CollisionDetection] Skipping wall ${wall.id}: doesn't block movement`);
        }
        continue;
      }
      
      const wallLine: LineSegment = {
        start: { x: wall.start.x, y: wall.start.y },
        end: { x: wall.end.x, y: wall.end.y }
      };
      
      if (debug) {
        console.log(`[CollisionDetection] 🔍 Checking wall ${wall.id}: (${wallLine.start.x}, ${wallLine.start.y}) → (${wallLine.end.x}, ${wallLine.end.y})`);
      }
      
      if (lineSegmentsIntersect(movementLine, wallLine)) {
        console.log(`[CollisionDetection] ❌ COLLISION! Movement blocked by wall ${wall.id}`);
        return true;
      }
    }
  }

  // Check intersection with objects
  if (mapData.mapData.objects && Array.isArray(mapData.mapData.objects)) {
    if (debug) {
      console.log(`[CollisionDetection] 📦 Checking ${mapData.mapData.objects.length} objects`);
    }
    
    for (let objectIndex = 0; objectIndex < mapData.mapData.objects.length; objectIndex++) {
      const object = mapData.mapData.objects[objectIndex];
      
      // Skip objects that don't block movement
      if (!object.blocksMovement) {
        if (debug) {
          console.log(`[CollisionDetection] Skipping object ${object.id}: doesn't block movement`);
        }
        continue;
      }
      
      // Check if movement line intersects with object polygon
      if (lineIntersectsPolygon(movementLine, object.bounds, object.position)) {
        console.log(`[CollisionDetection] ❌ COLLISION! Movement blocked by object ${object.id}`);
        return true;
      }
    }
  }

  if (debug) {
    console.log('[CollisionDetection] ✅ No collision detected, movement allowed');
  }
  return false; // No collision detected
}




/**
 * Check if two line segments intersect
 * Uses the parametric line intersection algorithm
 * @param line1 First line segment
 * @param line2 Second line segment
 * @returns true if the line segments intersect
 */
function lineSegmentsIntersect(line1: LineSegment, line2: LineSegment): boolean {
  const { start: p1, end: p2 } = line1;
  const { start: p3, end: p4 } = line2;

  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);


  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  // Check for collinear points on line segment
  if (d1 === 0 && onSegment(p3, p1, p4)) return true;
  if (d2 === 0 && onSegment(p3, p2, p4)) return true;
  if (d3 === 0 && onSegment(p1, p3, p2)) return true;
  if (d4 === 0 && onSegment(p1, p4, p2)) return true;

  return false;
}

/**
 * Find the direction of the ordered triplet (p, q, r)
 * @param p First point
 * @param q Second point  
 * @param r Third point
 * @returns Positive if counterclockwise, negative if clockwise, 0 if collinear
 */
function direction(p: Point, q: Point, r: Point): number {
  return (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
}

/**
 * Check if point q lies on line segment pr
 * @param p First point of segment
 * @param q Point to check
 * @param r Second point of segment
 * @returns true if q is on segment pr
 */
function onSegment(p: Point, q: Point, r: Point): boolean {
  return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
         q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
}

/**
 * Convert grid coordinates to world coordinates using map coordinate system
 * @param gridPos Grid position
 * @param coordinates Map coordinate system
 * @returns World position
 */
function gridToWorld(gridPos: Point, coordinates: WorldCoordinateSystem): Point {
  const gridSize = coordinates.worldUnitsPerGridCell;
  const offset = coordinates.offset;
  
  return {
    x: offset.x + (gridPos.x * gridSize),
    y: offset.y + (gridPos.y * gridSize)
  };
}

/**
 * Check if a line segment intersects with a polygon
 * @param line Line segment to test
 * @param polygon Array of polygon points (relative to position)
 * @param position Absolute position of the polygon
 * @returns true if line intersects with polygon
 */
function lineIntersectsPolygon(line: LineSegment, polygon: Point[], position: Point): boolean {
  // Convert polygon points from relative to absolute coordinates
  const absolutePolygon = polygon.map(point => ({
    x: position.x + point.x,
    y: position.y + point.y
  }));
  
  // Check intersection with each edge of the polygon
  for (let i = 0; i < absolutePolygon.length; i++) {
    const nextIndex = (i + 1) % absolutePolygon.length;
    const polygonEdge: LineSegment = {
      start: absolutePolygon[i],
      end: absolutePolygon[nextIndex]
    };
    
    if (lineSegmentsIntersect(line, polygonEdge)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get the center point of a grid cell
 * @param gridX Grid X coordinate
 * @param gridY Grid Y coordinate
 * @param gridSize Size of each grid cell in pixels
 * @returns Center point of the grid cell
 */
export function getGridCellCenter(gridX: number, gridY: number, gridSize: number): Point {
  return {
    x: gridX * gridSize + gridSize / 2,
    y: gridY * gridSize + gridSize / 2
  };
}

/**
 * Convert pixel coordinates to grid coordinates
 * @param x Pixel X coordinate
 * @param y Pixel Y coordinate
 * @param gridSize Size of each grid cell in pixels
 * @returns Grid coordinates
 */
export function pixelsToGrid(x: number, y: number, gridSize: number): Point {
  return {
    x: Math.floor(x / gridSize),
    y: Math.floor(y / gridSize)
  };
} 