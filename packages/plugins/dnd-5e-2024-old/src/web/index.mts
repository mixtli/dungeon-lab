import { IGameSystemPluginWeb, IPluginAPI } from '@dungeon-lab/shared/types/plugin.mjs';
import { WebPlugin } from '@dungeon-lab/shared/base/web.mjs';
import { validateActorData, validateItemData, validateVTTDocumentData } from '../shared/validation.mjs';
import manifest from '../../manifest.json' with { type: 'json' };

// Import document cache
import { initializeCache, preloadAllDocuments } from './document-cache.mjs';

// Import components
import CharacterCreationComponent from './ui/characterCreation/index.mjs';
import CharacterSheetComponent from './ui/characterSheet/index.mjs';

/**
 * D&D 5e 2024 Web Plugin
 * 
 * This plugin implements the D&D 5e 2024 Edition game system for the web client.
 * It provides character sheets, item sheets, and validation functions.
 */
class DnD5e2024WebPlugin extends WebPlugin implements IGameSystemPluginWeb {
  public type = 'gameSystem' as const;

  constructor(private readonly api: IPluginAPI) {
    super({
      ...manifest,
      type: 'gameSystem',
      enabled: true
    });
    
    this.initializePlugin();
  }

  /**
   * Initialize the plugin
   */
  private async initializePlugin(): Promise<void> {
    try {
      // Initialize the document cache with the plugin API
      initializeCache(this.api);
      // Register components
      this.registerComponents();
      
      // Preload all documents in the background
      this.preloadDocuments();
      
      console.log('D&D 5e 2024 Web Plugin initialized');
    } catch (error) {
      console.error('Failed to initialize D&D 5e 2024 Web Plugin:', error);
    }
  }

  /**
   * Preload all documents in the background
   */
  private preloadDocuments(): void {
    preloadAllDocuments()
      .then(() => console.log('D&D 5e 2024 documents preloaded successfully'))
      .catch((error: Error) => console.error('Error preloading D&D 5e 2024 documents:', error));
  }

  /**
   * Register all available components
   */
  private registerComponents(): void {
    this.registerComponent(new CharacterCreationComponent(this.api));
    this.registerComponent(new CharacterSheetComponent(this.api));
    // Add more components here as they're implemented
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