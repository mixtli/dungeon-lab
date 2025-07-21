import { logger } from '../utils/logger.mjs';
import type { FoundryDocument, ActorItemEntry } from './leveldb-reader.mjs';

export interface TransformedContent {
  targetType: 'Actor' | 'Item' | 'VTTDocument';
  subtype: string;
  name: string;
  data: any;
  originalId: string;
  originalType: string;
  assetReferences: string[];
}

export interface TransformationResult {
  content: TransformedContent[];
  skipped: number;
  errors: Array<{ documentId: string; error: string }>;
  assetReferences: Set<string>;
}

/**
 * Service for transforming Foundry VTT documents into Dungeon Lab format
 */
export interface PluginTypeMapping {
  getTargetType: (foundryType: string) => 'Actor' | 'Item' | 'VTTDocument' | 'SKIP';
  getTargetSubtype: (foundryType: string) => string | null;
  shouldSkipType: (foundryType: string) => boolean;
  getDocumentType: (foundryType: string) => string;
}

export class FoundryTransformerService {
  constructor(private typeMapping: PluginTypeMapping) {}
  
  /**
   * Transform an array of Foundry documents into Dungeon Lab format
   */
  transformDocuments(documents: FoundryDocument[]): TransformationResult {
    const result: TransformationResult = {
      content: [],
      skipped: 0,
      errors: [],
      assetReferences: new Set()
    };

    logger.info(`Starting transformation of ${documents.length} Foundry documents`);

    for (const document of documents) {
      try {
        // Check if we should skip this type
        if (this.typeMapping.shouldSkipType(document.type)) {
          result.skipped++;
          logger.debug(`Skipping document ${document._id} of type ${document.type}`);
          continue;
        }

        const transformed = this.transformSingleDocument(document);
        if (transformed) {
          result.content.push(transformed);
          
          // Collect asset references
          transformed.assetReferences.forEach(ref => {
            result.assetReferences.add(ref);
          });
        } else {
          result.skipped++;
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push({
          documentId: document._id,
          error: errorMessage
        });
        logger.error(`Failed to transform document ${document._id}:`, error);
      }
    }

    logger.info(`Transformation complete: ${result.content.length} transformed, ${result.skipped} skipped, ${result.errors.length} errors`);
    return result;
  }

  /**
   * Transform a single Foundry document
   */
  private transformSingleDocument(document: FoundryDocument): TransformedContent | null {
    // For Foundry documents, we need to use the document's type field
    // For actors, the type might be 'Actor' and we need to look at document.type for the actual type
    const foundryType = document.type;
    
    // Debug logging to understand the document structure
    logger.debug(`Processing document ${document._id}: documentType=${document.type}, hasSystem=${!!document.system}, hasData=${!!document.data}`);
    
    const targetType = this.typeMapping.getTargetType(foundryType);
    const subtype = this.typeMapping.getTargetSubtype(foundryType);

    if (targetType === 'SKIP' || !subtype) {
      logger.debug(`Skipping document ${document._id}: targetType=${targetType}, subtype=${subtype}`);
      return null;
    }

    // Extract asset references from the document
    const assetReferences = this.extractAssetReferences(document);

    // Transform based on target type
    switch (targetType) {
      case 'Actor':
        return this.transformActor(document, subtype, assetReferences);
      case 'Item':
        return this.transformItem(document, subtype, assetReferences);
      case 'VTTDocument':
        return this.transformVTTDocument(document, subtype, assetReferences);
      default:
        throw new Error(`Unknown target type: ${targetType}`);
    }
  }

  /**
   * Transform Foundry actor to Dungeon Lab Actor
   */
  private transformActor(document: FoundryDocument, subtype: string, assetReferences: string[]): TransformedContent {
    const transformedData = {
      name: document.name,
      type: subtype,
      system: this.transformSystemData(document.system || document.data?.data || {}),
      img: document.img || undefined,
      token: document.prototypeToken || document.token || {},
      items: [], // Items will be handled separately
      effects: document.effects || [],
      flags: this.transformFlags(document.flags || {}),
      folder: document.folder || undefined,
      sort: document.sort || 0,
      ownership: document.ownership || {}
    };

    return {
      targetType: 'Actor',
      subtype,
      name: document.name,
      data: transformedData,
      originalId: document._id,
      originalType: document.type,
      assetReferences
    };
  }

  /**
   * Transform Foundry item to Dungeon Lab Item
   */
  private transformItem(document: FoundryDocument, subtype: string, assetReferences: string[]): TransformedContent {
    const systemData = document.system || document.data?.data || {};
    
    const transformedData = {
      name: document.name,
      type: subtype,
      img: document.img || undefined,
      system: this.transformSystemData(systemData),
      effects: document.effects || [],
      flags: this.transformFlags(document.flags || {}),
      folder: document.folder || undefined,
      sort: document.sort || 0,
      ownership: document.ownership || {}
    };

    // Add item-specific transformations
    if (subtype === 'weapon') {
      transformedData.system = this.transformWeaponData(systemData);
    } else if (subtype === 'equipment') {
      transformedData.system = this.transformEquipmentData(systemData);
    } else if (subtype === 'consumable') {
      transformedData.system = this.transformConsumableData(systemData);
    }

    return {
      targetType: 'Item',
      subtype,
      name: document.name,
      data: transformedData,
      originalId: document._id,
      originalType: document.type,
      assetReferences
    };
  }

  /**
   * Transform Foundry document to Dungeon Lab VTTDocument
   */
  private transformVTTDocument(document: FoundryDocument, subtype: string, assetReferences: string[]): TransformedContent {
    const systemData = document.system || document.data?.data || {};
    
    const transformedData = {
      name: document.name,
      description: systemData.description?.value || systemData.description || document.description || '',
      type: this.typeMapping.getDocumentType(document.type),
      system: this.transformSystemData(systemData),
      gameSystemId: 'dnd5e-2024', // Default to D&D 5e 2024
      flags: this.transformFlags(document.flags || {}),
      folder: document.folder || undefined,
      sort: document.sort || 0,
      ownership: document.ownership || {}
    };

    // Add document-specific transformations
    if (subtype === 'spell') {
      transformedData.system = this.transformSpellData(systemData);
    } else if (subtype === 'class') {
      transformedData.system = this.transformClassData(systemData);
    } else if (subtype === 'background') {
      transformedData.system = this.transformBackgroundData(systemData);
    }

    return {
      targetType: 'VTTDocument',
      subtype,
      name: document.name,
      data: transformedData,
      originalId: document._id,
      originalType: document.type,
      assetReferences
    };
  }

  /**
   * Transform system data, preserving complex structures
   */
  private transformSystemData(systemData: any): any {
    if (!systemData || typeof systemData !== 'object') {
      return {};
    }

    // Deep clone to avoid modifying original
    return JSON.parse(JSON.stringify(systemData));
  }

  /**
   * Transform weapon-specific data
   */
  private transformWeaponData(systemData: any): any {
    const transformed = this.transformSystemData(systemData);
    
    // Ensure weapon-specific fields are properly structured
    if (transformed.damage) {
      transformed.damage = {
        parts: transformed.damage.parts || [],
        versatile: transformed.damage.versatile || ''
      };
    }

    if (transformed.properties) {
      // Convert properties object to array if needed
      if (typeof transformed.properties === 'object' && !Array.isArray(transformed.properties)) {
        transformed.properties = Object.keys(transformed.properties).filter(key => transformed.properties[key]);
      }
    }

    return transformed;
  }

  /**
   * Transform equipment-specific data
   */
  private transformEquipmentData(systemData: any): any {
    const transformed = this.transformSystemData(systemData);
    
    // Ensure armor class structure
    if (transformed.armor) {
      transformed.armor = {
        type: transformed.armor.type || 'clothing',
        value: transformed.armor.value || 10,
        dex: transformed.armor.dex
      };
    }

    return transformed;
  }

  /**
   * Transform consumable-specific data
   */
  private transformConsumableData(systemData: any): any {
    const transformed = this.transformSystemData(systemData);
    
    // Ensure uses structure
    if (transformed.uses) {
      transformed.uses = {
        value: transformed.uses.value || 1,
        max: transformed.uses.max || 1,
        per: transformed.uses.per || 'charges'
      };
    }

    return transformed;
  }

  /**
   * Transform spell-specific data
   */
  private transformSpellData(systemData: any): any {
    const transformed = this.transformSystemData(systemData);
    
    // Ensure spell level is a number
    if (transformed.level !== undefined) {
      transformed.level = Number(transformed.level) || 0;
    }

    // Ensure school is properly formatted
    if (transformed.school) {
      transformed.school = String(transformed.school).toLowerCase();
    }

    return transformed;
  }

  /**
   * Transform class-specific data
   */
  private transformClassData(systemData: any): any {
    const transformed = this.transformSystemData(systemData);
    
    // Ensure hit die is properly formatted
    if (transformed.hitDie) {
      transformed.hitDie = String(transformed.hitDie).replace('d', '');
    }

    return transformed;
  }

  /**
   * Transform background-specific data
   */
  private transformBackgroundData(systemData: any): any {
    const transformed = this.transformSystemData(systemData);
    
    // Ensure skills are properly formatted
    if (transformed.skills) {
      if (Array.isArray(transformed.skills)) {
        // Keep as array
      } else if (typeof transformed.skills === 'object') {
        // Convert object to array of selected skills
        transformed.skills = Object.keys(transformed.skills).filter(skill => transformed.skills[skill]);
      }
    }

    return transformed;
  }

  /**
   * Transform flags, removing Foundry-specific entries
   */
  private transformFlags(flags: Record<string, any>): Record<string, any> {
    const transformed = { ...flags };
    
    // Remove Foundry core flags that don't apply to our system
    delete transformed.core;
    delete transformed.exportSource;
    delete transformed['5e']; // D&D 5e system flags
    
    return transformed;
  }

  /**
   * Extract asset references from a document
   */
  private extractAssetReferences(document: FoundryDocument): string[] {
    const references: string[] = [];
    
    // Extract from common image fields
    if (document.img && this.isAssetPath(document.img)) {
      references.push(document.img);
    }

    // Extract from token image
    if (document.prototypeToken?.texture?.src && this.isAssetPath(document.prototypeToken.texture.src)) {
      references.push(document.prototypeToken.texture.src);
    }

    // Extract from system data recursively
    this.extractAssetReferencesRecursive(document.system || document.data?.data || {}, references);

    // Extract from flags
    this.extractAssetReferencesRecursive(document.flags || {}, references);

    return references;
  }

  /**
   * Recursively extract asset references from nested objects
   */
  private extractAssetReferencesRecursive(obj: any, references: string[]): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    for (const value of Object.values(obj)) {
      if (typeof value === 'string' && this.isAssetPath(value)) {
        references.push(value);
      } else if (typeof value === 'object') {
        this.extractAssetReferencesRecursive(value, references);
      }
    }
  }

