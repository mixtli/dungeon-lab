/**
 * Type declarations for Vite raw asset imports
 * This allows TypeScript to understand imports with ?raw query parameters
 */

declare module '*.hbs?raw' {
  const content: string;
  export default content;
}

declare module '*.css?raw' {
  const content: string;
  export default content;
} 