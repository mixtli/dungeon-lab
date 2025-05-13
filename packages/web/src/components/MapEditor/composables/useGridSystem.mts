import { computed, reactive } from 'vue';
import type { GridConfig, Point } from '../../../../../shared/src/types/mapEditor.mjs';

/**
 * Grid system for visualization and coordinate snapping
 */
export function useGridSystem(initialConfig?: Partial<GridConfig>) {
  // Grid configuration with defaults
  const gridConfig = reactive<GridConfig>({
    visible: true,
    size: 50,
    color: 'rgba(0, 0, 0, 0.2)',
    snap: true,
    opacity: 0.5,
    ...(initialConfig || {})
  });

  // Computed grid properties for Konva
  const gridLayerConfig = computed(() => ({
    visible: gridConfig.visible
  }));

  /**
   * Snap a point to the grid
   */
  const snapToGrid = (point: Point): Point => {
    if (!gridConfig.snap) return { ...point };

    return {
      x: Math.round(point.x / gridConfig.size) * gridConfig.size,
      y: Math.round(point.y / gridConfig.size) * gridConfig.size
    };
  };

  /**
   * Snap an array of points to the grid
   * For use with wall points (flat array [x1, y1, x2, y2, ...])
   */
  const snapPointsToGrid = (points: number[]): number[] => {
    if (!gridConfig.snap) return [...points];

    const result: number[] = [];

    for (let i = 0; i < points.length; i += 2) {
      const x = Math.round(points[i] / gridConfig.size) * gridConfig.size;
      const y = Math.round(points[i + 1] / gridConfig.size) * gridConfig.size;
      result.push(x, y);
    }

    return result;
  };

  /**
   * Convert from grid coordinates to pixel coordinates
   */
  const gridToPixel = (gridCoord: Point): Point => {
    return {
      x: gridCoord.x * gridConfig.size,
      y: gridCoord.y * gridConfig.size
    };
  };

  /**
   * Convert from pixel coordinates to grid coordinates
   */
  const pixelToGrid = (pixelCoord: Point): Point => {
    return {
      x: pixelCoord.x / gridConfig.size,
      y: pixelCoord.y / gridConfig.size
    };
  };

  /**
   * Toggle grid visibility
   */
  const toggleGridVisibility = () => {
    gridConfig.visible = !gridConfig.visible;
  };

  /**
   * Toggle grid snapping
   */
  const toggleGridSnapping = () => {
    gridConfig.snap = !gridConfig.snap;
  };

  /**
   * Set grid size
   */
  const setGridSize = (size: number) => {
    gridConfig.size = size;
  };

  /**
   * Set grid color
   */
  const setGridColor = (color: string) => {
    gridConfig.color = color;
  };

  /**
   * Set grid opacity
   */
  const setGridOpacity = (opacity: number) => {
    gridConfig.opacity = Math.max(0, Math.min(1, opacity));
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

    if (!gridConfig.visible) return result;

    // Calculate grid lines that are visible in the viewport
    const startX = Math.floor(offsetX / gridConfig.size) * gridConfig.size;
    const startY = Math.floor(offsetY / gridConfig.size) * gridConfig.size;
    const endX = offsetX + width;
    const endY = offsetY + height;

    // Vertical lines
    for (let x = startX; x <= endX; x += gridConfig.size) {
      result.vertical.push(x);
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += gridConfig.size) {
      result.horizontal.push(y);
    }

    return result;
  };

  return {
    gridConfig,
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
