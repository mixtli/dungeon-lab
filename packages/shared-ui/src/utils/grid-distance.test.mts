/**
 * Unit tests for grid distance calculation utility
 */

import { describe, it, expect } from 'vitest';
import { 
  calculateGridDistance, 
  areGridAdjacent, 
  doGridOverlap, 
  type GridBounds 
} from './grid-distance.mjs';

describe('calculateGridDistance', () => {
  describe('basic distance calculations', () => {
    it('should return 0 for same position', () => {
      const bounds = { x: 0, y: 0 };
      expect(calculateGridDistance(bounds, bounds)).toBe(0);
    });

    it('should return 1 for adjacent horizontal', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 1, y: 0 };
      expect(calculateGridDistance(a, b)).toBe(1);
    });

    it('should return 1 for adjacent vertical', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 0, y: 1 };
      expect(calculateGridDistance(a, b)).toBe(1);
    });

    it('should return 1 for adjacent diagonal (simple rule)', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 1, y: 1 };
      expect(calculateGridDistance(a, b)).toBe(1);
    });

    it('should handle straight line distances', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 3, y: 0 };
      expect(calculateGridDistance(a, b)).toBe(3);
    });

    it('should handle pure diagonal distances', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 2, y: 2 };
      expect(calculateGridDistance(a, b)).toBe(2); // Simple rule: max(dx, dy)
    });
  });

  describe('multi-square creatures', () => {
    it('should handle large creature (2x2) to medium (1x1)', () => {
      const large = { x: 0, y: 0, width: 2, height: 2 }; // occupies (0,0), (0,1), (1,0), (1,1)
      const medium = { x: 3, y: 0 }; // occupies (3,0)
      
      // Distance from edge of large (x=1) to medium (x=3) = 3-1-1 = 1 square gap + 1 = 2
      expect(calculateGridDistance(large, medium)).toBe(2);
    });

    it('should handle adjacent large creatures', () => {
      const largeA = { x: 0, y: 0, width: 2, height: 2 }; // occupies (0,0) to (1,1)
      const largeB = { x: 2, y: 0, width: 2, height: 2 }; // occupies (2,0) to (3,1)
      
      // Adjacent: edge of A at x=1, edge of B at x=2, distance = 1
      expect(calculateGridDistance(largeA, largeB)).toBe(1);
    });

    it('should handle overlapping creatures', () => {
      const a = { x: 0, y: 0, width: 2, height: 2 };
      const b = { x: 1, y: 1, width: 2, height: 2 };
      
      // They overlap at (1,1), so distance = 0
      expect(calculateGridDistance(a, b)).toBe(0);
    });

    it('should handle huge creature (3x3)', () => {
      const huge = { x: 0, y: 0, width: 3, height: 3 }; // occupies (0,0) to (2,2)
      const medium = { x: 4, y: 1 }; // occupies (4,1)
      
      // Closest edge of huge is x=2, medium at x=4, gap = 4-2-1 = 1, distance = 1+1 = 2
      expect(calculateGridDistance(huge, medium)).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle default width/height of 1', () => {
      const a = { x: 0, y: 0 }; // Should default to 1x1
      const b = { x: 0, y: 0, width: 1, height: 1 };
      expect(calculateGridDistance(a, b)).toBe(0);
    });

    it('should handle rectangular creatures', () => {
      const rect = { x: 0, y: 0, width: 3, height: 1 }; // 3x1 rectangle
      const point = { x: 0, y: 2 }; // 1x1 point
      
      // Vertical distance: rect bottom=0, point top=2, gap=1, distance=2
      expect(calculateGridDistance(rect, point)).toBe(2);
    });

    it('should handle negative coordinates', () => {
      const a = { x: -2, y: -2 };
      const b = { x: 0, y: 0 };
      expect(calculateGridDistance(a, b)).toBe(2);
    });
  });

  describe('diagonal rule options', () => {
    it('should use simple diagonal rule by default', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 2, y: 2 };
      expect(calculateGridDistance(a, b)).toBe(2);
    });

    it('should use simple diagonal rule when specified', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 2, y: 2 };
      expect(calculateGridDistance(a, b, { diagonalRule: 'simple' })).toBe(2);
    });

    it('should use alternating diagonal rule when specified', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 2, y: 2 };
      // Alternating: 1st diagonal=1, 2nd diagonal=2, total=3
      expect(calculateGridDistance(a, b, { diagonalRule: 'alternating' })).toBe(3);
    });

    it('should handle mixed diagonal + straight with alternating rule', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 3, y: 1 }; // 3 horizontal, 1 vertical
      
      // With alternating: 1 diagonal step (cost=1) + 2 straight steps (cost=2) = 3
      expect(calculateGridDistance(a, b, { diagonalRule: 'alternating' })).toBe(3);
    });
  });

  describe('axis overlap scenarios', () => {
    it('should handle horizontal alignment with vertical gap', () => {
      const a = { x: 0, y: 0, width: 2, height: 1 }; // (0,0) to (1,0)
      const b = { x: 1, y: 2, width: 1, height: 1 }; // (1,2)
      
      // X overlaps (both include x=1), Y gap = 2-0-1 = 1, distance = 1+1 = 2
      expect(calculateGridDistance(a, b)).toBe(2);
    });

    it('should handle vertical alignment with horizontal gap', () => {
      const a = { x: 0, y: 0, width: 1, height: 2 }; // (0,0) to (0,1)
      const b = { x: 2, y: 1, width: 1, height: 1 }; // (2,1)
      
      // Y overlaps (both include y=1), X gap = 2-0-1 = 1, distance = 1+1 = 2
      expect(calculateGridDistance(a, b)).toBe(2);
    });
  });
});

