import polygonClipping from 'polygon-clipping';
import type { Polygon, MultiPolygon } from 'polygon-clipping';
import type { Vec2 } from '@dungeon-lab/shared/types/maps.mjs';

function vec2ToPoly(polygon: Vec2[]): Polygon {
  return [polygon.map((p) => [p.x, p.z])];
}

function ringToVec2(ring: [number, number][]): Vec2[] {
  return ring.map(([x, z]) => ({ x, z }));
}

/**
 * Union multiple polygons into one or more result polygons.
 */
export function unionPolygons(polygons: Vec2[][]): Vec2[][] {
  if (polygons.length === 0) return [];
  if (polygons.length === 1) return [polygons[0]];

  const polys: Polygon[] = polygons.map(vec2ToPoly);
  let result: MultiPolygon = [polys[0]];
  for (let i = 1; i < polys.length; i++) {
    result = polygonClipping.union(result as MultiPolygon, polys[i]);
  }
  return result.map((poly) => ringToVec2(poly[0]));
}

/**
 * Intersect two sets of polygons.
 */
export function intersectPolygons(a: Vec2[][], b: Vec2[][]): Vec2[][] {
  if (a.length === 0 || b.length === 0) return [];

  const multiA: MultiPolygon = a.map(vec2ToPoly);
  const multiB: MultiPolygon = b.map(vec2ToPoly);

  const result = polygonClipping.intersection(multiA, multiB);
  return result.map((poly) => ringToVec2(poly[0]));
}

/**
 * Build a circular polygon approximation centered at a point.
 */
export function circlePolygon(
  center: Vec2,
  radius: number,
  sides: number = 64
): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (2 * Math.PI * i) / sides;
    points.push({
      x: center.x + radius * Math.cos(a),
      z: center.z + radius * Math.sin(a),
    });
  }
  return points;
}
