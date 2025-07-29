/**
 * Base converter class for 5etools data conversion
 */
import { join } from 'path';
import { readFile } from 'fs/promises';
import { ETOOLS_DATA_PATH } from '../../config/constants.mjs';

export interface ConversionOptions {
  srdOnly?: boolean;
  includeAssets?: boolean;
  outputDir?: string;
}

export interface ConvertedContent {
  type: 'actor' | 'item' | 'document';
  subtype: string;
  name: string;
  data: unknown;
  originalPath?: string;
  assetPath?: string;
}

export interface ConversionResult {
  success: boolean;
  content?: ConvertedContent[];
  error?: Error;
  stats?: {
    total: number;
    converted: number;
    skipped: number;
    errors: number;
  };
}

export abstract class BaseConverter {
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
  protected async readDataFile<T = unknown>(relativePath: string): Promise<T> {
    const fullPath = join(ETOOLS_DATA_PATH, relativePath);
    const data = await readFile(fullPath, 'utf-8');
    return JSON.parse(data) as T;
  }

  /**
   * Filter content to SRD only if option is enabled
   * 
   * The 2024 D&D content (XPHB source) is included in SRD via the srd52 flag.
   * This ensures legal compliance while providing access to core 2024 rules.
   * 
   * @param data Array of 5etools data objects
   * @returns Filtered array containing only SRD content when srdOnly=true
   */
  protected filterSrdContent<T extends { srd52?: boolean }>(data: T[]): T[] {
    if (!this.options.srdOnly) {
      return data;
    }
    // srd52 flag indicates content is part of the 2024 SRD
    return data.filter(item => item.srd52 === true);
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
    return `${type}/${cleanName}.${extension}`;
  }

  /**
   * Log conversion progress
   */
  protected log(message: string, ...args: unknown[]): void {
    console.log(`[${this.constructor.name}] ${message}`, ...args);
  }

  /**
   * Abstract method that subclasses must implement
   */
  abstract convert(): Promise<ConversionResult>;
}