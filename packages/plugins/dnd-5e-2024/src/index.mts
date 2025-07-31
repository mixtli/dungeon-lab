/**
 * D&D 5th Edition (2024) Plugin - Minimal Version
 * 
 * This plugin implements the basic D&D 5e 2024 character sheet using the new
 * plugin architecture with Vue 3 components and TypeScript.
 */

import type { GameSystemPlugin, PluginContext } from '@dungeon-lab/shared/types/plugin.mjs';
import type { ComponentRegistry } from '@dungeon-lab/shared/types/component-registry.mjs';
import type { MechanicsRegistry } from '@dungeon-lab/shared/types/mechanics-registry.mjs';

// Import the full featured character sheet component
import DnD5eCharacterSheet from './character-sheet.vue';

// Import the character creator component
import DnD5eCharacterCreator from './components/character-creator/DnD5eCharacterCreator.vue';

/**
 * D&D 5th Edition (2024) Plugin Implementation - Minimal Version
 */
export class DnD5e2024Plugin implements GameSystemPlugin {
  readonly id = 'dnd-5e-2024';
  readonly name = 'D&D 5th Edition (2024)';
  readonly version = '2.0.0';
  readonly description = 'Basic D&D 5th Edition (2024) character sheet';
  readonly author = 'Dungeon Lab';
  readonly gameSystem = 'dnd-5e-2024';
  readonly characterTypes = ['character', 'npc'];
  readonly itemTypes = ['weapon', 'armor', 'consumable', 'tool'];
  
  /**
   * Plugin initialization
   */
  async onLoad(_context: PluginContext): Promise<void> {
    console.log(`[${this.id}] Loading D&D 5e 2024 Plugin v${this.version}`);
    console.log(`[${this.id}] Plugin loaded successfully`);
  }
  
  /**
   * Plugin cleanup
   */
  async onUnload(): Promise<void> {
    console.log(`[${this.id}] Unloading D&D 5e 2024 Plugin`);
  }
  
  /**
   * Register Vue components
   */
  registerComponents(registry: ComponentRegistry): void {
    console.log(`[${this.id}] Registering components`);
    
    // Character sheet component - direct registration (no async)
    registry.register(
      'dnd-5e-2024-character-sheet',
      DnD5eCharacterSheet,
      {
        pluginId: this.id,
        name: 'D&D 5e Character Sheet',
        description: 'D&D 5e character sheet component',
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
        },
        hotReloadable: true
      }
    );
    
    // Character creator component
    registry.register(
      'dnd-5e-2024-character-creator',
      DnD5eCharacterCreator,
      {
        pluginId: this.id,
        name: 'D&D 5e Character Creator',
        description: 'D&D 5e character creation wizard component',
        category: 'character-creator',
        props: {
          basicInfo: { type: 'object', required: true },
          readonly: { type: 'boolean', default: false }
        },
        events: {
          'character-ready': 'Emitted when character data is complete and ready for creation',
          'back-to-basics': 'Emitted to return to basic info step',
          'validation-change': 'Emitted when step validation status changes'
        },
        hotReloadable: true
      }
    );
    
    console.log(`[${this.id}] Registered character sheet and character creator components`);
  }
  
  /**
   * Register game mechanics
   */
  registerMechanics(registry: MechanicsRegistry): void {
    console.log(`[${this.id}] Registering mechanics (none for minimal version)`);
    
    // Basic dice mechanic only
    const diceMechanic = {
      id: 'dnd5e-dice',
      name: 'D&D 5e Dice System',
      description: 'Basic dice rolling for D&D 5e',
      roll: (dice: string) => {
        const match = dice.match(/(\d+)?d(\d+)/);
        if (!match) return { total: 0, rolls: [], expression: dice, breakdown: dice };
        
        const count = parseInt(match[1] || '1');
        const sides = parseInt(match[2]);
        const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
        return { 
          total: rolls.reduce((a, b) => a + b, 0), 
          rolls, 
          expression: dice,
          breakdown: rolls.join(' + ')
        };
      }
    };
    
    registry.register(
      'dnd5e-dice',
      diceMechanic,
      {
        pluginId: this.id,
        name: 'D&D 5e Dice System',
        description: 'Basic dice rolling for D&D 5e',
        category: 'dice',
        version: '1.0.0'
      }
    );
    
    console.log(`[${this.id}] Registered basic dice mechanic`);
  }
}

// Export the plugin instance
export default new DnD5e2024Plugin();

// Export type mappings and utilities for server-side imports
export * from './types/foundry-mapping.mjs';

// Export validation functions if needed
export * from './types/validation.mjs';