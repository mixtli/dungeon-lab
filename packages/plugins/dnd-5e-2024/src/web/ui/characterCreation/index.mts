// Character Creation UI module for D&D 5e
import { PluginComponent } from '@dungeon-lab/shared/base/plugin-component.mjs';
import { IPluginAPI } from '@dungeon-lab/shared/types/plugin-api.mjs';
import { z } from 'zod';
import template from './template.hbs?raw';
import styles from './styles.css?raw';
import { registerHelpers } from './helpers.js';
import { 
  characterCreationFormSchema, 
  type ClassDocument, 
  classDocumentSchema,
  type SpeciesDocument,
  speciesDocumentSchema,
  type BackgroundDocument,
  backgroundDocumentSchema
} from './schema.mjs';

// Import document cache
import { 
  getClassByName, 
  getBackgroundByName, 
  getSpeciesByName 
} from '../../document-cache.mjs';

// Import document helpers
import { registerDocumentHelpers } from '../../helpers/document-helpers.mjs';

/**
 * Character Creation Component for D&D 5e
 * Handles the creation of new characters with a form-based interface
 */
export class CharacterCreationComponent extends PluginComponent {
  private currentData: Record<string, any> = { class: {}, origin: {} };
  private classCache = new Map<string, ClassDocument>();
  private speciesCache = new Map<string, SpeciesDocument>();
  private backgroundCache = new Map<string, BackgroundDocument>();
  private currentStep: string = 'class'; // Indicates which step of character creation we're on
  private languages: string[] = [
    'abyssal', 'celestial', 'common', 'deep speech', 'draconic', 'dwarvish', 
    'elvish', 'giant', 'gnomish', 'goblin', 'halfling', 'infernal', 
    'orc', 'primordial', 'sylvan', 'undercommon'
  ];

  constructor(api: IPluginAPI) {
    super('characterCreation', 'D&D 5e Character Creation', api);
    console.log('CharacterCreationComponent constructor called');
    
    // Initialize document helpers early
    this.initializeDocumentCache();
  }

