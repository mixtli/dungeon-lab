/**
 * D&D 5th Edition (2024) Plugin - New Architecture
 * 
 * This plugin implements the complete D&D 5e 2024 game system using the new
 * plugin architecture with Vue 3 components and TypeScript.
 */

import type { Plugin, PluginContext } from '@dungeon-lab/shared/types/plugin.mjs';
import type { ComponentRegistry } from '@dungeon-lab/shared/types/component-registry.mjs';
import type { MechanicsRegistry } from '@dungeon-lab/shared/types/mechanics-registry.mjs';

// Import components
import { DnD5eCharacterSheet } from './web/components/character-sheet.mjs';
import { DnD5eSpellList } from './web/components/spell-list.mjs';
import { DnD5eInventory } from './web/components/inventory.mjs';
import { DnD5eInitiativeTracker } from './web/components/initiative-tracker.mjs';

// Import mechanics
import { DnD5eDiceSystem } from './shared/mechanics/dice-system.mjs';
import { DnD5eInitiativeSystem } from './shared/mechanics/initiative-system.mjs';
import { DnD5eSpellSystem } from './shared/mechanics/spell-system.mjs';
import { DnD5eCombatSystem } from './shared/mechanics/combat-system.mjs';

// Import data
import { DnD5eGameSystemConfig } from './shared/data/game-system-config.mjs';

/**
 * D&D 5th Edition (2024) Plugin Implementation
 */
export class DnD5e2024Plugin implements Plugin {
  readonly id = 'dnd-5e-2024';
  readonly name = 'D&D 5th Edition (2024)';
  readonly version = '2.0.0';
  readonly description = 'Complete D&D 5th Edition (2024) implementation with new plugin architecture';
  readonly author = 'Dungeon Lab';
  readonly gameSystem = 'dnd5e-2024';
  
  private context?: PluginContext;
  
  /**
   * Plugin initialization
   */
  async onLoad(context: PluginContext): Promise<void> {
    this.context = context;
    
    console.log(`[${this.id}] Loading D&D 5e 2024 Plugin v${this.version}`);
    
    // Register game system configuration
    context.store.set('gameSystem:dnd5e-2024', DnD5eGameSystemConfig);
    
    // Set up event listeners
    this.setupEventListeners(context);
    
    // Initialize plugin data
    await this.initializeData(context);
    
    console.log(`[${this.id}] Plugin loaded successfully`);
  }
  
  /**
   * Plugin cleanup
   */
  async onUnload(): Promise<void> {
    console.log(`[${this.id}] Unloading D&D 5e 2024 Plugin`);
    
    // Clean up event listeners
    if (this.context) {
      this.cleanupEventListeners(this.context);
    }
    
    // Clear plugin data
    this.context?.store.clear();
    
    console.log(`[${this.id}] Plugin unloaded successfully`);
  }
  
  /**
   * Register Vue components
   */
  registerComponents(registry: ComponentRegistry): void {
    console.log(`[${this.id}] Registering components`);
    
    // Character sheet components
    registry.register({
      id: 'dnd5e-character-sheet',
      name: 'D&D 5e Character Sheet',
      description: 'Complete D&D 5e character sheet with all features',
      component: DnD5eCharacterSheet,
      category: 'character',
      gameSystem: 'dnd5e-2024',
      props: {
        character: { type: 'object', required: true },
        readonly: { type: 'boolean', default: false }
      },
      events: {
        'update:character': 'Emitted when character data changes',
        'save': 'Emitted when character should be saved',
        'roll': 'Emitted when dice should be rolled'
      }
    });
    
    // Spell list component
    registry.register({
      id: 'dnd5e-spell-list',
      name: 'D&D 5e Spell List',
      description: 'Spell list and management for D&D 5e characters',
      component: DnD5eSpellList,
      category: 'spells',
      gameSystem: 'dnd5e-2024',
      props: {
        character: { type: 'object', required: true },
        spells: { type: 'array', required: true }
      }
    });
    
    // Inventory component
    registry.register({
      id: 'dnd5e-inventory',
      name: 'D&D 5e Inventory',
      description: 'Equipment and inventory management',
      component: DnD5eInventory,
      category: 'inventory',
      gameSystem: 'dnd5e-2024',
      props: {
        character: { type: 'object', required: true },
        items: { type: 'array', required: true }
      }
    });
    
    // Initiative tracker component
    registry.register({
      id: 'dnd5e-initiative-tracker',
      name: 'D&D 5e Initiative Tracker',
      description: 'Combat initiative tracker with D&D 5e rules',
      component: DnD5eInitiativeTracker,
      category: 'combat',
      gameSystem: 'dnd5e-2024',
      props: {
        characters: { type: 'array', required: true },
        encounter: { type: 'object', required: true }
      }
    });
    
    console.log(`[${this.id}] Registered ${registry.getByPlugin(this.id).length} components`);
  }
  
