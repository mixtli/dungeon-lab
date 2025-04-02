import { CharacterCreationState } from './index.mts';

// Generic template type declarations
declare module '*.hbs?raw' {
  const template: string;
  export default template;
}

declare module '*.hbs' {
  const content: <T = any>(context: T) => string;
  export default content;
}

// Template-specific type for this character creation template
declare module './template.hbs' {
  const content: (context: CharacterCreationState) => string;
  export default content;
}
