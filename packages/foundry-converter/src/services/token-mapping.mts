import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.mjs';

export interface TokenMapping {
  actor?: string;
  token?: string | {
    width?: number;
    height?: number;
    texture?: {
      src: string;
      scaleX?: number;
      scaleY?: number;
    };
  };
}

export interface TokenMappingData {
  [packName: string]: {
    [actorId: string]: TokenMapping;
  };
}

/**
 * Service for loading and applying Foundry token mappings
 */
export class TokenMappingService {
  private mappingData: TokenMappingData | null = null;
  private fallbackMappings = new Map<string, string>();

  constructor(private systemPath: string) {
    this.initializeFallbackMappings();
  }

  /**
   * Load the token mapping file
   */
  async loadMappings(): Promise<void> {
    try {
      const mappingPath = path.join(this.systemPath, 'json', 'fa-token-mapping.json');
      logger.debug(`Loading token mappings from: ${mappingPath}`);
      
      const mappingContent = await fs.readFile(mappingPath, 'utf-8');
      this.mappingData = JSON.parse(mappingContent);
      
      const totalMappings = Object.values(this.mappingData || {})
        .reduce((sum, packMappings) => sum + Object.keys(packMappings).length, 0);
      
      logger.info(`Loaded ${totalMappings} token mappings from Foundry system`);
    } catch (error) {
      logger.warn(`Could not load token mappings: ${error instanceof Error ? error.message : String(error)}`);
      this.mappingData = {};
    }
  }

  /**
   * Get token mapping for a specific actor in a pack
   */
  getTokenMapping(packName: string, actorId: string): TokenMapping | null {
    if (!this.mappingData) {
      return null;
    }

    const packMappings = this.mappingData[packName];
    if (!packMappings) {
      return null;
    }

    return packMappings[actorId] || null;
  }

  /**
   * Get all token paths referenced in mappings
   */
  getAllMappedTokenPaths(): string[] {
    if (!this.mappingData) {
      return [];
    }

    const tokenPaths = new Set<string>();

    for (const packMappings of Object.values(this.mappingData)) {
      for (const mapping of Object.values(packMappings)) {
        // Add actor image path
        if (mapping.actor) {
          tokenPaths.add(mapping.actor);
        }

        // Add token image path
        if (mapping.token) {
          if (typeof mapping.token === 'string') {
            tokenPaths.add(mapping.token);
          } else if (mapping.token.texture?.src) {
            tokenPaths.add(mapping.token.texture.src);
          }
        }
      }
    }

    return Array.from(tokenPaths);
  }

  /**
   * Get fallback token for an unmapped actor
   */
  getFallbackToken(actorName: string, _actorType?: string): string | null {
    // Try exact name match first
    const exactMatch = this.fallbackMappings.get(actorName.toLowerCase());
    if (exactMatch) {
      return exactMatch;
    }

    // Try partial name matching for dragon types
    const lowerName = actorName.toLowerCase();
    
    // Handle dragons with age categories
    if (lowerName.includes('dragon')) {
      return this.getDragonFallback(lowerName);
    }

    // Handle other creature types
    if (lowerName.includes('giant') && lowerName.includes('centipede')) {
      return 'systems/dnd5e/tokens/beast/GiantCentipede.webp';
    }
    
    if (lowerName.includes('giant') && lowerName.includes('wasp')) {
      return 'systems/dnd5e/tokens/beast/GiantWasp.webp';
    }

    return null;
  }

  /**
   * Initialize common fallback mappings
   */
  private initializeFallbackMappings(): void {
    // Common creature fallbacks
    this.fallbackMappings.set('ancient black dragon', 'systems/dnd5e/tokens/dragon/BlackDragonAdult.webp');
    this.fallbackMappings.set('ancient brass dragon', 'systems/dnd5e/tokens/dragon/BrassDragonAdult.webp');
    this.fallbackMappings.set('ancient bronze dragon', 'systems/dnd5e/tokens/dragon/BronzeDragonAdult.webp');
    this.fallbackMappings.set('ancient copper dragon', 'systems/dnd5e/tokens/dragon/CopperDragonAdult.webp');
    this.fallbackMappings.set('ancient gold dragon', 'systems/dnd5e/tokens/dragon/GoldDragonAdult.webp');
    this.fallbackMappings.set('ancient silver dragon', 'systems/dnd5e/tokens/dragon/SilverDragonAdult.webp');
  }

  /**
   * Get fallback token for dragon creatures
   */
  private getDragonFallback(lowerName: string): string | null {
    // Extract dragon color and age
    const colors = ['black', 'blue', 'brass', 'bronze', 'copper', 'gold', 'green', 'red', 'silver', 'white'];
    const ages = ['ancient', 'adult', 'young', 'wyrmling'];

    let color = '';
    let age = 'adult'; // default to adult

    // Find color
    for (const c of colors) {
      if (lowerName.includes(c)) {
        color = c;
        break;
      }
    }

    // Find age (prefer specific age if found)
    for (const a of ages) {
      if (lowerName.includes(a)) {
        age = a;
        break;
      }
    }

    if (color) {
      // Handle special cases where Ancient tokens don't exist
      if (age === 'ancient' && !this.ancientTokenExists(color)) {
        age = 'adult'; // fallback to adult
      }

      // Construct token path
      const colorCapitalized = color.charAt(0).toUpperCase() + color.slice(1);
      const ageCapitalized = age.charAt(0).toUpperCase() + age.slice(1);
      
      return `systems/dnd5e/tokens/dragon/${colorCapitalized}Dragon${ageCapitalized}.webp`;
    }

    return null;
  }

  /**
   * Check if an ancient dragon token exists for a given color
   */
  private ancientTokenExists(color: string): boolean {
    // Based on our file system scan, these are the colors that have Ancient tokens
    const ancientColors = ['blue', 'green', 'red', 'white'];
    return ancientColors.includes(color);
  }

  /**
   * Get token dimensions from mapping
   */
  getTokenDimensions(mapping: TokenMapping): { width?: number; height?: number; scale?: number } {
    if (!mapping.token || typeof mapping.token === 'string') {
      return {};
    }

    return {
      width: mapping.token.width,
      height: mapping.token.height,
      scale: mapping.token.texture?.scaleX || mapping.token.texture?.scaleY
    };
  }

  /**
   * Check if mappings are loaded
   */
  isLoaded(): boolean {
    return this.mappingData !== null;
  }
}