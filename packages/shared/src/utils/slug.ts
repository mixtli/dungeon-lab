/**
 * Utility functions for generating and handling slugs
 */

/**
 * Generate a URL-friendly slug from a name
 * @param name - The name to convert to a slug
 * @returns A lowercase, hyphenated slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Trim hyphens from start and end
    .substring(0, 255); // Ensure max length
}

/**
 * Validate if a string is a valid slug
 * @param slug - The string to validate
 * @returns True if valid slug format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0 && slug.length <= 255;
}

/**
 * Ensure a slug is unique by appending a number if needed
 * @param baseSlug - The base slug to make unique
 * @param existingSlugs - Set of existing slugs to check against
 * @returns A unique slug
 */
export function ensureUniqueSlug(baseSlug: string, existingSlugs: Set<string>): string {
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;
  
  while (existingSlugs.has(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  return uniqueSlug;
}