  /**
   * Register game mechanics
   */
  registerMechanics(registry: MechanicsRegistry): void {
    console.log(`[${this.id}] Registering mechanics`);
    
    // Dice system
    registry.register({
      id: 'dnd5e-dice',
      name: 'D&D 5e Dice System',
      description: 'Standard D&D 5e dice rolling with advantage/disadvantage',
      mechanic: new DnD5eDiceSystem(),
      category: 'dice',
      gameSystem: 'dnd5e-2024'
    });
    
    // Initiative system
    registry.register({
      id: 'dnd5e-initiative',
      name: 'D&D 5e Initiative System',
      description: 'D&D 5e initiative rolling and tracking',
      mechanic: new DnD5eInitiativeSystem(),
      category: 'combat',
      gameSystem: 'dnd5e-2024'
    });
    
    // Spell system
    registry.register({
      id: 'dnd5e-spells',
      name: 'D&D 5e Spell System',
      description: 'D&D 5e spell casting and management',
      mechanic: new DnD5eSpellSystem(),
      category: 'magic',
      gameSystem: 'dnd5e-2024'
    });
    
    // Combat system
    registry.register({
      id: 'dnd5e-combat',
      name: 'D&D 5e Combat System',
      description: 'D&D 5e combat mechanics and actions',
      mechanic: new DnD5eCombatSystem(),
      category: 'combat',
      gameSystem: 'dnd5e-2024'
    });
    
    console.log(`[${this.id}] Registered ${registry.getByPlugin(this.id).length} mechanics`);
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(context: PluginContext): void {
    // Listen for character updates
    context.events.on('character:update', (characterData) => {
      console.log(`[${this.id}] Character updated:`, characterData.id);
    });
    
    // Listen for dice rolls
    context.events.on('dice:roll', (rollData) => {
      console.log(`[${this.id}] Dice rolled:`, rollData);
    });
    
    // Listen for spell casting
    context.events.on('spell:cast', (spellData) => {
      console.log(`[${this.id}] Spell cast:`, spellData);
    });
  }
  
  /**
   * Clean up event listeners
   */
  private cleanupEventListeners(context: PluginContext): void {
    context.events.off('character:update');
    context.events.off('dice:roll');
    context.events.off('spell:cast');
  }
  
  /**
   * Initialize plugin data
   */
  private async initializeData(context: PluginContext): Promise<void> {
    // Load D&D 5e data (classes, races, spells, etc.)
    // This would typically load from JSON files or API
    console.log(`[${this.id}] Initializing D&D 5e data`);
    
    // Set up data stores
    context.store.set('classes:dnd5e', await this.loadClasses());
    context.store.set('races:dnd5e', await this.loadRaces());
    context.store.set('spells:dnd5e', await this.loadSpells());
    context.store.set('items:dnd5e', await this.loadItems());
    context.store.set('backgrounds:dnd5e', await this.loadBackgrounds());
    
    console.log(`[${this.id}] Data initialization complete`);
  }
  
  /**
   * Load character classes
   */
  private async loadClasses(): Promise<unknown[]> {
    // This would load from data files
    return [
      { id: 'fighter', name: 'Fighter', hitDie: 10 },
      { id: 'wizard', name: 'Wizard', hitDie: 6 },
      { id: 'rogue', name: 'Rogue', hitDie: 8 },
      { id: 'cleric', name: 'Cleric', hitDie: 8 }
    ];
  }
  
  /**
   * Load character races
   */
  private async loadRaces(): Promise<unknown[]> {
    return [
      { id: 'human', name: 'Human', size: 'medium' },
      { id: 'elf', name: 'Elf', size: 'medium' },
      { id: 'dwarf', name: 'Dwarf', size: 'medium' },
      { id: 'halfling', name: 'Halfling', size: 'small' }
    ];
  }
  
  /**
   * Load spells
   */
  private async loadSpells(): Promise<unknown[]> {
    return [
      { id: 'magic-missile', name: 'Magic Missile', level: 1, school: 'evocation' },
      { id: 'fireball', name: 'Fireball', level: 3, school: 'evocation' },
      { id: 'cure-wounds', name: 'Cure Wounds', level: 1, school: 'evocation' }
    ];
  }
  
  /**
   * Load items
   */
  private async loadItems(): Promise<unknown[]> {
    return [
      { id: 'longsword', name: 'Longsword', type: 'weapon', damage: '1d8' },
      { id: 'chain-mail', name: 'Chain Mail', type: 'armor', ac: 16 },
      { id: 'healing-potion', name: 'Healing Potion', type: 'consumable' }
    ];
  }
  
  /**
   * Load backgrounds
   */
  private async loadBackgrounds(): Promise<unknown[]> {
    return [
      { id: 'acolyte', name: 'Acolyte', skills: ['insight', 'religion'] },
      { id: 'criminal', name: 'Criminal', skills: ['deception', 'stealth'] },
      { id: 'folk-hero', name: 'Folk Hero', skills: ['animal-handling', 'survival'] }
    ];
  }
}

// Export the plugin instance
export default new DnD5e2024Plugin();