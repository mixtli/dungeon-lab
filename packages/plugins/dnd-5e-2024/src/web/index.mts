import { IGameSystemPluginWeb, IPluginComponent, IPluginAPI } from '@dungeon-lab/shared/types/plugin.mjs';
import { WebPlugin } from '@dungeon-lab/shared/base/web.mjs';
import { validateActorData, validateItemData, validateVTTDocumentData } from '../shared/validation.mjs';
import manifest from '../../manifest.json' with { type: 'json' };
import { z } from 'zod';

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
  // Use validation from shared code
  validateActorData = validateActorData;
  validateItemData = validateItemData;
  validateVTTDocumentData = validateVTTDocumentData;

}

// Export the plugin class
export default DnD5e2024WebPlugin; 