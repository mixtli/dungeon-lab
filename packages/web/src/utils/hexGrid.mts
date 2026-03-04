const SQRT3 = Math.sqrt(3);

/**
 * Snap a world-space (x, z) point to the nearest flat-top hex center.
 * cellSize = circumradius (center to vertex distance).
 */
export function snapToHexCenter(
  x: number,
  z: number,
  cellSize: number
): { x: number; z: number } {
  const colSpacing = cellSize * 1.5;
  const rowSpacing = cellSize * SQRT3;

  const col = Math.round(x / colSpacing);
  const zOffset = col % 2 !== 0 ? rowSpacing / 2 : 0;
  const row = Math.round((z - zOffset) / rowSpacing);

  let bestX = col * colSpacing;
  let bestZ = row * rowSpacing + zOffset;
  let bestDist = (x - bestX) ** 2 + (z - bestZ) ** 2;

  for (const dc of [-1, 1]) {
    const altCol = col + dc;
    const altZOffset = altCol % 2 !== 0 ? rowSpacing / 2 : 0;
    const altRow = Math.round((z - altZOffset) / rowSpacing);
    const altCx = altCol * colSpacing;
    const altCz = altRow * rowSpacing + altZOffset;
    const dist = (x - altCx) ** 2 + (z - altCz) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestX = altCx;
      bestZ = altCz;
    }
  }

  return { x: bestX, z: bestZ };
}

/**
 * Generate vertices for a single flat-top hexagon outline at origin.
 * Returns 6 line segments as Float32Array(36) for THREE.LineSegments.
 */
export function hexOutlineVertices(cellSize: number): Float32Array {
  const angles = [0, 60, 120, 180, 240, 300].map((d) => (d * Math.PI) / 180);
  const verts = new Float32Array(36);
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    const idx = i * 6;
    verts[idx + 0] = Math.cos(angles[i]) * cellSize;
    verts[idx + 1] = 0;
    verts[idx + 2] = Math.sin(angles[i]) * cellSize;
    verts[idx + 3] = Math.cos(angles[next]) * cellSize;
    verts[idx + 4] = 0;
    verts[idx + 5] = Math.sin(angles[next]) * cellSize;
  }
  return verts;
}

/**
 * Return all hex center positions tiling a rectangular area.
 */
export function hexCentersInArea(
  halfW: number,
  halfD: number,
  cellSize: number
): { x: number; z: number }[] {
  const colSpacing = cellSize * 1.5;
  const rowSpacing = cellSize * SQRT3;
  const centers: { x: number; z: number }[] = [];

  const minCol = Math.floor(-halfW / colSpacing) - 1;
  const maxCol = Math.ceil(halfW / colSpacing) + 1;
  const minRow = Math.floor(-halfD / rowSpacing) - 1;
  const maxRow = Math.ceil(halfD / rowSpacing) + 1;

  for (let col = minCol; col <= maxCol; col++) {
    const zOffset = col % 2 !== 0 ? rowSpacing / 2 : 0;
    for (let row = minRow; row <= maxRow; row++) {
      const cx = col * colSpacing;
      const cz = row * rowSpacing + zOffset;
      if (
        cx >= -halfW - cellSize &&
        cx <= halfW + cellSize &&
        cz >= -halfD - cellSize &&
        cz <= halfD + cellSize
      ) {
        centers.push({ x: cx, z: cz });
      }
    }
  }
  return centers;
}
