import type { IActor } from './index.mjs';

/**
 * Plugin Component Contracts (Documentation)
 * 
 * This file documents the expected props and events for standard component types.
 * These serve as documentation and TypeScript type guidance rather than runtime
 * enforcement. Plugins should follow these patterns for compatibility with the
 * main application.
 * 
 * Note: These are conventions, not strict contracts. Runtime enforcement of
 * component interfaces is not practical in Vue.js. Instead, we rely on:
 * - TypeScript compile-time checking
 * - Integration testing  
 * - Clear documentation
 * - Developer discipline
 */

/**
 * Character Sheet Component Pattern
 * 
 * Component type: 'character-sheet'
 * Purpose: Display and edit character data
 * 
 * This documents the expected interface for character sheet components.
 * Plugins providing 'character-sheet' components should follow this pattern.
 */
export interface CharacterSheetContract {
  props: {
    /** Character data to display/edit */
    character: IActor;
    /** Whether the sheet is in read-only mode */
    readonly?: boolean;
  };
  
  events: {
    /** Emitted when character data is modified */
    'update:character': (character: IActor) => void;
    /** Emitted when character should be saved */
    'save': (character: IActor) => void;
    /** Emitted when sheet should be closed */
    'close': () => void;
    /** Emitted when dice should be rolled */
    'roll': (rollType: string, data: Record<string, unknown>) => void;
  };
}

/**
 * Character Creator Component Pattern
 * 
 * Component type: 'character-creator'  
 * Purpose: Multi-step character creation wizard
 * 
 * This documents the expected interface for character creator components.
 * Plugins providing 'character-creator' components should follow this pattern.
 */
export interface CharacterCreatorContract {
  props: {
    /** Basic character info (name, description, images) */
    basicInfo: {
      name: string;
      description?: string;
      avatarImage?: File | { url: string } | null;
      tokenImage?: File | { url: string } | null;
    };
    /** Whether the creator is in read-only mode */
    readonly?: boolean;
  };
  
  events: {
    /** Emitted when character data is complete and ready for creation */
    'character-ready': (documentData: {
      name: string;
      description?: string;
      pluginData: Record<string, unknown>;
      userData: Record<string, unknown>;
    }) => void;
    /** Emitted to return to basic info step */
    'back-to-basics': () => void;
    /** Emitted when step validation status changes */
    'validation-change': (isValid: boolean) => void;
  };
}

/**
 * Union type of all component patterns for type safety
 * 
 * These can be used as TypeScript utility types for plugin development
 * but are not enforced at runtime.
 */
export type ComponentPattern = 
  | CharacterSheetContract
  | CharacterCreatorContract;

/**
 * Helper type to extract props from a pattern
 * Useful for plugin developers to ensure type safety
 */
export type PatternProps<T extends ComponentPattern> = T['props'];

/**
 * Helper type to extract events as Vue defineEmits format
 * Useful for plugin developers to ensure type safety
 */
export type PatternEvents<T extends ComponentPattern> = {
  [K in keyof T['events']]: T['events'][K];
};

/**
 * Usage Example for Plugin Developers:
 * 
 * ```typescript
 * // In your plugin's character sheet component:
 * import type { PatternProps, PatternEvents, CharacterSheetContract } from '@dungeon-lab/shared';
 * 
 * const props = defineProps<PatternProps<CharacterSheetContract>>();
 * const emit = defineEmits<PatternEvents<CharacterSheetContract>>();
 * ```
 */