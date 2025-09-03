import { computed } from 'vue';
import type { GridConfig, Point } from '../../../../../shared/src/types/mapEditor.mjs';

/**
 * Grid system for visualization and coordinate snapping
 */
export function useGridSystem(config: GridConfig) {
  // Computed grid properties for Konva
  const gridLayerConfig = computed(() => ({
    visible: config.visible
  }));

  /**
   * Snap a point to the grid
   */
  const snapToGrid = (point: Point): Point => {
    if (!config.snap) return { ...point };

    return {
      x: Math.round(point.x / config.worldUnitsPerCell) * config.worldUnitsPerCell,
      y: Math.round(point.y / config.worldUnitsPerCell) * config.worldUnitsPerCell
    };
  };

  /**
   * Snap an array of points to the grid
   * For use with wall points (flat array [x1, y1, x2, y2, ...])
   */
  const snapPointsToGrid = (points: number[]): number[] => {
    if (!config.snap) return [...points];

    const result: number[] = [];

    for (let i = 0; i < points.length; i += 2) {
      const x = Math.round(points[i] / config.worldUnitsPerCell) * config.worldUnitsPerCell;
      const y = Math.round(points[i + 1] / config.worldUnitsPerCell) * config.worldUnitsPerCell;
      result.push(x, y);
    }

    return result;
  };

  /**
   * Convert from grid coordinates to world coordinates
   */
  const gridToWorld = (gridCoord: Point, offset: Point = { x: 0, y: 0 }): Point => {
    return {
      x: gridCoord.x * config.worldUnitsPerCell + offset.x,
      y: gridCoord.y * config.worldUnitsPerCell + offset.y
    };
  };

  /**
   * Convert from world coordinates to grid coordinates
   */
  const worldToGrid = (worldCoord: Point, offset: Point = { x: 0, y: 0 }): Point => {
    return {
      x: Math.floor((worldCoord.x - offset.x) / config.worldUnitsPerCell),
      y: Math.floor((worldCoord.y - offset.y) / config.worldUnitsPerCell)
    };
  };

  /**
   * Toggle grid visibility
   */
  const toggleGridVisibility = () => {
    config.visible = !config.visible;
  };

  /**
   * Toggle grid snapping
   */
  const toggleGridSnapping = () => {
    config.snap = !config.snap;
  };

  /**
   * Set grid world units per cell
   */
  const setGridSize = (worldUnitsPerCell: number) => {
    config.worldUnitsPerCell = worldUnitsPerCell;
  };

  /**
   * Set grid color
   */
  const setGridColor = (color: string) => {
    config.color = color;
  };

  /**
   * Set grid opacity
   */
  const setGridOpacity = (opacity: number) => {
    config.opacity = Math.max(0, Math.min(1, opacity));
  };

  /**
   * Adjust grid size by a delta amount
   */
  const adjustGridSize = (delta: number) => {
    const newSize = Math.max(10, Math.min(200, config.worldUnitsPerCell + delta));
    config.worldUnitsPerCell = newSize;
    return newSize;
  };

  /**
   * Set grid offset for origin positioning
   */
  const setGridOffset = (offset: Point) => {
    // This will be handled at the MapMetadata level since offset is stored there
    // This function exists for consistency and future use
    return offset;
  };

  /**
   * Calculate grid line positions for rendering
   * This helps optimize grid rendering by only drawing visible lines
   */
  const getGridLines = (width: number, height: number, offsetX: number, offsetY: number, gridOffset: Point = { x: 0, y: 0 }) => {
    const result = {
      vertical: [] as number[],
      horizontal: [] as number[]
    };

    if (!config.visible) return result;

    // Calculate grid lines that are visible in the viewport
    const cellSize = config.worldUnitsPerCell;
    const startX = Math.floor((offsetX - gridOffset.x) / cellSize) * cellSize + gridOffset.x;
    const startY = Math.floor((offsetY - gridOffset.y) / cellSize) * cellSize + gridOffset.y;
    const endX = offsetX + width;
    const endY = offsetY + height;

    // Vertical lines
    for (let x = startX; x <= endX; x += cellSize) {
      result.vertical.push(x);
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += cellSize) {
      result.horizontal.push(y);
    }

    return result;
  };

  return {
    gridLayerConfig,
    snapToGrid,
    snapPointsToGrid,
    gridToWorld,
    worldToGrid,
    toggleGridVisibility,
    toggleGridSnapping,
    setGridSize,
    setGridColor,
    setGridOpacity,
    adjustGridSize,
    setGridOffset,
    getGridLines
  };
}
