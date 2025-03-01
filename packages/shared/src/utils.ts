/**
 * Generate a random ID
 * @returns A random ID string
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Deep clone an object
 * @param obj The object to clone
 * @returns A deep clone of the object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if two objects are equal
 * @param obj1 The first object
 * @param obj2 The second object
 * @returns True if the objects are equal, false otherwise
 */
export function isEqual<T>(obj1: T, obj2: T): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

/**
 * Format a date as a string
 * @param date The date to format
 * @returns The formatted date string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Parse a date string
 * @param dateString The date string to parse
 * @returns The parsed date
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
} 