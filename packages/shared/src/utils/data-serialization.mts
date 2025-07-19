/**
 * Data Serialization Utilities
 * 
 * Multi-format serialization and deserialization for game data
 */

import type { CharacterData, Item, Spell, CampaignData } from '../types/game-data.mjs';

/**
 * Base interface for game entities
 */
export interface BaseGameEntity {
  id: string;
  name: string;
  type: string;
  version?: string;
  [key: string]: unknown;
}

/**
 * Serialization format options
 */
export type SerializationFormat = 'json' | 'yaml' | 'xml' | 'binary' | 'compressed';

/**
 * Serialization options
 */
export interface SerializationOptions {
  format: SerializationFormat;
  prettyPrint?: boolean;
  includeMetadata?: boolean;
  excludeFields?: string[];
  includeOnly?: string[];
  transformers?: Record<string, (value: unknown) => unknown>;
}

/**
 * Deserialization options
 */
export interface DeserializationOptions {
  format?: SerializationFormat;
  migrate?: boolean;
  validate?: boolean;
  transformers?: Record<string, (value: unknown) => unknown>;
  defaults?: Record<string, unknown>;
}

/**
 * Migration rule for data transformations
 */
export interface MigrationRule {
  name: string;
  fromVersion: string;
  toVersion: string;
  migrate: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  validate?: (data: Record<string, unknown>) => boolean;
}

/**
 * Game data serialization and deserialization class
 */
export class GameDataSerializer {
  private migrationRules: Map<string, MigrationRule[]> = new Map();
  
  /**
   * Serialize entity to string
   */
  async serialize<T extends BaseGameEntity>(
    entity: T,
    options: SerializationOptions = { format: 'json' }
  ): Promise<string> {
    let data: Record<string, unknown> = { ...entity };
    
    // Apply transformers
    if (options.transformers) {
      data = this.applyTransformers(data, options.transformers);
    }
    
    // Exclude fields
    if (options.excludeFields) {
      data = this.excludeFields(data, options.excludeFields);
    }
    
    // Include only specific fields
    if (options.includeOnly) {
      data = this.includeOnlyFields(data, options.includeOnly);
    }
    
    // Add metadata
    if (options.includeMetadata) {
      data._metadata = {
        serializedAt: new Date().toISOString(),
        format: options.format,
        version: this.getCurrentVersion(),
        serializer: 'GameDataSerializer'
      };
    }
    
    // Serialize based on format
    switch (options.format) {
      case 'json':
        return JSON.stringify(data, null, options.prettyPrint ? 2 : 0);
        
      case 'yaml':
        return this.toYaml(data);
        
      case 'xml':
        return this.toXml(data);
        
      case 'binary':
        return this.toBinary(data);
        
      case 'compressed':
        const json = JSON.stringify(data);
        return this.compress(json);
        
      default:
        throw new Error(`Unsupported serialization format: ${options.format}`);
    }
  }
  
  /**
   * Deserialize string to entity
   */
  async deserialize<T extends BaseGameEntity>(
    data: string,
    entityType: string,
    options: DeserializationOptions = {}
  ): Promise<T> {
    let parsed: Record<string, unknown>;
    
    // Parse based on format
    const format = options.format || this.detectFormat(data);
    
    switch (format) {
      case 'json':
        parsed = JSON.parse(data);
        break;
        
      case 'yaml':
        parsed = this.fromYaml(data);
        break;
        
      case 'xml':
        parsed = this.fromXml(data);
        break;
        
      case 'binary':
        parsed = this.fromBinary(data);
        break;
        
      case 'compressed':
        const decompressed = this.decompress(data);
        parsed = JSON.parse(decompressed);
        break;
        
      default:
        throw new Error(`Unsupported deserialization format: ${format}`);
    }
    
    // Apply migrations if needed
    if (options.migrate) {
      parsed = await this.migrateData(parsed, entityType);
    }
    
    // Apply transformers
    if (options.transformers) {
      parsed = this.applyTransformers(parsed, options.transformers);
    }
    
    // Apply defaults
    if (options.defaults) {
      parsed = this.applyDefaults(parsed, options.defaults);
    }
    
    // Remove metadata
    if (parsed._metadata) {
      delete parsed._metadata;
    }
    
    // Validate if requested
    if (options.validate) {
      await this.validateEntity(parsed, entityType);
    }
    
    return parsed as T;
  }
  
  /**
   * Serialize character data
   */
  async serializeCharacter(
    character: CharacterData,
    options: SerializationOptions = { format: 'json' }
  ): Promise<string> {
    return this.serialize(character, options);
  }
  
