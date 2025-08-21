/**
 * Grid Distance Calculation Utility
 * 
 * Game-system agnostic utility for calculating distances between objects on a grid.
 * Returns distances in grid squares - individual game systems handle unit conversion.
 * 
 * Implements edge-to-edge distance measurement following standard grid-based game rules:
 * - Distance measured from closest edges, not centers
 * - Supports rectangular creatures/objects
 * - Handles diagonal movement options
 */

/**
 * Represents the bounds of an object on a grid
 */
export interface GridBounds {
  /** Grid X position (in grid squares, not pixels) */
  x: number;
  /** Grid Y position (in grid squares, not pixels) */
  y: number;
  /** Width in grid squares (default: 1) */
  width?: number;
  /** Height in grid squares (default: 1) */
  height?: number;
}

/**
 * Options for grid distance calculation
 */
export interface GridDistanceOptions {
  /** 
   * How to handle diagonal movement costs
   * - 'simple': All movement including diagonals costs 1 square (default)
   * - 'alternating': 1st diagonal=1, 2nd diagonal=2, 3rd=1, 4th=2, etc.
   */
  diagonalRule?: 'simple' | 'alternating';
}

/**
 * Calculate the shortest distance between two objects on a grid
 * 
 * Uses edge-to-edge measurement following standard grid game rules:
 * "Start counting squares from a square adjacent to one object and stop counting in the space of the other"
 * 
 * @param boundsA - First object's grid bounds
 * @param boundsB - Second object's grid bounds  
 * @param options - Distance calculation options
 * @returns Distance in grid squares
 * 
 * @example
 * // Simple case: two 1x1 objects
 * const distance = calculateGridDistance(
 *   { x: 0, y: 0 },
 *   { x: 2, y: 2 }
 * ); // returns 2 (diagonal distance)
 * 
 * @example
 * // Large creature: 2x2 object at (0,0) to 1x1 object at (3,0)
 * const distance = calculateGridDistance(
 *   { x: 0, y: 0, width: 2, height: 2 },
 *   { x: 3, y: 0, width: 1, height: 1 }
 * ); // returns 1 (edge-to-edge)
 */
export function calculateGridDistance(
  boundsA: GridBounds,
  boundsB: GridBounds,
  options: GridDistanceOptions = {}
): number {
  const { diagonalRule = 'simple' } = options;

  // Normalize bounds with defaults
  const a = {
    x: boundsA.x,
    y: boundsA.y,
    width: boundsA.width ?? 1,
    height: boundsA.height ?? 1
  };
  
  const b = {
    x: boundsB.x,
    y: boundsB.y,
    width: boundsB.width ?? 1,
    height: boundsB.height ?? 1
  };

  // Calculate the edges of each object
  const aLeft = a.x;
  const aRight = a.x + a.width - 1;
  const aTop = a.y;
  const aBottom = a.y + a.height - 1;
  
  const bLeft = b.x;
  const bRight = b.x + b.width - 1;
  const bTop = b.y;
  const bBottom = b.y + b.height - 1;

  // Check for overlap or adjacency
  const xOverlap = aLeft <= bRight && aRight >= bLeft;
  const yOverlap = aTop <= bBottom && aBottom >= bTop;
  
  // If objects overlap, distance is 0
  if (xOverlap && yOverlap) {
    return 0;
  }

  // Calculate minimum distances in each axis
  let xDistance = 0;
  let yDistance = 0;

  // X-axis distance (horizontal gap)
  if (aRight < bLeft) {
    xDistance = bLeft - aRight - 1; // Gap between edges
  } else if (bRight < aLeft) {
    xDistance = aLeft - bRight - 1; // Gap between edges
  }
  // If xOverlap is true, xDistance stays 0

  // Y-axis distance (vertical gap)  
  if (aBottom < bTop) {
    yDistance = bTop - aBottom - 1; // Gap between edges
  } else if (bBottom < aTop) {
    yDistance = aTop - bBottom - 1; // Gap between edges
  }
  // If yOverlap is true, yDistance stays 0

  // If either axis overlaps, use the other axis distance
  if (xOverlap) {
    return yDistance + 1; // +1 because we measure to adjacent square
  }
  if (yOverlap) {
    return xDistance + 1; // +1 because we measure to adjacent square
  }

  // Neither axis overlaps - diagonal movement required
  const straightDistance = Math.max(xDistance, yDistance) + 1;
  const diagonalSteps = Math.min(xDistance, yDistance) + 1;
  
  if (diagonalRule === 'simple') {
    // All movement costs 1 square
    return straightDistance;
  } else {
    // Alternating diagonal rule: 1,2,1,2...
    let totalCost = 0;
    
    // Add diagonal steps with alternating cost
    for (let i = 0; i < diagonalSteps; i++) {
      totalCost += (i % 2 === 0) ? 1 : 2;
    }
    
    // Add remaining straight steps
    const remainingStraight = straightDistance - diagonalSteps;
    totalCost += remainingStraight;
    
    return totalCost;
  }
}

/**
 * Check if two objects are adjacent on the grid (distance = 1)
 * 
 * @param boundsA - First object's grid bounds
 * @param boundsB - Second object's grid bounds
 * @returns True if objects are adjacent (1 square apart)
 */
export function areGridAdjacent(boundsA: GridBounds, boundsB: GridBounds): boolean {
  return calculateGridDistance(boundsA, boundsB) === 1;
}

/**
 * Check if two objects overlap on the grid (distance = 0)
 * 
 * @param boundsA - First object's grid bounds  
 * @param boundsB - Second object's grid bounds
 * @returns True if objects overlap or occupy the same space
 */
export function doGridOverlap(boundsA: GridBounds, boundsB: GridBounds): boolean {
  return calculateGridDistance(boundsA, boundsB) === 0;
}