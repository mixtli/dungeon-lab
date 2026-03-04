import type { Vec2, WallElement, PortalElement } from '@dungeon-lab/shared/types/maps.mjs';

export interface BlockingSegment {
  start: Vec2;
  end: Vec2;
  blockLevel: 'full' | 'half';
}

export interface VisibilityResult {
  fullVisible: Vec2[];
  halfVisible: Vec2[];
}

/**
 * Standard parametric ray-segment intersection.
 * Returns t parameter (distance along ray) or null if no intersection.
 */
export function raySegmentIntersect(
  origin: Vec2,
  dir: Vec2,
  segStart: Vec2,
  segEnd: Vec2
): number | null {
  const dx = segEnd.x - segStart.x;
  const dz = segEnd.z - segStart.z;

  const denom = dir.x * dz - dir.z * dx;
  if (Math.abs(denom) < 1e-10) return null;

  const t =
    ((segStart.x - origin.x) * dz - (segStart.z - origin.z) * dx) / denom;
  const u =
    ((segStart.x - origin.x) * dir.z - (segStart.z - origin.z) * dir.x) /
    denom;

  if (t > 1e-6 && u >= 0 && u <= 1) {
    return t;
  }
  return null;
}

function lerp2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

/**
 * Convert walls + open portals into blocking segments.
 * @param blockProperty - Which wall property to use: 'blockVision' or 'blockLight'
 */
export function getBlockingSegments(
  walls: WallElement[],
  portals: PortalElement[],
  blockProperty: 'blockVision' | 'blockLight' = 'blockVision'
): BlockingSegment[] {
  const result: BlockingSegment[] = [];

  for (const wall of walls) {
    const level = wall[blockProperty];
    if (level === 'none') continue;

    const openPortals = portals.filter(
      (p) => p.wallId === wall.id && p.state === 'open'
    );

    if (openPortals.length === 0) {
      result.push({ start: wall.start, end: wall.end, blockLevel: level });
      continue;
    }

    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    const wallLength = Math.sqrt(dx * dx + dz * dz);
    if (wallLength < 1e-6) continue;

    const gaps = openPortals
      .map((p) => {
        const halfW = p.width / wallLength / 2;
        return {
          from: Math.max(0, p.position - halfW),
          to: Math.min(1, p.position + halfW),
        };
      })
      .sort((a, b) => a.from - b.from);

    const merged: { from: number; to: number }[] = [];
    for (const gap of gaps) {
      const last = merged[merged.length - 1];
      if (last && gap.from <= last.to) {
        last.to = Math.max(last.to, gap.to);
      } else {
        merged.push({ ...gap });
      }
    }

    let cursor = 0;
    for (const gap of merged) {
      if (gap.from > cursor + 1e-6) {
        result.push({
          start: lerp2(wall.start, wall.end, cursor),
          end: lerp2(wall.start, wall.end, gap.from),
          blockLevel: level,
        });
      }
      cursor = gap.to;
    }
    if (cursor < 1 - 1e-6) {
      result.push({
        start: lerp2(wall.start, wall.end, cursor),
        end: wall.end,
        blockLevel: level,
      });
    }
  }

  return result;
}

function buildBoundaryCircle(
  origin: Vec2,
  radius: number,
  sides: number = 64
): BlockingSegment[] {
  const segments: BlockingSegment[] = [];
  for (let i = 0; i < sides; i++) {
    const a1 = (2 * Math.PI * i) / sides;
    const a2 = (2 * Math.PI * (i + 1)) / sides;
    segments.push({
      start: {
        x: origin.x + radius * Math.cos(a1),
        z: origin.z + radius * Math.sin(a1),
      },
      end: {
        x: origin.x + radius * Math.cos(a2),
        z: origin.z + radius * Math.sin(a2),
      },
      blockLevel: 'full',
    });
  }
  return segments;
}

function castVisibilityPolygon(
  origin: Vec2,
  segments: BlockingSegment[],
  boundarySegments: BlockingSegment[],
  maxRange: number
): Vec2[] {
  const allSegments = [...segments, ...boundarySegments];
  const EPSILON = 0.00001;

  const angles: number[] = [];
  for (const seg of allSegments) {
    for (const ep of [seg.start, seg.end]) {
      const a = Math.atan2(ep.z - origin.z, ep.x - origin.x);
      angles.push(a - EPSILON, a, a + EPSILON);
    }
  }

  angles.sort((a, b) => a - b);

  const polygon: Vec2[] = [];
  for (const angle of angles) {
    const dir: Vec2 = { x: Math.cos(angle), z: Math.sin(angle) };
    let minT = maxRange;

    for (const seg of allSegments) {
      const t = raySegmentIntersect(origin, dir, seg.start, seg.end);
      if (t !== null && t < minT) {
        minT = t;
      }
    }

    polygon.push({
      x: origin.x + dir.x * minT,
      z: origin.z + dir.z * minT,
    });
  }

  return polygon;
}

/**
 * Compute visibility polygons from a viewpoint.
 */
export function computeVisibilityPolygon(
  origin: Vec2,
  segments: BlockingSegment[],
  maxRange: number
): VisibilityResult {
  const boundarySegments = buildBoundaryCircle(origin, maxRange);

  const fullVisible = castVisibilityPolygon(
    origin,
    segments,
    boundarySegments,
    maxRange
  );

  const fullOnly = segments.filter((s) => s.blockLevel === 'full');
  const halfVisible = castVisibilityPolygon(
    origin,
    fullOnly,
    boundarySegments,
    maxRange
  );

  return { fullVisible, halfVisible };
}

/**
 * Compute illumination polygon for a single light source.
 */
export function computeLightPolygon(
  lightPos: Vec2,
  segments: BlockingSegment[],
  maxRange: number
): Vec2[] {
  const boundarySegments = buildBoundaryCircle(lightPos, maxRange);
  return castVisibilityPolygon(lightPos, segments, boundarySegments, maxRange);
}
