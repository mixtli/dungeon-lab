/**
 * Wrapper format converter for 5etools data to new compendium format
 */
import { join } from 'path';
import { readFile } from 'fs/promises';
import { ETOOLS_DATA_PATH } from '../../config/constants.mjs';
import { IContentFileWrapper } from '@dungeon-lab/shared/types/index.mjs';

export interface ConversionOptions {
  srdOnly?: boolean;
  includeAssets?: boolean;
  outputDir?: string;
}

export interface WrapperContent {
  type: 'actor' | 'item' | 'vttdocument';
  wrapper: IContentFileWrapper;
  originalPath?: string;
}

export interface WrapperConversionResult {
  success: boolean;
  content?: WrapperContent[];
  error?: Error;
  stats?: {
    total: number;
    converted: number;
    skipped: number;
    errors: number;
  };
}

export abstract class WrapperConverter {
  protected readonly options: ConversionOptions;
  
  constructor(options: ConversionOptions = {}) {
    this.options = {
      srdOnly: true,
      includeAssets: true,
      ...options
    };
  }

  /**
   * Read and parse a JSON file from the 5etools data directory
   */
  protected async readDataFile(relativePath: string): Promise<any> {
    const fullPath = join(ETOOLS_DATA_PATH, relativePath);
    const data = await readFile(fullPath, 'utf-8');
    return JSON.parse(data);
  }

  /**
   * Filter content to SRD only if option is enabled
   */
  protected filterSrdContent<T extends { srd52?: boolean }>(data: T[]): T[] {
    if (!this.options.srdOnly) {
      return data;
    }
    return data.filter(item => item.srd52 === true);
  }

  /**
   * Create wrapper format for content
   */
  protected createWrapper(
    name: string,
    contentData: any,
    contentType: 'actor' | 'item' | 'vttdocument',
    options: {
      imageId?: string;
      category?: string;
      tags?: string[];
      sortOrder?: number;
    } = {}
  ): IContentFileWrapper {
    return {
      entry: {
        name,
        type: contentType,
        imageId: options.imageId,
        category: options.category || this.getDefaultCategory(contentType),
        tags: options.tags || [],
        sortOrder: options.sortOrder || 0
      },
      content: contentData
    };
  }

  /**
   * Extract entry-level image path from content
   */
  protected extractEntryImagePath(sourceData: any, contentType: 'actor' | 'item' | 'vttdocument'): string | undefined {
    switch (contentType) {
      case 'actor':
        // For actors: prefer token images for browsing
        return sourceData.tokenUrl || sourceData.imageUrl;
      case 'item':
        // For items: use primary image
        return sourceData.imageUrl;
      case 'vttdocument':
        // For documents: use primary image if available
        return sourceData.imageUrl;
      default:
        return undefined;
    }
  }

  /**
   * Determine category from content type and source data
   */
  protected determineCategory(sourceData: any, contentType: 'actor' | 'item' | 'vttdocument'): string | undefined {
    switch (contentType) {
      case 'actor':
        return 'Monsters';
      case 'item':
        return 'Equipment';
      case 'vttdocument':
        return 'Documents';
      default:
        return undefined;
    }
  }

  /**
   * Extract tags from source data
   */
  protected extractTags(sourceData: any, contentType: 'actor' | 'item' | 'vttdocument'): string[] {
    const tags: string[] = [];
    
    // Add common tags based on content type
    if (sourceData.source) tags.push(sourceData.source.toLowerCase());
    if (sourceData.cr) tags.push(`cr${sourceData.cr}`.replace('.', '_'));
    
    // Add specific tags based on content type
    switch (contentType) {
      case 'actor':
        // Handle size (simple string or array)
        if (sourceData.size) {
          const size = Array.isArray(sourceData.size) ? sourceData.size[0] : sourceData.size;
          if (typeof size === 'string') tags.push(size.toLowerCase());
        }
        
        // Handle type (complex object with type.type and type.subtype)
        if (sourceData.type?.type) {
          tags.push(sourceData.type.type.toLowerCase());
          if (sourceData.type.subtype) {
            tags.push(sourceData.type.subtype.toLowerCase());
          }
        }
        
        // Handle alignment (array of alignment objects)
        if (sourceData.alignment && Array.isArray(sourceData.alignment)) {
          for (const align of sourceData.alignment) {
            if (typeof align === 'string') {
              tags.push(align.toLowerCase().replace(' ', '-'));
            } else if (align.alignment) {
              const alignStr = Array.isArray(align.alignment) ? align.alignment.join('-') : align.alignment;
              tags.push(alignStr.toLowerCase().replace(/\s+/g, '-'));
            }
          }
        }
        break;
        
      case 'item':
        if (sourceData.rarity && sourceData.rarity !== 'none') {
          tags.push(sourceData.rarity.toLowerCase().replace(' ', '-'));
        }
        if (sourceData.wondrous) tags.push('wondrous');
        if (sourceData.weaponCategory) tags.push('weapon');
        if (sourceData.armor || sourceData.type === 'LA' || sourceData.type === 'MA' || sourceData.type === 'HA') {
          tags.push('armor');
        }
        if (sourceData.reqAttune) tags.push('attunement');
        break;
        
      case 'vttdocument':
        if (sourceData.level !== undefined) {
          if (sourceData.level === 0) {
            tags.push('cantrip');
          } else {
            tags.push(`level-${sourceData.level}`);
          }
        }
        if (sourceData.school) tags.push(sourceData.school.toLowerCase());
        break;
    }
    
    return tags.filter(tag => tag && tag.trim().length > 0);
  }

