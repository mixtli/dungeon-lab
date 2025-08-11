import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';

export interface Point {
  x: number;
  y: number;
}

export interface LineSegment {
  start: Point;
  end: Point;
}

/**
 * Check if a line segment intersects with any wall polygons in the map
 * @param currentPos Current position of the token
 * @param targetPos Target position of the token  
 * @param mapData Map data containing wall polygons
 * @returns true if movement would intersect with a wall
 */
export function checkWallCollision(
  currentPos: Point,
  targetPos: Point,
  mapData: IMapResponse | null
): boolean {
  if (!mapData?.uvtt) {
    console.log('[CollisionDetection] No UVTT data available');
    return false; // No UVTT data, movement allowed
  }

  // Get pixels per grid for coordinate conversion
  const pixelsPerGrid = mapData.uvtt.resolution?.pixels_per_grid || 120; // Default to 120 if not specified
  
  // Convert pixel positions to grid units (UVTT wall data is in grid units)
  const currentGridPos: Point = {
    x: currentPos.x / pixelsPerGrid,
    y: currentPos.y / pixelsPerGrid
  };
  
  const targetGridPos: Point = {
    x: targetPos.x / pixelsPerGrid,
    y: targetPos.y / pixelsPerGrid
  };

  const movementLine: LineSegment = {
    start: currentGridPos,
    end: targetGridPos
  };


  // Check intersection with line_of_sight walls (polylines)
  if (mapData.uvtt.line_of_sight && Array.isArray(mapData.uvtt.line_of_sight)) {
    for (const wallPolyline of mapData.uvtt.line_of_sight) {
      if (Array.isArray(wallPolyline) && wallPolyline.length >= 2) {
        // Create line segments between consecutive points in the polyline
        for (let i = 0; i < wallPolyline.length - 1; i++) {
          const wallLine: LineSegment = {
            start: { x: wallPolyline[i].x, y: wallPolyline[i].y },
            end: { x: wallPolyline[i + 1].x, y: wallPolyline[i + 1].y }
          };
          if (lineSegmentsIntersect(movementLine, wallLine)) {
            console.log('[CollisionDetection] Movement blocked by line_of_sight wall');
            return true;
          }
        }
      }
    }
  }

  // Check intersection with objects_line_of_sight walls (polylines)
  if (mapData.uvtt.objects_line_of_sight && Array.isArray(mapData.uvtt.objects_line_of_sight)) {
    for (const wallPolyline of mapData.uvtt.objects_line_of_sight) {
      if (Array.isArray(wallPolyline) && wallPolyline.length >= 2) {
        // Create line segments between consecutive points in the polyline
        for (let i = 0; i < wallPolyline.length - 1; i++) {
          const wallLine: LineSegment = {
            start: { x: wallPolyline[i].x, y: wallPolyline[i].y },
            end: { x: wallPolyline[i + 1].x, y: wallPolyline[i + 1].y }
          };
          if (lineSegmentsIntersect(movementLine, wallLine)) {
            console.log('[CollisionDetection] Movement blocked by objects_line_of_sight wall');
            return true;
          }
        }
      }
    }
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