  /**
   * Deserialize character data
   */
  async deserializeCharacter(
    data: string,
    options: DeserializationOptions = {}
  ): Promise<CharacterData> {
    return this.deserialize<CharacterData>(data, 'character', options);
  }
  
  /**
   * Serialize item data
   */
  async serializeItem(
    item: Item,
    options: SerializationOptions = { format: 'json' }
  ): Promise<string> {
    return this.serialize(item, options);
  }
  
  /**
   * Deserialize item data
   */
  async deserializeItem(
    data: string,
    options: DeserializationOptions = {}
  ): Promise<Item> {
    return this.deserialize<Item>(data, 'item', options);
  }
  
  /**
   * Serialize spell data
   */
  async serializeSpell(
    spell: Spell,
    options: SerializationOptions = { format: 'json' }
  ): Promise<string> {
    return this.serialize(spell, options);
  }
  
  /**
   * Deserialize spell data
   */
  async deserializeSpell(
    data: string,
    options: DeserializationOptions = {}
  ): Promise<Spell> {
    return this.deserialize<Spell>(data, 'spell', options);
  }
  
  /**
   * Serialize campaign data
   */
  async serializeCampaign(
    campaign: CampaignData,
    options: SerializationOptions = { format: 'json' }
  ): Promise<string> {
    return this.serialize(campaign, options);
  }
  
  /**
   * Deserialize campaign data
   */
  async deserializeCampaign(
    data: string,
    options: DeserializationOptions = {}
  ): Promise<CampaignData> {
    return this.deserialize<CampaignData>(data, 'campaign', options);
  }
  
  /**
   * Register migration rule
   */
  registerMigration(entityType: string, rule: MigrationRule): void {
    if (!this.migrationRules.has(entityType)) {
      this.migrationRules.set(entityType, []);
    }
    
    this.migrationRules.get(entityType)!.push(rule);
    
    // Sort by version order
    this.migrationRules.get(entityType)!.sort((a, b) => 
      this.compareVersions(a.fromVersion, b.fromVersion)
    );
  }
  
  /**
   * Migrate data to current version
   */
  private async migrateData(
    data: Record<string, unknown>,
    entityType: string
  ): Promise<Record<string, unknown>> {
    const currentVersion = this.getCurrentVersion();
    const dataVersion = (data._metadata as any)?.version || '1.0.0';
    
    if (dataVersion === currentVersion) {
      return data;
    }
    
    const migrations = this.migrationRules.get(entityType) || [];
    let migratedData = { ...data };
    let version = dataVersion;
    
    for (const migration of migrations) {
      if (this.compareVersions(version, migration.fromVersion) >= 0 &&
          this.compareVersions(migration.toVersion, currentVersion) <= 0) {
        
        migratedData = await migration.migrate(migratedData);
        version = migration.toVersion;
        
        // Validate if specified
        if (migration.validate && !migration.validate(migratedData)) {
          throw new Error(`Migration '${migration.name}' validation failed`);
        }
      }
    }
    
    return migratedData;
  }
  
  /**
   * Apply field transformers
   */
  private applyTransformers(
    data: Record<string, unknown>,
    transformers: Record<string, (value: unknown) => unknown>
  ): Record<string, unknown> {
    const result = { ...data };
    
    for (const [field, transformer] of Object.entries(transformers)) {
      if (field in result) {
        result[field] = transformer(result[field]);
      }
    }
    
    return result;
  }
  
  /**
   * Exclude specified fields
   */
  private excludeFields(
    data: Record<string, unknown>,
    fields: string[]
  ): Record<string, unknown> {
    const result = { ...data };
    
    for (const field of fields) {
      delete result[field];
    }
    
    return result;
  }
  
  /**
   * Include only specified fields
   */
  private includeOnlyFields(
    data: Record<string, unknown>,
    fields: string[]
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const field of fields) {
      if (field in data) {
        result[field] = data[field];
      }
    }
    
