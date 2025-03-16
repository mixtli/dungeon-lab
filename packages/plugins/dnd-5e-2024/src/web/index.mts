import { IGameSystemPluginWeb, IPluginUIAssets } from '@dungeon-lab/shared/types/plugin.mjs';
import { WebPlugin } from '@dungeon-lab/shared/base/web.mjs';
import { validateActorData, validateItemData } from '../shared/validation.mjs';
import { dnd5e2024GameSystem } from '../shared/game-system.mjs';
import manifest from '../../manifest.json' with { type: 'json' };

// Define global Handlebars type
declare global {
  interface Window {
    Handlebars: any;
  }
}

/**
 * D&D 5e 2024 Web Plugin
 * 
 * This plugin implements the D&D 5e 2024 Edition game system for the web client.
 * It provides character sheets, item sheets, and validation functions.
 */
class DnD5e2024WebPlugin extends WebPlugin implements IGameSystemPluginWeb {
  public type = 'gameSystem' as const;
  public gameSystem = dnd5e2024GameSystem;

  constructor(config = manifest) {
    super({
      ...config,
      type: 'gameSystem',
      enabled: true
    });
    
    // Initialize UI assets during constructor
    this.loadAndRegisterUIAssets();
    
    console.log('D&D 5e 2024 Web Plugin initialized with self-contained assets');
  }

  /**
   * Load and register all UI assets for this plugin
   */
  private async loadAndRegisterUIAssets(): Promise<void> {
    try {
      // Import the helpers module first to ensure it's available for pre-registration
      const { registerHelpers } = await import('./ui/characterCreation/helpers.js');
      
      // Pre-register empty assets to make sure they exist
      // This ensures the registry knows about our assets right away
      this.registerUIAssets('characterCreation', {
        template: '', // Will be updated
        styles: '',  // Will be updated
        script: {
          init: () => () => {}, // Empty function that returns cleanup
          validateCharacter: () => ({ success: false, errors: [] }),
          // Include the registerHelpers function in the initial assets
          registerHelpers: (handlebars: any) => {
            console.log('Pre-registering D&D 5e character creation helpers');
            try {
              registerHelpers(handlebars);
            } catch (error) {
              console.error('Error pre-registering helpers:', error);
            }
          }
        },
        partials: {}
      });
      
      // Import the script module
      const characterCreationModule = await import('./ui/characterCreation/index.mjs');
      console.log('characterCreationModule', characterCreationModule);
      
      // Register helpers again just to be safe
      if (window.Handlebars && characterCreationModule.registerHelpers) {
        console.log('Re-registering D&D 5e character creation helpers');
        characterCreationModule.registerHelpers(window.Handlebars);
      }
      
      // Import template and styles (using ?raw query parameter for Vite)
      const templateModule = await import('./ui/characterCreation/template.hbs?raw');
      const stylesModule = await import('./ui/characterCreation/styles.css?raw');
      
      // Extract content from the imports (default export contains the raw text)
      const templateContent = templateModule.default;
      const stylesContent = stylesModule.default;
      
      console.log('templateContent loaded', templateContent.substring(0, 50) + '...');
      console.log('stylesContent loaded', stylesContent.substring(0, 50) + '...');
      
      // Update the assets with real content
      this.registerUIAssets('characterCreation', {
        template: templateContent,
        styles: stylesContent,
        script: characterCreationModule,
        partials: {} // We would add partials here if needed
      });
      
      console.log('D&D 5e 2024 UI assets loaded successfully');
    } catch (err) {
      console.error('Failed to load D&D 5e 2024 UI assets:', err);
      
      // If something went wrong, make sure we at least have fallback assets
      this.registerUIAssets('characterCreation', {
        template: '<div class="error">Failed to load character creation template</div>',
        styles: '/* Failed to load styles */',
        script: {
          init: (container: HTMLElement) => {
            container.innerHTML = '<div class="error">Failed to load character creation script</div>';
            return () => {}; // Empty cleanup function
          },
          validateCharacter: () => ({ success: false, errors: ['Script failed to load'] }),
          registerHelpers: () => {} // Empty registerHelpers function
        },
        partials: {}
      });
    }
  }

  /**
   * Get the appropriate actor sheet component for a given actor type
   * @param actorType The actor type
   * @returns The component name, or undefined if not found
   */
  getActorSheet(actorType: string): string | undefined {
    if (actorType === 'character') {
      return 'dnd5e2024-character-sheet';
    } else if (actorType === 'npc') {
      return 'dnd5e2024-npc-sheet';
    }
    return undefined;
  }

  /**
   * Get the appropriate item sheet component for a given item type
   * @param itemType The item type
   * @returns The component name, or undefined if not found
   */
  getItemSheet(itemType: string): string | undefined {
    if (itemType === 'weapon') {
      return 'dnd5e2024-weapon-sheet';
    } else if (itemType === 'spell') {
      return 'dnd5e2024-spell-sheet';
    }
    return undefined;
  }

  // Use actor and item data validation from shared code
  validateActorData = validateActorData;
  validateItemData = validateItemData;
}

// Export the plugin class
export default DnD5e2024WebPlugin; 