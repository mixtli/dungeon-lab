/**
 * Document Helpers
 * 
 * Helper functions for handlebars templates to access document data from the cache.
 */

import { 
  getClass, 
  getBackground, 
  getSpecies,
  getFeat,
  getClassByName,
  getBackgroundByName,
  getSpeciesByName,
  getFeatByName,
  getAllClasses,
  getAllBackgrounds,
  getAllSpecies,
  getAllFeats,
  isLoaded
} from '../document-cache.mjs';
import type { DocumentType } from '../document-cache.mjs';
/**
 * Handlebars helper functions
 */
export const documentHelpers = {
  /**
   * Get a class document by ID
   * Usage: {{getClass "class-id"}}
   */
  getClass: (id: string) => {
    console.log(`getClass helper called with id: "${id}"`);
    
    if (!id) {
      console.warn('getClass helper called with empty id');
      return undefined;
    }
    
    try {
      console.log(`Looking up class with id "${id}" in cache`);
      // Simply delegate to the cache method
      return getClass(id);
    } catch (error) {
      console.error(`Error in getClass helper for id '${id}':`, error);
      return undefined;
    }
  },

  /**
   * Get a background document by ID
   * Usage: {{getBackground "background-id"}}
   */
  getBackground: (id: string) => {
    if (!id) return undefined;
    try {
      return getBackground(id);
    } catch (error) {
      console.error(`Error getting background with id '${id}':`, error);
      return undefined;
    }
  },

  /**
   * Get a species document by ID
   * Usage: {{getSpecies "species-id"}}
   */
  getSpecies: (id: string) => {
    if (!id) return undefined;
    try {
      return getSpecies(id);
    } catch (error) {
      console.error(`Error getting species with id '${id}':`, error);
      return undefined;
    }
  },

  /**
   * Get a feat document by ID
   * Usage: {{getFeat "feat-id"}}
   */
  getFeat: (id: string) => {
    if (!id) return undefined;
    try {
      return getFeat(id);
    } catch (error) {
      console.error(`Error getting feat with id '${id}':`, error);
      return undefined;
    }
  },

  /**
   * Get a class document by name (backward compatibility)
   * Usage: {{getClassByName "Fighter"}}
   */
  getClassByName: (name: string) => {
    if (!name) return undefined;
    try {
      return getClassByName(name);
    } catch (error) {
      console.error(`Error getting class by name '${name}':`, error);
      return undefined;
    }
  },

  /**
   * Get a background document by name (backward compatibility)
   * Usage: {{getBackgroundByName "Acolyte"}}
   */
  getBackgroundByName: (name: string) => {
    if (!name) return undefined;
    try {
      return getBackgroundByName(name);
    } catch (error) {
      console.error(`Error getting background by name '${name}':`, error);
      return undefined;
    }
  },

  /**
   * Get a species document by name (backward compatibility)
   * Usage: {{getSpeciesByName "Human"}}
   */
  getSpeciesByName: (name: string) => {
    if (!name) return undefined;
    try {
      return getSpeciesByName(name);
    } catch (error) {
      console.error(`Error getting species by name '${name}':`, error);
      return undefined;
    }
  },

  /**
   * Get a feat document by name (backward compatibility)
   * Usage: {{getFeatByName "Alert"}}
   */
  getFeatByName: (name: string) => {
    if (!name) return undefined;
    try {
      return getFeatByName(name);
    } catch (error) {
      console.error(`Error getting feat by name '${name}':`, error);
      return undefined;
    }
  },

  /**
   * Check if a class is loaded by ID
   * Usage: {{#if (isClassLoaded "class-id")}}...{{/if}}
   */
  isClassLoaded: (id: string) => {
    if (!id) return false;
    try {
      return !!getClass(id);
    } catch (_) {
      return false;
    }
  },

  /**
   * Check if a background is loaded by ID
   * Usage: {{#if (isBackgroundLoaded "background-id")}}...{{/if}}
   */
  isBackgroundLoaded: (id: string) => {
    if (!id) return false;
    try {
      return !!getBackground(id);
    } catch (_) {
      return false;
    }
  },

  /**
   * Check if a species is loaded by ID
   * Usage: {{#if (isSpeciesLoaded "species-id")}}...{{/if}}
   */
  isSpeciesLoaded: (id: string) => {
    if (!id) return false;
    try {
      return !!getSpecies(id);
    } catch (_) {
      return false;
    }
  },

  /**
   * Check if a feat is loaded by ID
   * Usage: {{#if (isFeatLoaded "feat-id")}}...{{/if}}
   */
  isFeatLoaded: (id: string) => {
    if (!id) return false;
    try {
      return !!getFeat(id);
    } catch (_) {
      return false;
    }
  },

  /**
   * Check if documents of a specific type are loaded
   * Usage: {{#if (areDocumentsLoaded "class")}}...{{/if}}
   */
  areDocumentsLoaded: (type: string) => {
    try {
      return isLoaded(type as DocumentType);
    } catch (_) {
      return false;
    }
  },

  /**
   * Get all classes
   * Usage: {{#each (getAllClasses)}}...{{/each}}
   */
  getAllClasses: () => {
    try {
      const classes = getAllClasses();
      console.log('getAllClasses result:', classes);
      return classes;
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
      return getAllBackgrounds();
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
      return getAllSpecies();
    } catch (error) {
      console.error('Error getting all species:', error);
      return [];
    }
  },

  /**
   * Get all feats
   * Usage: {{#each (getAllFeats)}}...{{/each}}
   */
  getAllFeats: () => {
    try {
      return getAllFeats();
    } catch (error) {
      console.error('Error getting all feats:', error);
      return [];
    }
  },

  /**
   * Get a trait from a class document by trait name
   * Usage: {{getClassTrait "class-id" "Fighting Style"}}
   */
  getClassTrait: (classId: string, traitName: string) => {
    if (!classId || !traitName) return undefined;
    
    try {
      const classDoc = getClass(classId);
      if (!classDoc) return undefined;
      
      // Access class features from the appropriate structure
      const features = classDoc.data?.features || {};
      // Look through all feature levels
      for (const level in features) {
        const levelFeatures = features[level] || [];
        const found = levelFeatures.find(f => f.name === traitName);
        if (found) return found;
      }
      
      return undefined;
    } catch (error) {
      console.error(`Error getting trait '${traitName}' for class with id '${classId}':`, error);
      return undefined;
    }
  },
  
  /**
   * Get a feature from a background document by feature name
   * Usage: {{getBackgroundFeature "background-id" "Shelter of the Faithful"}}
   */
  getBackgroundFeature: (backgroundId: string, featureName: string) => {
    if (!backgroundId || !featureName) return undefined;
    
    try {
      const backgroundDoc = getBackground(backgroundId);
      if (!backgroundDoc || !backgroundDoc.data) return undefined;
      
      // Background documents have different structure
      // Look for the feature in the appropriate fields
      if (backgroundDoc.data.abilities && backgroundDoc.data.abilities.includes(featureName)) {
        return { name: featureName, description: `Ability from background with id ${backgroundId}` };
      }
      
      // Check feats if available
      if (backgroundDoc.data.feats && backgroundDoc.data.feats.includes(featureName)) {
        return { name: featureName, description: `Feat from background with id ${backgroundId}` };
      }
      
      return undefined;
    } catch (error) {
      console.error(`Error getting feature '${featureName}' for background with id '${backgroundId}':`, error);
      return undefined;
    }
  },
  
  /**
   * Get a trait from a species document by trait name
   * Usage: {{getSpeciesTrait "species-id" "Versatile"}}
   */
  getSpeciesTrait: (speciesId: string, traitName: string) => {
    if (!speciesId || !traitName) return undefined;
    
    try {
      const speciesDoc = getSpecies(speciesId);
      if (!speciesDoc) return undefined;
      
      // Access species traits from the appropriate structure
      const traits = speciesDoc.data?.traits || [];
      return traits.find((trait: { name?: string }) => trait?.name === traitName);
    } catch (error) {
      console.error(`Error getting trait '${traitName}' for species with id '${speciesId}':`, error);
      return undefined;
    }
  },
  
  /**
   * Get a trait from a feat document by trait name
   * Usage: {{getFeatTrait "feat-id" "Always Ready"}}
   */
  getFeatTrait: (featId: string, traitName: string) => {
    if (!featId || !traitName) return undefined;
    
    try {
      const featDoc = getFeat(featId);
      if (!featDoc) return undefined;
      
      // Access feat benefits from the appropriate structure
      const benefits = featDoc.data?.benefits || [];
      return benefits.find((benefit: { name?: string }) => benefit?.name === traitName);
    } catch (error) {
      console.error(`Error getting trait '${traitName}' for feat with id '${featId}':`, error);
      return undefined;
    }
  }
};

