import type { IMapResponse } from '@dungeon-lab/shared/types/api/index.mjs';

export interface Point {
  x: number;
  y: number;
}

export interface LineSegment {
  start: Point;
  end: Point;
}

/**
 * Check if a line segment intersects with any walls in the map
 *
 * TODO: Rewrite for 3D element-based map schema (walls use vec2 start/end with blockMovement as BlockingMode)
 */
export function checkWallCollision(
  currentGridPos: Point,
  targetGridPos: Point,
  mapData: IMapResponse | null,
  _debug: boolean = false
): boolean {
  if (!mapData?.mapData) {
    return false;
  }

  const elements = mapData.mapData.elements;
  if (!elements || !Array.isArray(elements)) {
    return false;
  }

  const gridSize = mapData.mapData.grid?.cellSize ?? 1;

  // Convert grid positions to world coordinates
  const currentWorld = { x: currentGridPos.x * gridSize, y: currentGridPos.y * gridSize };
  const targetWorld = { x: targetGridPos.x * gridSize, y: targetGridPos.y * gridSize };

  const movementLine: LineSegment = {
    start: currentWorld,
    end: targetWorld
  };

  // Check against wall elements
  for (const element of elements) {
    if (element.type !== 'wall') continue;
    if (element.blockMovement === 'none') continue;

    const wallLine: LineSegment = {
      start: { x: element.start.x, y: element.start.z },
      end: { x: element.end.x, y: element.end.z }
    };

    if (lineSegmentsIntersect(movementLine, wallLine)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if two line segments intersect
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

  if (d1 === 0 && onSegment(p3, p1, p4)) return true;
  if (d2 === 0 && onSegment(p3, p2, p4)) return true;
  if (d3 === 0 && onSegment(p1, p3, p2)) return true;
  if (d4 === 0 && onSegment(p1, p4, p2)) return true;

  return false;
}

function direction(p: Point, q: Point, r: Point): number {
  return (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
}

function onSegment(p: Point, q: Point, r: Point): boolean {
  return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
         q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
}

/**
 * Get the center point of a grid cell
 */
export function getGridCellCenter(gridX: number, gridY: number, gridSize: number): Point {
  return {
    x: gridX * gridSize + gridSize / 2,
    y: gridY * gridSize + gridSize / 2
  };
}

/**
 * Convert pixel coordinates to grid coordinates
 */
export function pixelsToGrid(x: number, y: number, gridSize: number): Point {
  return {
    x: Math.floor(x / gridSize),
    y: Math.floor(y / gridSize)
  };
}