  /**
   * Initialize document cache as early as possible
   */
  private async initializeDocumentCache() {
    try {
      // Try to preload the document cache with classes
      const classData = await this.api.searchDocuments({
        pluginId: 'dnd-5e-2024',
        documentType: 'characterClass'
      }) as Record<string, unknown>[];
      
      console.log(`Preloaded ${classData.length} classes directly into component cache`);
      
      // Class cache for storing documents
      this.classCache = new Map<string, Record<string, unknown>>();
      
      // Transform and cache each class
      for (const rawData of classData) {
        try {
          console.log('Raw class data:', rawData);
          // Cast to Record<string, unknown> to satisfy TypeScript
          const transformedData = this.transformClassData(rawData as Record<string, unknown>);
          
          // Use the name from the transformed data
          const className = (transformedData.name as string || '').toLowerCase();
          if (className) {
            this.classCache.set(className, transformedData);
            console.log(`Directly cached class: ${className}`);
          } else {
            console.warn('Class document has no name:', transformedData);
          }
        } catch (error) {
          console.error('Error transforming class:', error);
        }
      }
    } catch (error) {
      console.error('Error preloading class data:', error);
    }
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
      const { setupFormHandlers, setupNavigation } = await import('./script.js');
      
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
    
    // We're no longer setting class.document here since we'll use the getClass helper in the template
    
    // Also capture the name from initialData if present
    if (data.name && !this.currentData.name) {
      console.log(`Setting character name from initialData: ${data.name}`);
      this.currentData.name = data.name;
    }
    
    // When species name changes, update the species document from cache
    if (data.origin && data.origin.species && (!this.currentData.origin || data.origin.species !== this.currentData.origin.species)) {
      console.log(`Species name changed to: ${data.origin.species}`);
      try {
        // Get species document from cache
        const speciesDocument = await this.getSpeciesDocument(data.origin.species);
        
        // Update data with document
        data.origin.speciesDocument = speciesDocument;
        console.log(`Updated species document for ${data.origin.species}:`, speciesDocument);
      } catch (error) {
        console.error(`Error loading species document for ${data.origin.species}:`, error);
      }
    }
    
    // When background name changes, update the background document from cache
    if (data.origin && data.origin.background && (!this.currentData.origin || data.origin.background !== this.currentData.origin.background)) {
      console.log(`Background name changed to: ${data.origin.background}`);
      try {
        // Get background document from cache
        const backgroundDocument = await this.getBackgroundDocument(data.origin.background);
        
        // Update data with document
        data.origin.backgroundDocument = backgroundDocument;
        console.log(`Updated background document for ${data.origin.background}:`, backgroundDocument);
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

  /**
   * Get a class document from the cache, transforming it if needed
   */
  private async getClassDocument(className: string): Promise<ClassDocument> {
    console.log(`Getting class document for ${className}`);
    
    // Check component cache first
    const cached = this.classCache.get(className);
    if (cached) {
      console.log(`Using component cache for class ${className}`);
      return cached;
    }
    
    try {
      // Try to get from document cache
      console.log(`Trying to get ${className} from document cache`);
      const docFromCache = getClassByName(className);
      console.log(`Document cache result for ${className}:`, docFromCache);
      
      if (docFromCache) {
        console.log(`Found class ${className} in document cache`);
        // Transform the data to match our schema
        const transformedData = this.transformClassData(docFromCache);
        console.log(`Transformed data for ${className}:`, transformedData);
        
        // Validate the transformed data
        const validation = classDocumentSchema.safeParse(transformedData);
        if (!validation.success) {
          console.error(`Validation failed for cached class ${className}:`, validation.error);
          throw new Error(`Invalid class document format: ${validation.error.message}`);
        }
        
        // Cache and return the validated document
        const classDoc = validation.data;
        console.log(`Cached document for ${className}:`, classDoc);
        this.classCache.set(className, classDoc);
        return classDoc;
      }
      
      // Fallback to API if not in document cache
      console.log(`Class ${className} not found in document cache, falling back to API`);
      return await this.fetchClassData(className);
    } catch (error) {
      console.error(`Error getting class document for ${className}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a species document from the cache, transforming it if needed
   */
  private async getSpeciesDocument(speciesName: string): Promise<SpeciesDocument> {
    console.log(`Getting species document for ${speciesName}`);
    
    // Check component cache first
    const cached = this.speciesCache.get(speciesName);
    if (cached) {
      console.log(`Using component cache for species ${speciesName}`);
      return cached;
    }
    
    try {
      // Try to get from document cache
      const docFromCache = getSpeciesByName(speciesName);
      if (docFromCache) {
        console.log(`Found species ${speciesName} in document cache`);
        // Transform the data to match our schema
        const transformedData = this.transformSpeciesData({ data: docFromCache });
        
        // Validate the transformed data
        const validation = speciesDocumentSchema.safeParse(transformedData);
        if (!validation.success) {
          console.error(`Validation failed for cached species ${speciesName}:`, validation.error);
          throw new Error(`Invalid species document format: ${validation.error.message}`);
        }
        
        // Cache and return the validated document
        const speciesDoc = validation.data;
        this.speciesCache.set(speciesName, speciesDoc);
        return speciesDoc;
      }
      
      // Fallback to API if not in document cache
      console.log(`Species ${speciesName} not found in document cache, falling back to API`);
      return await this.fetchSpeciesData(speciesName);
    } catch (error) {
      console.error(`Error getting species document for ${speciesName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a background document from the cache, transforming it if needed
   */
  private async getBackgroundDocument(backgroundName: string): Promise<BackgroundDocument> {
    console.log(`Getting background document for ${backgroundName}`);
    
    // Check component cache first
    const cached = this.backgroundCache.get(backgroundName);
    if (cached) {
      console.log(`Using component cache for background ${backgroundName}`);
      return cached;
    }
    
    try {
      // Try to get from document cache
      const docFromCache = getBackgroundByName(backgroundName);
      if (docFromCache) {
        console.log(`Found background ${backgroundName} in document cache`);
        // Transform the data to match our schema
        const transformedData = this.transformBackgroundData({ data: docFromCache });
        
        // Validate the transformed data
        const validation = backgroundDocumentSchema.safeParse(transformedData);
        if (!validation.success) {
          console.error(`Validation failed for cached background ${backgroundName}:`, validation.error);
          throw new Error(`Invalid background document format: ${validation.error.message}`);
        }
        
        // Cache and return the validated document
        const backgroundDoc = validation.data;
        this.backgroundCache.set(backgroundName, backgroundDoc);
        return backgroundDoc;
      }
      
      // Fallback to API if not in document cache
      console.log(`Background ${backgroundName} not found in document cache, falling back to API`);
      return await this.fetchBackgroundData(backgroundName);
    } catch (error) {
      console.error(`Error getting background document for ${backgroundName}:`, error);
      throw error;
    }
  }

  /**
   * Transform raw class data into the expected format
   * @param rawData Raw class data from the API
   * @returns Transformed class data
   */
  private transformClassData(rawData: Record<string, unknown>): Record<string, unknown> {
    console.log('Transforming class data:', rawData);
    
    // Create a copy to avoid mutating the original
    const vttDocument = { ...rawData };
    
    // Ensure basic fields exist
    if (!vttDocument.name) {
      console.warn('Class document missing name field');
    }
    
    // Make sure description is a string
    if (typeof vttDocument.description !== 'string') {
      console.warn(`Class ${vttDocument.name} has invalid description:`, vttDocument.description);
      vttDocument.description = `No description available for ${vttDocument.name}`;
    }
    
    // Ensure arrays exist
    const arrayFields = [
      'primaryAbility', 
      'savingThrowProficiencies', 
      'armorProficiencies', 
      'weaponProficiencies', 
      'toolProficiencies', 
      'skillOptions',
      'features',
      'equipmentChoices'
    ];
    
    arrayFields.forEach(field => {
      if (!Array.isArray(vttDocument[field])) {
        console.warn(`Class ${vttDocument.name} has invalid ${field} field:`, vttDocument[field]);
        vttDocument[field] = [];
      }
    });
    
    // Ensure hit die is a string
    if (typeof vttDocument.hitDie !== 'string') {
      console.warn(`Class ${vttDocument.name} has invalid hitDie:`, vttDocument.hitDie);
      vttDocument.hitDie = 'd8'; // Fallback
    }
    
    // Ensure skill choices is a number
    if (typeof vttDocument.skillChoices !== 'number') {
      console.warn(`Class ${vttDocument.name} has invalid skillChoices:`, vttDocument.skillChoices);
      vttDocument.skillChoices = 2; // Fallback
    }
    
    console.log('Transformed class data:', vttDocument);
    return vttDocument;
  }
  
  /**
   * Transforms species (race) document data from the server
   * @param document The raw document from the server
   * @returns Transformed document matching our schema
   */
  private transformSpeciesData(document: any): SpeciesDocument {
    const rawData = document.data;
    
    if (!rawData) {
      console.error('Document has no data property:', document);
      throw new Error('Invalid document format: missing data property');
    }
    
    console.log('Transforming species data:', rawData);
    
    // Extract the traits
    const traits: Array<{name: string, description: string}> = [];
    
    if (Array.isArray(rawData.traits)) {
      rawData.traits.forEach((trait: any) => {
        traits.push({
          name: trait.name || 'Unnamed Trait',
          description: trait.description || 'No description available'
        });
      });
    }
    
    // Format ability score increases for display
    const abilityScoreIncrease = this.formatAbilityScoreIncreases(rawData.abilityScoreIncrease || []);
    
    return {
      name: document.name || rawData.name || '',
      description: rawData.description || `A ${document.name || 'character'} species from D&D 5e.`,
      abilityScoreIncrease: abilityScoreIncrease,
      size: rawData.size || 'Medium',
      speed: rawData.speed || 30,
      traits: traits
    };
  }
  
  /**
   * Format ability score increases for display
   * @param increases The ability score increases
   * @returns Formatted string
   */
  private formatAbilityScoreIncreases(increases: Record<string, number>): string {
    if (!increases || typeof increases !== 'object') {
      return 'None';
    }
    
    const formatted = Object.entries(increases)
      .map(([ability, value]) => `${ability.charAt(0).toUpperCase() + ability.slice(1)} +${value}`)
      .join(', ');
    
    return formatted || 'None';
  }
  
  /**
   * Transform background document data from the server
   * @param document The raw document from the server
   * @returns Transformed document matching our schema
   */
  private transformBackgroundData(document: any): BackgroundDocument {
    const rawData = document.data;
    
    if (!rawData) {
      console.error('Document has no data property:', document);
      throw new Error('Invalid document format: missing data property');
    }
    
    console.log('Transforming background data:', rawData);
    
    // Extract ability boosts
    const abilityBoosts = rawData.abilityBoosts || ['strength', 'dexterity', 'constitution'];
    
    // Extract skill proficiencies and choices
    let skillProficiencies: string[] = [];
    let skillChoices: string[] = [];
    let skillChoiceCount = 0;
    
    if (rawData.skillProficiencies) {
      if (Array.isArray(rawData.skillProficiencies)) {
        skillProficiencies = rawData.skillProficiencies;
      } else if (typeof rawData.skillProficiencies === 'object') {
        // Handle choice format
        if (rawData.skillProficiencies.choose) {
          skillChoiceCount = rawData.skillProficiencies.choose.count || 0;
          skillChoices = rawData.skillProficiencies.choose.from || [];
        }
      }
    }
    
    // Extract tool proficiencies and choices
    let toolProficiencies: string[] = [];
    let toolChoices: string[] = [];
    let toolChoiceCount = 0;
    
    if (rawData.toolProficiencies) {
      if (Array.isArray(rawData.toolProficiencies)) {
        toolProficiencies = rawData.toolProficiencies;
      } else if (typeof rawData.toolProficiencies === 'object') {
        // Handle choice format
        if (rawData.toolProficiencies.choose) {
          toolChoiceCount = rawData.toolProficiencies.choose.count || 0;
          toolChoices = rawData.toolProficiencies.choose.from || [];
        }
      }
    }
    
    // Extract equipment
    const equipment = rawData.equipment ? {
      items: Array.isArray(rawData.equipment.items) ? rawData.equipment.items : [],
      gold: rawData.equipment.gold || 0
    } : undefined;
    
    // Extract feat
    const feat = rawData.feat ? {
      name: rawData.feat.name || 'Unnamed Feat',
      description: rawData.feat.description || 'No description available'
    } : undefined;
    
    return {
      name: document.name || rawData.name || '',
      description: rawData.description || `A ${document.name || 'character'} background from D&D 5e.`,
      abilityBoosts: abilityBoosts,
      skillProficiencies: skillProficiencies,
      skillChoices: skillChoices,
      skillChoiceCount: skillChoiceCount,
      toolProficiencies: toolProficiencies,
      toolChoices: toolChoices,
      toolChoiceCount: toolChoiceCount,
      equipment: equipment,
      feat: feat
    };
  }

  /**
   * Fetches class data from the server
   * @param className The name of the class to fetch
   * @returns The class document
   */
  private async fetchClassData(className: string): Promise<ClassDocument> {
    console.log(`Fetching class data for ${className}`);
    
    // Check cache first
    const cached = this.classCache.get(className);
    if (cached) {
      console.log(`Using cached data for ${className}`);
      return cached;
    }

    try {
      // Fetch from server using the searchDocuments method from the plugin API
      console.log(`Making API call to search for class ${className}`);
      
      const documents = await this.api.searchDocuments({
        pluginId: 'dnd-5e-2024',
        documentType: 'characterClass',
        name: className
      });
      
      console.log(`Received response for ${className}:`, documents);
      
      // The search endpoint returns an array of documents, we want the first match
      if (!documents || documents.length === 0) {
        throw new Error(`No class document found for ${className}`);
      }
      
      const rawData = documents[0];
      console.log('Raw class data from API:', rawData);
      
      // Transform the data to match our schema
      const transformedData = this.transformClassData(rawData);
      console.log('Transformed class data:', transformedData);
      
      // Parse and validate the document with our schema
      const validation = classDocumentSchema.safeParse(transformedData);

      if (!validation.success) {
        console.error(`Validation failed for ${className}:`, validation.error);
        throw new Error(`Invalid class document format: ${validation.error.message}`);
      }

      // Cache the result
      console.log(`Validation succeeded for ${className}`);
      const classDoc = validation.data;
      console.log('Validated class document:', classDoc);
      this.classCache.set(className, classDoc);
      return classDoc;
    } catch (error) {
      console.error(`Error fetching class data for ${className}:`, error);
      throw error;
    }
  }
  
  /**
   * Fetches species data from the server
   * @param speciesName The name of the species to fetch
   * @returns The species document
   */
  private async fetchSpeciesData(speciesName: string): Promise<SpeciesDocument> {
    console.log(`Fetching species data for ${speciesName}`);
    
    // Check cache first
    const cached = this.speciesCache.get(speciesName);
    if (cached) {
      console.log(`Using cached data for ${speciesName}`);
      return cached;
    }

    try {
      // Fetch from server using the searchDocuments method from the plugin API
      console.log(`Making API call to search for species ${speciesName}`);
      
      const documents = await this.api.searchDocuments({
        pluginId: 'dnd-5e-2024',
        documentType: 'species',
        name: speciesName
      });
      
      console.log(`Received response for ${speciesName}:`, documents);
      
      // The search endpoint returns an array of documents, we want the first match
      if (!documents || documents.length === 0) {
        throw new Error(`No species document found for ${speciesName}`);
      }
      
      const rawData = documents[0];
      console.log('Raw species data from API:', rawData);
      
      // Transform the data to match our schema
      const transformedData = this.transformSpeciesData(rawData);
      console.log('Transformed species data:', transformedData);
      
      // Parse and validate the document with our schema
      const validation = speciesDocumentSchema.safeParse(transformedData);

      if (!validation.success) {
        console.error(`Validation failed for ${speciesName}:`, validation.error);
        throw new Error(`Invalid species document format: ${validation.error.message}`);
      }

      // Cache the result
      console.log(`Validation succeeded for ${speciesName}`);
      const speciesDoc = validation.data;
      console.log('Validated species document:', speciesDoc);
      this.speciesCache.set(speciesName, speciesDoc);
      return speciesDoc;
    } catch (error) {
      console.error(`Error fetching species data for ${speciesName}:`, error);
      throw error;
    }
  }
  
  /**
   * Fetches background data from the server
   * @param backgroundName The name of the background to fetch
   * @returns The background document
   */
  private async fetchBackgroundData(backgroundName: string): Promise<BackgroundDocument> {
    console.log(`Fetching background data for ${backgroundName}`);
    
    // Check cache first
    const cached = this.backgroundCache.get(backgroundName);
    if (cached) {
      console.log(`Using cached data for ${backgroundName}`);
      return cached;
    }

    try {
      // Fetch from server using the searchDocuments method from the plugin API
      console.log(`Making API call to search for background ${backgroundName}`);
      
      const documents = await this.api.searchDocuments({
        pluginId: 'dnd-5e-2024',
        documentType: 'background',
        name: backgroundName
      });
      
      console.log(`Received response for ${backgroundName}:`, documents);
      
      // The search endpoint returns an array of documents, we want the first match
      if (!documents || documents.length === 0) {
        throw new Error(`No background document found for ${backgroundName}`);
      }
      
      const rawData = documents[0];
      console.log('Raw background data from API:', rawData);
      
      // Transform the data to match our schema
      const transformedData = this.transformBackgroundData(rawData);
      console.log('Transformed background data:', transformedData);
      
      // Parse and validate the document with our schema
      const validation = backgroundDocumentSchema.safeParse(transformedData);

      if (!validation.success) {
        console.error(`Validation failed for ${backgroundName}:`, validation.error);
        throw new Error(`Invalid background document format: ${validation.error.message}`);
      }

      // Cache the result
      console.log(`Validation succeeded for ${backgroundName}`);
      const backgroundDoc = validation.data;
      console.log('Validated background document:', backgroundDoc);
      this.backgroundCache.set(backgroundName, backgroundDoc);
      return backgroundDoc;
    } catch (error) {
      console.error(`Error fetching background data for ${backgroundName}:`, error);
      throw error;
    }
  }
}

// Export the component class
export default CharacterCreationComponent;

