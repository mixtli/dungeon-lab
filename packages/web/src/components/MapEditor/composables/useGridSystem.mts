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
      x: Math.round(point.x / config.size) * config.size,
      y: Math.round(point.y / config.size) * config.size
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
      const x = Math.round(points[i] / config.size) * config.size;
      const y = Math.round(points[i + 1] / config.size) * config.size;
      result.push(x, y);
    }

    return result;
  };

  /**
   * Convert from grid coordinates to pixel coordinates
   */
  const gridToPixel = (gridCoord: Point): Point => {
    return {
      x: gridCoord.x * config.size,
      y: gridCoord.y * config.size
    };
  };

  /**
   * Convert from pixel coordinates to grid coordinates
   */
  const pixelToGrid = (pixelCoord: Point): Point => {
    return {
      x: pixelCoord.x / config.size,
      y: pixelCoord.y / config.size
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
   * Set grid size
   */
  const setGridSize = (size: number) => {
    config.size = size;
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
   * Calculate grid line positions for rendering
   * This helps optimize grid rendering by only drawing visible lines
   */
  const getGridLines = (width: number, height: number, offsetX: number, offsetY: number) => {
    const result = {
      vertical: [] as number[],
      horizontal: [] as number[]
    };

    if (!config.visible) return result;

    // Calculate grid lines that are visible in the viewport
    const startX = Math.floor(offsetX / config.size) * config.size;
    const startY = Math.floor(offsetY / config.size) * config.size;
    const endX = offsetX + width;
    const endY = offsetY + height;

    // Vertical lines
    for (let x = startX; x <= endX; x += config.size) {
      result.vertical.push(x);
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += config.size) {
      result.horizontal.push(y);
    }

    return result;
  };

  return {
    gridLayerConfig,
    snapToGrid,
    snapPointsToGrid,
    gridToPixel,
    pixelToGrid,
    toggleGridVisibility,
    toggleGridSnapping,
    setGridSize,
    setGridColor,
    setGridOpacity,
    getGridLines
  };
}
