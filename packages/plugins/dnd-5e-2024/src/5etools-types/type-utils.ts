/**
 * Utility functions for safe type casting of 5etools JSON data
 */

/**
 * Type guard to check if an object has the expected structure
 */
export function isEtoolsData<T>(data: unknown, requiredFields: (keyof T)[]): data is T {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  const obj = data as Record<string, unknown>;
  return requiredFields.every(field => field in obj);
}

/**
 * Safe cast with runtime validation for 5etools JSON data
 */
export function safeEtoolsCast<T>(
  data: unknown, 
  requiredFields: (keyof T)[],
  context: string = 'unknown'
): T {
  if (!isEtoolsData<T>(data, requiredFields)) {
    console.warn(`Invalid 5etools data structure in ${context}:`, data);
    console.warn(`Expected fields: ${requiredFields.join(', ')}`);
  }
  
  return data as T;
}

/**
 * Extract array from 5etools data with safe fallback
 */
export function extractEtoolsArray<T>(
  data: unknown,
  arrayKey: string,
  context: string = 'unknown'
): T[] {
  if (!data || typeof data !== 'object') {
    console.warn(`No data provided for array extraction in ${context}`);
    return [];
  }
  
  const obj = data as Record<string, unknown>;
  const array = obj[arrayKey];
  
  if (!Array.isArray(array)) {
    console.warn(`Expected array for ${arrayKey} in ${context}, got:`, typeof array);
    return [];
  }
  
  return array as T[];
}

/**
 * Safe property access with type assertion
 */
export function getEtoolsProperty<T>(
  obj: unknown,
  key: string,
  defaultValue: T,
  _context: string = 'unknown'
): T {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }
  
  const record = obj as Record<string, unknown>;
  const value = record[key];
  
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  return value as T;
}