/**
 * Register all document helpers with Handlebars
 * @param handlebars The Handlebars instance
 */
export function registerDocumentHelpers(handlebars: typeof Handlebars): void {
  // Register individual document getters
  handlebars.registerHelper('getClass', documentHelpers.getClass);
  handlebars.registerHelper('getBackground', documentHelpers.getBackground);
  handlebars.registerHelper('getSpecies', documentHelpers.getSpecies);
  handlebars.registerHelper('getFeat', documentHelpers.getFeat);

  // Register name-based getters
  handlebars.registerHelper('getClassByName', documentHelpers.getClassByName);
  handlebars.registerHelper('getBackgroundByName', documentHelpers.getBackgroundByName);
  handlebars.registerHelper('getSpeciesByName', documentHelpers.getSpeciesByName);
  handlebars.registerHelper('getFeatByName', documentHelpers.getFeatByName);

  // Register collection getters
  handlebars.registerHelper('getAllClasses', () => getAllClasses());
  handlebars.registerHelper('getAllBackgrounds', () => getAllBackgrounds());
  handlebars.registerHelper('getAllSpecies', () => getAllSpecies());
  handlebars.registerHelper('getAllFeats', () => getAllFeats());

  // Register loaded checkers
  handlebars.registerHelper('isClassLoaded', documentHelpers.isClassLoaded);
  handlebars.registerHelper('isBackgroundLoaded', documentHelpers.isBackgroundLoaded);
  handlebars.registerHelper('isSpeciesLoaded', documentHelpers.isSpeciesLoaded);
  handlebars.registerHelper('isFeatLoaded', documentHelpers.isFeatLoaded);
} 