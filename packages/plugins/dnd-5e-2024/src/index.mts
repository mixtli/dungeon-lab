/**
 * D&D 5th Edition (2024) Plugin - Simplified Version
 * 
 * This plugin implements the basic D&D 5e 2024 character sheet using the new
 * simplified plugin architecture with manifest-based configuration.
 */

import type { GameSystemPlugin, ValidationResult } from '@dungeon-lab/shared/types/plugin-simple.mjs';
import type { PluginManifest } from '@dungeon-lab/shared/schemas/plugin-manifest.schema.mjs';
import type { Component } from 'vue';
import { validateCharacterData } from './character-validation.mjs';

// Import the full featured character sheet component
import DnD5eCharacterSheet from './components/character-sheet.vue';

// Import the character creator component
import DnD5eCharacterCreator from './components/character-creator.vue';

/**
 * D&D 5th Edition (2024) Plugin Implementation - Simplified Version
 */
export class DnD5e2024Plugin implements GameSystemPlugin {
  /** Plugin manifest containing all metadata and capabilities */
  readonly manifest: PluginManifest;
  
  constructor() {
    // Load manifest from the manifest.json file data
    // In a real implementation, this would be injected by the plugin loader
    this.manifest = {
      id: 'dnd-5e-2024',
      name: 'D&D 5th Edition (2024)',
      version: '2.0.0',
      description: 'Dungeons & Dragons 5th Edition (2024 Rules) plugin for character creation and management',
      author: 'Dungeon Lab Team',
      enabled: true,
      gameSystem: 'dnd-5e-2024',
      characterTypes: ['character', 'npc'],
      itemTypes: ['weapon', 'armor', 'consumable', 'tool'],
      supportedFeatures: [
        'character-creation',
        'character-validation', 
        'dice-rolling',
        'character-sheet'
      ],
      components: {
        'character-sheet': {
          id: 'dnd-5e-2024-character-sheet',
          name: 'D&D 5e Character Sheet',
          description: 'Interactive character sheet for D&D 5e characters',
          category: 'character',
          props: {
            character: { type: 'object', required: true },
            readonly: { type: 'boolean', default: false }
          },
          events: {
            'update:character': 'Emitted when character data changes',
            'save': 'Emitted when character should be saved',
            'roll': 'Emitted when dice should be rolled',
            'close': 'Emitted when character sheet should be closed'
          }
        },
        'character-creator': {
          id: 'dnd-5e-2024-character-creator',
          name: 'D&D 5e Character Creator',
          description: 'Multi-step character creation wizard for D&D 5e',
          category: 'character-creator',
          props: {
            basicInfo: { type: 'object', required: true },
            readonly: { type: 'boolean', default: false }
          },
          events: {
            'character-ready': 'Emitted when character data is complete and ready for creation',
            'back-to-basics': 'Emitted to return to basic info step',
            'validation-change': 'Emitted when step validation status changes'
          }
        }
      },
      mechanics: {
        dice: {
          id: 'dnd5e-dice',
          name: 'D&D 5e Dice System',
          description: 'Standard D&D 5e dice rolling mechanics',
          category: 'dice'
        }
      },
      validationSchema: {
        character: '@/types/dnd/character.mts',
        species: '@/types/dnd/species.mts',
        background: '@/types/dnd/background.mts',
        class: '@/types/dnd/character-class.mts'
      },
      entryPoint: './src/index.mts',
      dependencies: {
        '@dungeon-lab/shared': 'workspace:*'
      },
      devDependencies: {},
      license: 'MIT'
    };
  }
  
  /**
   * Get a Vue component by type
   */
  getComponent(type: string): Component | null {
    console.log(`[${this.manifest.id}] Getting component: ${type}`);
    
    switch (type) {
      case 'character-sheet':
        return DnD5eCharacterSheet;
      case 'character-creator':
        return DnD5eCharacterCreator;
      default:
        console.warn(`[${this.manifest.id}] Unknown component type: ${type}`);
        return null;
    }
  }
  
  /**
   * Validate data against game system rules
   */
  validate(type: string, data: unknown): ValidationResult {
    console.log(`[${this.manifest.id}] Validating ${type} data`);
    
    switch (type) {
      case 'character':
        return this.validateCharacterData(data);
      default:
        console.warn(`[${this.manifest.id}] Unknown validation type: ${type}`);
        return {
          success: false,
          errors: [`Unknown validation type: ${type}`]
        };
    }
  }
  
  /**
   * Plugin initialization
   */
  async onLoad(context?: any): Promise<void> {
    console.log(`[${this.manifest.id}] Loading D&D 5e 2024 Plugin v${this.manifest.version}`);
    if (context) {
      console.log(`[${this.manifest.id}] Plugin context provided - API access available`);
    }
    console.log(`[${this.manifest.id}] Plugin loaded successfully`);
  }
  
  /**
   * Plugin cleanup
   */
  async onUnload(): Promise<void> {
    console.log(`[${this.manifest.id}] Unloading D&D 5e 2024 Plugin`);
  }
  
  /**
   * Legacy validation method for backward compatibility
   * @deprecated Use validate('character', data) instead
   */
  validateCharacterData(data: unknown): ValidationResult {
    console.log(`[${this.manifest.id}] 🔍 PLUGIN VALIDATION METHOD CALLED`);
    console.log(`[${this.manifest.id}] Data structure:`, {
      hasSpecies: !!(data as any)?.species,
      speciesFormat: (data as any)?.species,
      hasBackground: !!(data as any)?.background,
      backgroundFormat: (data as any)?.background
    });
    
    const result = validateCharacterData(data);
    console.log(`[${this.manifest.id}] 🧪 Validation result:`, result);
    
    return result;
  }
}

// Export the plugin class (not instance)
// Registry will handle singleton instantiation
export default DnD5e2024Plugin;

// Export type mappings and utilities for server-side imports
export * from './types/foundry-mapping.mjs';

// Export validation functions if needed
export * from './types/validation.mjs';