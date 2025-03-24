import { describe, it, expect } from 'vitest';

describe('Web Package Tests', () => {
  it('should pass a simple test', () => {
    expect(true).toBe(true);
  });

  it('should correctly add two numbers', () => {
    expect(1 + 1).toBe(2);
  });

  it('should correctly handle string concatenation', () => {
    expect('hello' + ' world').toBe('hello world');
  });
}); 