/**
 * Utilities for converting shapes to polygon representations
 * Used for unified collision detection and lighting systems
 */

import { coordinateSchema } from '../schemas/map.schema.mjs';
import { z } from 'zod';

/**
 * Coordinate point type
 */
type Coordinate = z.infer<typeof coordinateSchema>;

/**
 * Configuration for shape-to-polygon conversion
 */
export interface ConversionOptions {
  /** Number of points for circular approximations (6-64) */
  precision?: number;
}

/**
 * Convert a circle to a polygon approximation
 * @param center Center point of the circle
 * @param radius Radius in world units
 * @param options Conversion options
 * @returns Array of polygon points relative to center
 */
export function circleToPolygon(
  center: Coordinate,
  radius: number,
  options: ConversionOptions = {}
): Coordinate[] {
  const precision = Math.max(6, Math.min(64, options.precision ?? 16));
  const points: Coordinate[] = [];
  
  for (let i = 0; i < precision; i++) {
    const angle = (i * 2 * Math.PI) / precision;
    points.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    });
  }
  
  return points;
}

/**
 * Convert a rectangle to a polygon (4 points)
 * @param width Width in world units
 * @param height Height in world units
 * @returns Array of 4 polygon points relative to top-left corner
 */
export function rectangleToPolygon(
  width: number,
  height: number
): Coordinate[] {
  return [
    { x: 0, y: 0 },           // Top-left
    { x: width, y: 0 },       // Top-right
    { x: width, y: height },  // Bottom-right
    { x: 0, y: height }       // Bottom-left
  ];
}

/**
 * Convert an ellipse to a polygon approximation
 * @param radiusX Horizontal radius in world units
 * @param radiusY Vertical radius in world units
 * @param options Conversion options
 * @returns Array of polygon points relative to center
 */
export function ellipseToPolygon(
  radiusX: number,
  radiusY: number,
  options: ConversionOptions = {}
): Coordinate[] {
  const precision = Math.max(6, Math.min(64, options.precision ?? 16));
  const points: Coordinate[] = [];
  
  for (let i = 0; i < precision; i++) {
    const angle = (i * 2 * Math.PI) / precision;
    points.push({
      x: radiusX * Math.cos(angle),
      y: radiusY * Math.sin(angle)
    });
  }
  
  return points;
}

/**
 * Shape type discriminated union for conversion
 */
export type Shape = 
  | { type: 'circle'; radius: number }
  | { type: 'rectangle'; width: number; height: number }
  | { type: 'ellipse'; radiusX: number; radiusY: number }
  | { type: 'polygon'; points: Coordinate[] };

/**
 * Convert any shape to a polygon representation
 * @param shape Shape definition
 * @param options Conversion options
 * @returns Polygon points and metadata about the conversion
 */
export function shapeToPolygon(
  shape: Shape,
  options: ConversionOptions = {}
): {
  points: Coordinate[];
  originalShape: Shape;
  precision?: number;
} {
  switch (shape.type) {
    case 'circle':
      return {
        points: circleToPolygon({ x: 0, y: 0 }, shape.radius, options),
        originalShape: shape,
        precision: options.precision ?? 16
      };
      
    case 'rectangle':
      return {
        points: rectangleToPolygon(shape.width, shape.height),
        originalShape: shape,
        precision: undefined // Rectangles don't use precision
      };
      
    case 'ellipse':
      return {
        points: ellipseToPolygon(shape.radiusX, shape.radiusY, options),
        originalShape: shape,
        precision: options.precision ?? 16
      };
      
    case 'polygon':
      return {
        points: [...shape.points], // Copy the array
        originalShape: shape,
        precision: undefined // Already a polygon
      };
      
    default: {
      const _exhaustive: never = shape;
      throw new Error(`Unknown shape type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/**
 * Get recommended precision based on shape size
 * Larger shapes get more precision for smoother curves
 * @param shape Shape definition
 * @returns Recommended precision (6-32)
 */
export function getRecommendedPrecision(shape: Shape): number {
  switch (shape.type) {
    case 'circle': {
      const circumference = 2 * Math.PI * shape.radius;
      // Aim for roughly 5-10 world units per segment
      const segments = Math.round(circumference / 7.5);
      return Math.max(6, Math.min(32, segments));
    }
    
    case 'ellipse': {
      // Use average radius for estimation
      const avgRadius = (shape.radiusX + shape.radiusY) / 2;
      const circumference = 2 * Math.PI * avgRadius;
      const segments = Math.round(circumference / 7.5);
      return Math.max(6, Math.min(32, segments));
    }
    
    case 'rectangle':
    case 'polygon':
      return 16; // Default, not used for these shapes
      
    default:
      return 16;
  }
}