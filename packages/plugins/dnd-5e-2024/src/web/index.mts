import { IGameSystemPluginWeb, IPluginComponent, IPluginAPI } from '@dungeon-lab/shared/types/plugin.mjs';
import { WebPlugin } from '@dungeon-lab/shared/base/web.mjs';
import { validateActorData, validateItemData } from '../shared/validation.mjs';
import { dnd5e2024GameSystem } from '../shared/game-system.mjs';
import manifest from '../../manifest.json' with { type: 'json' };

// Import components
import CharacterCreationComponent from './ui/characterCreation/index.mjs';

/**
 * D&D 5e 2024 Web Plugin
 * 
 * This plugin implements the D&D 5e 2024 Edition game system for the web client.
 * It provides character sheets, item sheets, and validation functions.
 */
export class DnD5e2024WebPlugin extends WebPlugin implements IGameSystemPluginWeb {
  public type = 'gameSystem' as const;
  public gameSystem = dnd5e2024GameSystem;
  private readonly components = new Map<string, IPluginComponent>();

  constructor(private readonly api: IPluginAPI) {
    super({
      ...manifest,
      type: 'gameSystem',
      enabled: true
    });
    
    this.registerComponents();
    console.log('D&D 5e 2024 Web Plugin initialized');
  }

  /**
   * Register all available components
   */
  private registerComponents(): void {
    this.registerComponent(new CharacterCreationComponent(this.api));
    // Add more components here as they're implemented
    // this.registerComponent('characterSheet', new CharacterSheetComponent('characterSheet', this.api));
    // this.registerComponent('npcSheet', new NPCSheetComponent('npcSheet', this.api));
    // this.registerComponent('weaponSheet', new WeaponSheetComponent('weaponSheet', this.api));
    // this.registerComponent('spellSheet', new SpellSheetComponent('spellSheet', this.api));
  }

  async onLoad(): Promise<void> {
    await super.onLoad();
  }

  async onUnload(): Promise<void> {
    // Clean up components
    this.components.clear();
    await super.onUnload();
  }

  /**
   * Register a component with the plugin
   * @param id The component ID
   * @param component The component instance
   */
  private registerComponent(component: IPluginComponent): void {
    this.components.set(component.id, component);
  }

  /**
   * Load a component by ID
   * @param componentId The component ID
   * @returns The component instance or undefined if not found
   */
  loadComponent(componentId: string): IPluginComponent | undefined {
    return this.components.get(componentId);
  }

  /**
   * Get the appropriate actor sheet component for a given actor type
   * @param actorType The actor type
   * @returns The component context, or undefined if not found
   */
  public getActorSheetContext(actorType: string): string | undefined {
    switch (actorType) {
      case 'character':
        return 'characterSheet';
      case 'npc':
        return 'npcSheet';
      default:
        return undefined;
    }
  }

  /**
   * Get the appropriate item sheet component for a given item type
   * @param itemType The item type
   * @returns The component context, or undefined if not found
   */
  public getItemSheetContext(itemType: string): string | undefined {
    switch (itemType) {
      case 'weapon':
        return 'weaponSheet';
      case 'spell':
        return 'spellSheet';
      default:
        return undefined;
    }
  }

  // Use actor and item data validation from shared code
  validateActorData = validateActorData;
  validateItemData = validateItemData;
}

// Export the plugin class
export default DnD5e2024WebPlugin; 