// Character Creation UI module for D&D 5e
import { PluginComponent } from '@dungeon-lab/shared/base/plugin-component.mjs';
import { IPluginAPI } from '@dungeon-lab/shared/types/plugin-api.mjs';
import { z } from 'zod';
import template from './template.hbs?raw';
import styles from './styles.css?raw';
import { registerHelpers } from './helpers.js';
import { setupFormHandlers, setupNavigation } from './script.js';
import { 
  characterCreationFormSchema, 
} from './schema.mjs';

// Import document cache
import { 
  getClass,
  getBackground,
  getSpecies
} from '../../document-cache.mjs';

// Import document helpers
import { registerDocumentHelpers } from '../../helpers/document-helpers.mjs';

/**
 * Character Creation Component for D&D 5e
 * Handles the creation of new characters with a form-based interface
 */
export class CharacterCreationComponent extends PluginComponent {
  private currentData: Record<string, any> = { class: {}, origin: {} };

  constructor(api: IPluginAPI) {
    super('characterCreation', 'D&D 5e Character Creation', api);
    console.log('CharacterCreationComponent constructor called');
  }

  protected getTemplate(): string {
    return template;
  }

  async onMount(container: HTMLElement): Promise<void> {
    console.log('CharacterCreationComponent mounting');
    await super.onMount(container);
    
    if (this.container) {
      console.log('Container exists, setting up form handlers');
      
      // Import and set up form handlers
      
      // Pass both container and component instance
      setupFormHandlers(this.container, this);
      setupNavigation(this.container);
      
      console.log('Form handlers set up');
    } else {
      console.error('Container element not found on mount');
    }
  }

  async onUpdate(data: Record<string, any>): Promise<void> {
    console.log('CharacterCreationComponent updating with data:', data);
    
    // Capture the name from initialData if present
    if (data.name && !this.currentData.name) {
      console.log(`Setting character name from initialData: ${data.name}`);
      this.currentData.name = data.name;
    }
    
    // When class name changes, fetch the class document if needed
    if (data.class && data.class.name && (!this.currentData.class || data.class.name !== this.currentData.class.name)) {
      console.log(`Class name changed to: ${data.class.name}`);
      try {
        // Get class document directly from document cache
        data.class.document = await getClass(data.class.name, this.api);
        console.log(`Updated class document for ${data.class.name}`);
      } catch (error) {
        console.error(`Error loading class document for ${data.class.name}:`, error);
      }
    }
    
    // When species name changes, update the species document from cache
    if (data.origin && data.origin.species && (!this.currentData.origin || data.origin.species !== this.currentData.origin.species)) {
      console.log(`Species name changed to: ${data.origin.species}`);
      try {
        // Get species document directly from document cache
        data.origin.speciesDocument = await getSpecies(data.origin.species, this.api);
        console.log(`Updated species document for ${data.origin.species}`);
      } catch (error) {
        console.error(`Error loading species document for ${data.origin.species}:`, error);
      }
    }
    
    // When background name changes, update the background document from cache
    if (data.origin && data.origin.background && (!this.currentData.origin || data.origin.background !== this.currentData.origin.background)) {
      console.log(`Background name changed to: ${data.origin.background}`);
      try {
        // Get background document directly from document cache
        data.origin.backgroundDocument = await getBackground(data.origin.background, this.api);
        console.log(`Updated background document for ${data.origin.background}`);
      } catch (error) {
        console.error(`Error loading background document for ${data.origin.background}:`, error);
      }
    }
    
    // Save the updated data to current data
    this.currentData = data;
    console.log('currentData after update:', this.currentData);
    
    // Pass the updated data to the render method
    await super.onUpdate(data);
  }

  protected getStyles(): string {
    return styles;
  }

  protected registerHelpers(): void {
    super.registerHelpers();
    
    // Register standard helpers
    registerHelpers(this.handlebars);
    
    // Register document helpers for the cache
    registerDocumentHelpers(this.handlebars);
  }

  /**
   * Validates form data against the character creation schema
   */
  validateForm(data: unknown): z.SafeParseReturnType<unknown, unknown> {
    return characterCreationFormSchema.safeParse(data);
  }

  /**
   * Translates form data into the full character schema format
   */
  translateFormData(formData: z.infer<typeof characterCreationFormSchema>): Record<string, unknown> {
    return {
      classes: [{
        name: formData.class.name,
        level: 1,
        hitDiceType: formData.class.document.hitDie
      }],
      // Other fields will be added in subsequent steps
    };
  }
}

// Export the component class
export default CharacterCreationComponent;

