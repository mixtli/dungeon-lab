/**
 * Document Helpers
 * 
 * Helper functions for handlebars templates to access document data from the cache.
 */

import { 
  getClassByName, 
  getBackgroundByName, 
  getSpeciesByName,
  getClasses,
  getBackgrounds,
  getSpecies,
  isLoaded,
  extractDocumentData
} from '../document-cache.mjs';

/**
 * Handlebars helper functions
 */
export const documentHelpers = {
  /**
   * Get a class document by name
   * Usage: {{getClass "Fighter"}}
   */
  getClass: (name: string) => {
    console.log(`getClass helper called with name: "${name}"`);
    
    if (!name) {
      console.warn('getClass helper called with empty name');
      return undefined;
    }
    
    try {
      console.log(`Looking up class "${name}" in cache`);
      const rawDocument = getClassByName(name);
      
      if (rawDocument) {
        console.log(`Class "${name}" found in cache, extracting data`);
        // Extract and process the document data
        const vttDocument = extractDocumentData(rawDocument);
        console.log(`Class data extracted for "${name}":`, { 
          keys: Object.keys(vttDocument),
          name: vttDocument.name,
          description: vttDocument.description?.toString().substring(0, 50) + '...',
          hitDie: vttDocument.hitDie || vttDocument.hitdie
        });
        return vttDocument;
      } else {
        console.warn(`Class "${name}" not found in cache`);
        return undefined;
      }
    } catch (error) {
      console.error(`Error in getClass helper for '${name}':`, error);
      return undefined;
    }
  },

  /**
   * Get a background document by name
   * Usage: {{getBackground "Acolyte"}}
   */
  getBackground: (name: string) => {
    if (!name) return undefined;
    try {
      return getBackgroundByName(name);
    } catch (error) {
      console.error(`Error getting background '${name}':`, error);
      return undefined;
    }
  },

  /**
   * Get a species document by name
   * Usage: {{getSpecies "Human"}}
   */
  getSpecies: (name: string) => {
    if (!name) return undefined;
    try {
      return getSpeciesByName(name);
    } catch (error) {
      console.error(`Error getting species '${name}':`, error);
      return undefined;
    }
  },

  /**
   * Check if a class is loaded by name
   * Usage: {{#if (isClassLoaded "Fighter")}}...{{/if}}
   */
  isClassLoaded: (name: string) => {
    if (!name) return false;
    try {
      return !!getClassByName(name);
    } catch (error) {
      return false;
    }
  },

  /**
   * Check if a background is loaded by name
   * Usage: {{#if (isBackgroundLoaded "Acolyte")}}...{{/if}}
   */
  isBackgroundLoaded: (name: string) => {
    if (!name) return false;
    try {
      return !!getBackgroundByName(name);
    } catch (error) {
      return false;
    }
  },

  /**
   * Check if a species is loaded by name
   * Usage: {{#if (isSpeciesLoaded "Human")}}...{{/if}}
   */
  isSpeciesLoaded: (name: string) => {
    if (!name) return false;
    try {
      return !!getSpeciesByName(name);
    } catch (error) {
      return false;
    }
  },

  /**
   * Check if documents of a specific type are loaded
   * Usage: {{#if (areDocumentsLoaded "class")}}...{{/if}}
   */
  areDocumentsLoaded: (type: string) => {
    try {
      return isLoaded(type as any);
    } catch (error) {
      return false;
    }
  },

  /**
   * Get all classes
   * Usage: {{#each (getAllClasses)}}...{{/each}}
   */
  getAllClasses: () => {
    try {
      return getClasses();
    } catch (error) {
      console.error('Error getting all classes:', error);
      return [];
    }
  },

  /**
   * Get all backgrounds
   * Usage: {{#each (getAllBackgrounds)}}...{{/each}}
   */
  getAllBackgrounds: () => {
    try {
      return getBackgrounds();
    } catch (error) {
      console.error('Error getting all backgrounds:', error);
      return [];
    }
  },

  /**
   * Get all species
   * Usage: {{#each (getAllSpecies)}}...{{/each}}
   */
  getAllSpecies: () => {
    try {
      return getSpecies();
    } catch (error) {
      console.error('Error getting all species:', error);
      return [];
    }
  },

  /**
   * Get a trait from a class document by trait name
   * Usage: {{getClassTrait "Fighter" "Fighting Style"}}
   */
  getClassTrait: (className: string, traitName: string) => {
    if (!className || !traitName) return undefined;
    
    try {
      const classDoc = getClassByName(className);
      if (!classDoc) return undefined;
      
      const traits = (classDoc as any).traits || [];
      return traits.find((trait: any) => trait.name === traitName);
    } catch (error) {
      console.error(`Error getting trait '${traitName}' for class '${className}':`, error);
      return undefined;
    }
  },
  
  /**
   * Get a feature from a background document by feature name
   * Usage: {{getBackgroundFeature "Acolyte" "Shelter of the Faithful"}}
   */
  getBackgroundFeature: (backgroundName: string, featureName: string) => {
    if (!backgroundName || !featureName) return undefined;
    
    try {
      const backgroundDoc = getBackgroundByName(backgroundName);
      if (!backgroundDoc) return undefined;
      
      const features = (backgroundDoc as any).features || [];
      return features.find((feature: any) => feature.name === featureName);
    } catch (error) {
      console.error(`Error getting feature '${featureName}' for background '${backgroundName}':`, error);
      return undefined;
    }
  },
  
  /**
   * Get a trait from a species document by trait name
   * Usage: {{getSpeciesTrait "Human" "Versatile"}}
   */
  getSpeciesTrait: (speciesName: string, traitName: string) => {
    if (!speciesName || !traitName) return undefined;
    
    try {
      const speciesDoc = getSpeciesByName(speciesName);
      if (!speciesDoc) return undefined;
      
      const traits = (speciesDoc as any).traits || [];
      return traits.find((trait: any) => trait.name === traitName);
    } catch (error) {
      console.error(`Error getting trait '${traitName}' for species '${speciesName}':`, error);
      return undefined;
    }
  }
};

/**
 * Register all document helpers with a handlebars instance
 */
export function registerDocumentHelpers(handlebars: any): void {
  Object.entries(documentHelpers).forEach(([name, helper]) => {
    handlebars.registerHelper(name, helper);
  });
  
  console.log('Document helpers registered with handlebars');
} 