  /**
   * Check if a string is likely an asset path
   */
  private isAssetPath(path: string): boolean {
    if (!path || typeof path !== 'string') {
      return false;
    }

    // Check for common image extensions
    const imageExtensions = /\.(png|jpg|jpeg|gif|webp|svg)$/i;
    if (imageExtensions.test(path)) {
      return true;
    }

    // Check for Foundry asset paths
    if (path.startsWith('systems/') || path.startsWith('modules/') || path.startsWith('worlds/')) {
      return true;
    }

    return false;
  }

  /**
   * Transform actor inventory items into Dungeon Lab Items
   */
  transformActorItems(actorItems: ActorItemEntry[]): TransformationResult {
    const result: TransformationResult = {
      content: [],
      skipped: 0,
      errors: [],
      assetReferences: new Set()
    };

    logger.info(`Starting transformation of ${actorItems.length} actor inventory items`);

    for (const entry of actorItems) {
      try {
        const { item } = entry;
        
        // Skip if no type information
        if (!item.type) {
          result.skipped++;
          logger.debug(`Skipping actor item without type: ${entry.itemId}`);
          continue;
        }

        // Get target type and subtype for the item
        const targetType = this.typeMapping.getTargetType(item.type);
        const subtype = this.typeMapping.getTargetSubtype(item.type);

        // Items should map to 'Item' target type
        if (targetType !== 'Item' || !subtype) {
          result.skipped++;
          logger.debug(`Skipping non-item actor inventory entry: ${entry.itemId} (${item.type})`);
          continue;
        }

        // Extract asset references
        const assetReferences = this.extractAssetReferences(item);

        // Ensure item has an _id (use the itemId from the key)
        if (!item._id) {
          item._id = entry.itemId;
        }
        
        // Ensure item has a name
        if (!item.name) {
          item.name = 'Unknown Item';
        }
        
        // Transform the item
        const transformed = this.transformItem(item, subtype, assetReferences);
        if (transformed) {
          // Add actor association metadata
          transformed.data._actorId = entry.actorId;
          result.content.push(transformed);
          
          // Collect asset references
          transformed.assetReferences.forEach(ref => {
            result.assetReferences.add(ref);
          });
        } else {
          result.skipped++;
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push({
          documentId: entry.itemId,
          error: errorMessage
        });
        logger.error(`Failed to transform actor item ${entry.itemId}:`, error);
      }
    }

    logger.info(`Actor items transformation complete: ${result.content.length} transformed, ${result.skipped} skipped, ${result.errors.length} errors`);
    return result;
  }
}

// Export class only, instance created with plugin mapping