describe('areGridAdjacent', () => {
  it('should return true for adjacent squares', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 1, y: 0 };
    expect(areGridAdjacent(a, b)).toBe(true);
  });

  it('should return true for diagonally adjacent squares', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 1, y: 1 };
    expect(areGridAdjacent(a, b)).toBe(true);
  });

  it('should return false for non-adjacent squares', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 2, y: 0 };
    expect(areGridAdjacent(a, b)).toBe(false);
  });

  it('should return false for overlapping squares', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 0, y: 0 };
    expect(areGridAdjacent(a, b)).toBe(false);
  });
});

describe('doGridOverlap', () => {
  it('should return true for same position', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 0, y: 0 };
    expect(doGridOverlap(a, b)).toBe(true);
  });

  it('should return true for partially overlapping rectangles', () => {
    const a = { x: 0, y: 0, width: 2, height: 2 };
    const b = { x: 1, y: 1, width: 2, height: 2 };
    expect(doGridOverlap(a, b)).toBe(true);
  });

  it('should return false for adjacent but non-overlapping', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 1, y: 0 };
    expect(doGridOverlap(a, b)).toBe(false);
  });

  it('should return false for distant objects', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 5, y: 5 };
    expect(doGridOverlap(a, b)).toBe(false);
  });
});

// Additional edge case tests
describe('complex scenarios', () => {
  it('should handle a realistic D&D combat scenario', () => {
    // Medium fighter at (0,0) vs Large dragon at (5,5) with 2x2 size
    const fighter = { x: 0, y: 0 };
    const dragon = { x: 5, y: 5, width: 2, height: 2 };
    
    // Fighter to closest edge of dragon: distance should be 5
    expect(calculateGridDistance(fighter, dragon)).toBe(5);
  });

  it('should handle creatures of different sizes adjacent', () => {
    // Medium (1x1) next to Huge (3x3)
    const medium = { x: 0, y: 0 };
    const huge = { x: 1, y: 0, width: 3, height: 3 };
    
    expect(calculateGridDistance(medium, huge)).toBe(1);
    expect(areGridAdjacent(medium, huge)).toBe(true);
  });
});