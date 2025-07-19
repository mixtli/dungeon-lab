/**
 * Type declarations for Vite raw asset imports
 */

declare module '*.hbs' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: string;
  export default content;
}

// Add support for ?raw imports
declare module '*.hbs?raw' {
  const content: string;
  export default content;
}

declare module '*.css?raw' {
  const content: string;
  export default content;
} 