    return result;
  }
  
  /**
   * Apply default values
   */
  private applyDefaults(
    data: Record<string, unknown>,
    defaults: Record<string, unknown>
  ): Record<string, unknown> {
    const result = { ...data };
    
    for (const [field, defaultValue] of Object.entries(defaults)) {
      if (!(field in result)) {
        result[field] = defaultValue;
      }
    }
    
    return result;
  }
  
  /**
   * Detect data format
   */
  private detectFormat(data: string): SerializationFormat {
    // Try to detect format from content
    const trimmed = data.trim();
    
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }
    
    if (trimmed.startsWith('---') || /^\w+:\s/.test(trimmed)) {
      return 'yaml';
    }
    
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
      return 'xml';
    }
    
    // Default to JSON
    return 'json';
  }
  
  /**
   * Get current data version
   */
  private getCurrentVersion(): string {
    return '2.0.0'; // Current plugin architecture version
  }
  
  /**
   * Compare version strings
   */
  private compareVersions(a: string, b: string): number {
    const parseVersion = (version: string) => 
      version.split('.').map(num => parseInt(num, 10));
    
    const aParts = parseVersion(a);
    const bParts = parseVersion(b);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }
    
    return 0;
  }
  
  /**
   * Validate entity (placeholder)
   */
  private async validateEntity(
    data: Record<string, unknown>,
    entityType: string
  ): Promise<void> {
    // This would integrate with the validation system
    // For now, just check basic structure
    
    if (!data.id || !data.name || !data.type) {
      throw new Error(`Invalid ${entityType}: missing required fields`);
    }
  }
  
  /**
   * Convert to YAML (placeholder)
   */
  private toYaml(data: Record<string, unknown>): string {
    // This would use a YAML library like js-yaml
    throw new Error('YAML serialization not implemented');
  }
  
  /**
   * Convert from YAML (placeholder)
   */
  private fromYaml(data: string): Record<string, unknown> {
    // This would use a YAML library like js-yaml
    throw new Error('YAML deserialization not implemented');
  }
  
  /**
   * Convert to XML (placeholder)
   */
  private toXml(data: Record<string, unknown>): string {
    // Basic XML conversion (would be more sophisticated in practice)
    throw new Error('XML serialization not implemented');
  }
  
  /**
   * Convert from XML (placeholder)
   */
  private fromXml(data: string): Record<string, unknown> {
    // Basic XML parsing (would be more sophisticated in practice)
    throw new Error('XML deserialization not implemented');
  }
  
  /**
   * Convert to binary (placeholder)
   */
  private toBinary(data: Record<string, unknown>): string {
    // This would use MessagePack or similar
    throw new Error('Binary serialization not implemented');
  }
  
  /**
   * Convert from binary (placeholder)
   */
  private fromBinary(data: string): Record<string, unknown> {
    // This would use MessagePack or similar
    throw new Error('Binary deserialization not implemented');
  }
  
  /**
   * Compress data (placeholder)
   */
  private compress(data: string): string {
    // This would use a compression library like pako
    throw new Error('Compression not implemented');
  }
  
  /**
   * Decompress data (placeholder)
   */
  private decompress(data: string): string {
    // This would use a compression library like pako
    throw new Error('Decompression not implemented');
  }
}

/**
 * Default serializer instance
 */
export const gameDataSerializer = new GameDataSerializer();

/**
 * Data transformation utilities
 */
export class DataTransformUtils {
  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }
    
    if (typeof obj === 'object') {
      const cloned = {} as Record<string, unknown>;
      for (const [key, value] of Object.entries(obj)) {
        cloned[key] = this.deepClone(value);
      }
      return cloned as T;
    }
    
    return obj;
  }
  
  /**
   * Merge objects deeply
   */
  static deepMerge<T extends Record<string, unknown>>(
    target: T,
    ...sources: Partial<T>[]
  ): T {
    if (!sources.length) return target;
    
    const source = sources.shift();
    if (!source) return this.deepMerge(target, ...sources);
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {} as T[Extract<keyof T, string>];
        }
        this.deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        );
      } else {
        target[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
    
    return this.deepMerge(target, ...sources);
  }
  
  /**
   * Get nested property value
   */
  static getNestedProperty(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      return current && typeof current === 'object' 
        ? (current as Record<string, unknown>)[key] 
        : undefined;
    }, obj as unknown);
  }
  
  /**
   * Set nested property value
   */
  static setNestedProperty(
    obj: Record<string, unknown>,
    path: string,
    value: unknown
  ): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key] as Record<string, unknown>;
    }, obj);
    
    target[lastKey] = value;
  }
  
  /**
   * Flatten nested object
   */
  static flatten(
    obj: Record<string, unknown>,
    prefix = '',
    separator = '.'
  ): Record<string, unknown> {
    const flattened: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}${separator}${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, this.flatten(value as Record<string, unknown>, newKey, separator));
      } else {
        flattened[newKey] = value;
      }
    }
    
    return flattened;
  }
  
  /**
   * Unflatten object
   */
  static unflatten(
    obj: Record<string, unknown>,
    separator = '.'
  ): Record<string, unknown> {
    const unflattened: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      this.setNestedProperty(unflattened, key.replace(new RegExp(separator, 'g'), '.'), value);
    }
    
    return unflattened;
  }
}