  /**
   * Calculate sort order for content
   */
  protected calculateSortOrder(sourceData: any, contentType: 'actor' | 'item' | 'vttdocument'): number {
    switch (contentType) {
      case 'actor':
        // Sort by CR, then alphabetically
        if (sourceData.cr) {
          const cr = typeof sourceData.cr === 'string' ? parseFloat(sourceData.cr) : sourceData.cr;
          return Math.floor(cr * 100); // CR 0.5 becomes 50, CR 1 becomes 100, etc.
        }
        return 0;
      case 'item':
        // Sort by rarity, then alphabetically
        const rarityOrder = { 'common': 100, 'uncommon': 200, 'rare': 300, 'very rare': 400, 'legendary': 500, 'artifact': 600 };
        return rarityOrder[sourceData.rarity as keyof typeof rarityOrder] || 0;
      case 'vttdocument':
        // Sort by level for spells, then alphabetically
        if (sourceData.level !== undefined) {
          return sourceData.level * 1000; // Level 0 = 0, Level 1 = 1000, etc.
        }
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Get default category for content type
   */
  private getDefaultCategory(contentType: 'actor' | 'item' | 'vttdocument'): string {
    switch (contentType) {
      case 'actor':
        return 'Monsters';
      case 'item':
        return 'Equipment';
      case 'vttdocument':
        return 'Documents';
      default:
        return 'Miscellaneous';
    }
  }

  /**
   * Clean 5etools rule text by removing markup and source references
   */
  protected cleanRuleText(text: string): string {
    if (typeof text !== 'string') {
      return '';
    }
    
    // Handle {@variantrule text|source} pattern
    text = text.replace(/{@variantrule ([^}|]+)\|[^}]+}/g, '$1');
    
    // Handle {@condition text|source} pattern
    text = text.replace(/{@condition ([^}|]+)(\|[^}]+)?}/g, '$1');
    
    // Handle {@spell text|source} pattern
    text = text.replace(/{@spell ([^}|]+)(\|[^}]+)?}/g, '$1');
    
    // Handle {@item text|source} pattern
    text = text.replace(/{@item ([^}|]+)(\|[^}]+)?}/g, '$1');
    
    // Handle {@creature text|source} pattern
    text = text.replace(/{@creature ([^}|]+)(\|[^}]+)?}/g, '$1');
    
    // Handle {@damage text} pattern
    text = text.replace(/{@damage ([^}]+)}/g, '$1');
    
    // Handle {@dice text} pattern
    text = text.replace(/{@dice ([^}]+)}/g, '$1');
    
    // Handle {@h} for hit
    text = text.replace(/{@h}/g, 'hit');
    
    // Handle {@atk text} pattern
    text = text.replace(/{@atk ([^}]+)}/g, '$1');
    
    // Handle generic {@tag text|source} pattern
    text = text.replace(/{@[a-z]+ ([^}|]+)(\|[^}]+)?}/g, '$1');
    
    // Clean up any remaining braces
    text = text.replace(/{([^}]+)}/g, '$1');
    
    return text.trim();
  }

  /**
   * Generate asset path for a given entity
   */
  protected generateAssetPath(type: string, name: string, extension = 'webp'): string {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toLowerCase();
    return `assets/${type}/${cleanName}.${extension}`;
  }

  /**
   * Log conversion progress
   */
  protected log(message: string, ...args: any[]): void {
    console.log(`[${this.constructor.name}] ${message}`, ...args);
  }

  /**
   * Abstract method that subclasses must implement
   */
  abstract convert(): Promise<WrapperConversionResult>;
}