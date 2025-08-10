import path from 'path';
import fs from 'fs/promises';
import { LevelDBReaderService } from './services/leveldb-reader.mjs';
import { FoundryTransformerService, type PluginTypeMapping } from './services/transformer.mjs';
import { FoundryAssetProcessorService } from './services/asset-processor.mjs';
import { TokenMappingService } from './services/token-mapping.mjs';
import { logger } from './utils/logger.mjs';
import { actorSchema, itemSchema, vttDocumentSchema } from '@dungeon-lab/shared/schemas/index.mjs';

export interface ConverterOptions {
  systemId: string;
  processAssets?: boolean;
  validate?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface ConversionResult {
  packName: string;
  outputPath: string;
  stats: {
    total: number;
    actors: number;
    items: number;
    documents: number;
    assets: number;
    skipped: number;
    errors: number;
  };
  errors: Array<{ documentId: string; error: string }>;
}

export interface PackManifest {
  name: string;
  slug: string;
  description?: string;
  version: string;
  gameSystemId: string;
  pluginId: string;
  authors?: string[];
  license?: string;
  contentTypes: string[];
  assetDirectory: string;
  contentDirectory: string;
  // Legacy fields for backwards compatibility
  author?: string;
  convertedAt?: string;
  sourceType?: 'foundry';
  contents?: {
    actors: number;
    items: number;
    documents: number;
    assets: number;
  };
}

export class FoundryConverter {
  private plugin: any;
  private typeMapping: PluginTypeMapping | null = null;
  private leveldbReader: LevelDBReaderService;
  private transformer: FoundryTransformerService | null = null;
  private assetProcessor: FoundryAssetProcessorService | null = null;
  private tokenMappingService: TokenMappingService | null = null;

  constructor(private options: ConverterOptions) {
    this.leveldbReader = new LevelDBReaderService();
  }

  async loadPlugin(): Promise<void> {
    try {
      logger.debug(`Loading plugin: ${this.options.systemId}`);
      
      // Import foundry mapping directly to avoid Vue dependencies
      const mappingModule = await import(`@dungeon-lab/plugin-${this.options.systemId}/src/types/foundry-mapping.mjs`);
      
      // Extract type mapping functions
      this.typeMapping = {
        getTargetType: mappingModule.getTargetType,
        getTargetSubtype: mappingModule.getTargetSubtype,
        shouldSkipType: mappingModule.shouldSkipType,
        getDocumentType: mappingModule.getDocumentType
      };

      // Get validation functions if available
      if (this.options.validate) {
        try {
          const validationModule = await import(`@dungeon-lab/plugin-${this.options.systemId}/src/types/validation.mjs`);
          this.plugin = {
            validateActorData: validationModule.validateActorData,
            validateItemData: validationModule.validateItemData,
            validateDocumentData: validationModule.validateDocumentData || validationModule.validateVTTDocumentData
          };
        } catch {
          logger.warn('Validation functions not available, skipping validation');
          this.options.validate = false;
        }
      }

      // Initialize services with plugin mapping
      this.transformer = new FoundryTransformerService(this.typeMapping);
      
      logger.debug('Plugin loaded successfully');
    } catch (error) {
      throw new Error(`Failed to load plugin '${this.options.systemId}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async convertPack(packPath: string, outputPath: string): Promise<ConversionResult> {
    if (!this.transformer || !this.typeMapping) {
      throw new Error('Plugin not loaded. Call loadPlugin() first.');
    }

    const packName = path.basename(packPath);
    const result: ConversionResult = {
      packName,
      outputPath,
      stats: {
        total: 0,
        actors: 0,
        items: 0,
        documents: 0,
        assets: 0,
        skipped: 0,
        errors: 0
      },
      errors: []
    };

    try {
      // Read pack metadata
      logger.debug(`Reading pack metadata from: ${packPath}`);
      const metadata = await this.leveldbReader.readPackMetadata(packPath);
      
      // Initialize token mapping service if processing assets
      if (this.options.processAssets && !this.tokenMappingService) {
        // Get system path from pack path
        const systemPath = packPath.includes('/packs/') 
          ? packPath.split('/packs/')[0]
          : path.dirname(packPath);
        
        this.tokenMappingService = new TokenMappingService(systemPath);
        await this.tokenMappingService.loadMappings();
      }
      
      // Read all documents from pack
      logger.debug(`Reading documents from pack...`);
      const documents = await this.leveldbReader.readPack(packPath);
      
      // Read actor inventory items if this is an actors pack
      let actorItems: any[] = [];
      if (packPath.includes('actors')) {
        logger.debug(`Reading actor inventory items from pack...`);
        actorItems = await this.leveldbReader.readActorItems(packPath);
        logger.debug(`Found ${actorItems.length} actor inventory items in pack`);
      }
      
      result.stats.total = documents.length + actorItems.length;
      logger.debug(`Found ${documents.length} documents and ${actorItems.length} actor items in pack`);

      // Transform documents
      const transformResult = this.transformer.transformDocuments(documents);
      
      // Transform actor items if any
      let actorItemsResult: any = { content: [], skipped: 0, errors: [], assetReferences: new Set() };
      if (actorItems.length > 0) {
        actorItemsResult = this.transformer.transformActorItems(actorItems);
        
        // Merge results
        transformResult.content.push(...actorItemsResult.content);
        transformResult.skipped += actorItemsResult.skipped;
        transformResult.errors.push(...actorItemsResult.errors);
        actorItemsResult.assetReferences.forEach((ref: string) => {
          transformResult.assetReferences.add(ref);
        });
      }
      
      // Process transformed content
      const actorMap = new Map<string, any>();
      const itemMap = new Map<string, any>();
      const documentMap = new Map<string, any>();
      const invalidDocuments = new Map<string, { content: any; error: string; targetType: string }>();
      
      // Process transformed content
      for (const content of transformResult.content) {
        // Validate if requested
        if (this.options.validate && this.plugin) {
          const validationResult = await this.validateContent(content);
          if (!validationResult.success) {
            const errorMessage = validationResult.error?.message || 'Validation failed';
            logger.debug(`Validation failed for ${content.originalId}: ${errorMessage}`);
            
            // Store invalid document for debugging
            invalidDocuments.set(content.originalId, {
              content: this.transformToSharedSchemaFormat(content),
              error: errorMessage,
              targetType: content.targetType
            });
            
            result.errors.push({
              documentId: content.originalId,
              error: errorMessage
            });
            result.stats.errors++;
            continue;
          }
        }

        // Categorize by type
        switch (content.targetType) {
          case 'Actor': {
            const transformedActor = this.transformToSharedSchemaFormat(content);
            this.applyTokenMapping(content, transformedActor, 'dnd5e.actors24');
            actorMap.set(content.originalId, transformedActor);
            result.stats.actors++;
            break;
          }
          case 'Item':
            itemMap.set(content.originalId, this.transformToSharedSchemaFormat(content));
            result.stats.items++;
            break;
          case 'VTTDocument':
            documentMap.set(content.originalId, this.transformToSharedSchemaFormat(content));
            result.stats.documents++;
            break;
        }
      }

      result.stats.skipped = transformResult.skipped;
      result.stats.errors += transformResult.errors.length;
      result.errors.push(...transformResult.errors);

      // Process assets if requested
      let assetMapping = new Map<string, string>();
      if (this.options.processAssets && transformResult.assetReferences.size > 0) {
        logger.debug(`Processing ${transformResult.assetReferences.size} asset references...`);
        assetMapping = await this.processAssets(packPath, outputPath, transformResult.assetReferences);
        result.stats.assets = assetMapping.size;
      }

      // Write output files if not dry run
      if (!this.options.dryRun) {
        await this.writeOutput(outputPath, {
          metadata,
          actors: actorMap,
          items: itemMap,
          documents: documentMap,
          assetMapping,
          invalidDocuments
        });
      }

      return result;

    } catch (error) {
      logger.error(`Failed to convert pack ${packName}:`, error);
      throw error;
    } finally {
      await this.leveldbReader.closeAllDatabases();
    }
  }

  private async validateContent(content: any): Promise<{ success: boolean; error?: Error }> {
    if (!this.plugin) return { success: true };

    try {
      // Convert TransformedContent to shared schema format
      const sharedSchemaData = this.transformToSharedSchemaFormat(content);
      
      // Layer 1: Validate against shared schema (omitting id field for conversion)
      let sharedSchemaResult;
      switch (content.targetType) {
        case 'Actor':
          sharedSchemaResult = actorSchema.omit({ id: true }).safeParse(sharedSchemaData);
          break;
        case 'Item':
          sharedSchemaResult = itemSchema.omit({ id: true }).safeParse(sharedSchemaData);
          break;
        case 'VTTDocument':
          sharedSchemaResult = vttDocumentSchema.omit({ id: true }).safeParse(sharedSchemaData);
          break;
        default:
          return { success: true };
      }

      if (!sharedSchemaResult.success) {
        return { 
          success: false, 
          error: new Error(`Shared schema validation failed: ${JSON.stringify(sharedSchemaResult.error.issues, null, 2)}`)
        };
      }

      // Layer 2: Validate data field against plugin schema
      const pluginDataValidation = content.data.system || content.data;
      let pluginResult;
      switch (content.targetType) {
        case 'Actor':
          pluginResult = await this.plugin.validateActorData(content.subtype, pluginDataValidation);
          break;
        case 'Item':
          pluginResult = await this.plugin.validateItemData(content.subtype, pluginDataValidation);
          break;
        case 'VTTDocument':
          pluginResult = await this.plugin.validateDocumentData(content.subtype, pluginDataValidation);
          break;
        default:
          return { success: true };
      }

      if (!pluginResult || !pluginResult.success) {
        return { 
          success: false, 
          error: pluginResult?.error || new Error('Plugin validation failed')
        };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Validation failed') 
      };
    }
  }

  /**
   * Transform TransformedContent to the format expected by shared schemas
   */
  private transformToSharedSchemaFormat(content: any): any {
    switch (content.targetType) {
      case 'Actor':
        return {
          name: content.name,
          type: content.subtype,
          data: content.data.system || content.data
        };
        
      case 'Item':
        return {
          name: content.name,
          type: content.subtype,
          data: content.data.system || content.data
        };
        
      case 'VTTDocument':
        return {
          name: content.name,
          slug: this.generateSlug(content.name),
          documentType: content.subtype,
          description: content.data.description || '',
          data: content.data.system || content.data
        };
        
      default:
        return content.data;
    }
  }

  /**
   * Apply token mapping to transformed actor
   */
  private applyTokenMapping(content: any, transformedActor: any, packName: string): void {
    if (!this.tokenMappingService?.isLoaded()) {
      return;
    }

    // Try to get mapping for this actor
    const tokenMapping = this.tokenMappingService.getTokenMapping(packName, content.originalId);
    
    let avatarPath: string | null = null;
    let tokenPath: string | null = null;

    if (tokenMapping) {
      // Use explicit mapping
      avatarPath = tokenMapping.actor || null;
      
      if (typeof tokenMapping.token === 'string') {
        tokenPath = tokenMapping.token;
      } else if (tokenMapping.token?.texture?.src) {
        tokenPath = tokenMapping.token.texture.src;
      }
      
      logger.debug(`Applied token mapping for ${content.originalId}: avatar=${avatarPath}, token=${tokenPath}`);
    } else {
      // Try fallback mapping
      const fallbackToken = this.tokenMappingService.getFallbackToken(content.name);
      if (fallbackToken) {
        avatarPath = fallbackToken;
        tokenPath = fallbackToken;
        logger.debug(`Applied fallback token mapping for ${content.name}: ${fallbackToken}`);
      }
    }

    // Add asset references to transformed actor
    if (avatarPath) {
      transformedActor.avatarId = this.generateAssetId(avatarPath);
    }
    
    if (tokenPath) {
      transformedActor.tokenImageId = this.generateAssetId(tokenPath);
    }
  }

  /**
   * Generate a relative asset path from asset path
   * This allows the pack importer to resolve the actual file location
   */
  private generateAssetId(assetPath: string): string {
    // Use the actual filename as copied to assets folder
    // This creates a relative path like "assets/BrownBear.webp"
    const filename = path.basename(assetPath);
    return `assets/${filename}`;
  }

  /**
   * Generate a URL-friendly slug from a document name
   * Converts to lowercase, replaces spaces with hyphens, removes special characters
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  private async processAssets(
    packPath: string, 
    outputPath: string, 
    assetReferences: Set<string>
  ): Promise<Map<string, string>> {
    if (!this.assetProcessor) {
      this.assetProcessor = new FoundryAssetProcessorService();
    }
    
    // Get additional asset paths from token mappings
    let additionalAssetPaths: string[] = [];
    if (this.tokenMappingService?.isLoaded()) {
      additionalAssetPaths = this.tokenMappingService.getAllMappedTokenPaths();
      logger.info(`Found ${additionalAssetPaths.length} additional assets from token mappings`);
    }
    
    logger.info(`Processing ${assetReferences.size} asset references from documents and ${additionalAssetPaths.length} from token mappings...`);
    
    // Get the system base directory from pack path
    const systemBaseDir = path.dirname(packPath);
    
    return await this.assetProcessor.processAssetsFromDirectory(
      systemBaseDir,
      outputPath,
      assetReferences,
      additionalAssetPaths
    );
  }

  private async writeOutput(
    outputPath: string,
    data: {
      metadata: any;
      actors: Map<string, any>;
      items: Map<string, any>;
      documents: Map<string, any>;
      assetMapping: Map<string, string>;
      invalidDocuments?: Map<string, { content: any; error: string; targetType: string }>;
    }
  ): Promise<void> {
    // Create output directories
    await fs.mkdir(path.join(outputPath, 'content', 'actors'), { recursive: true });
    await fs.mkdir(path.join(outputPath, 'content', 'items'), { recursive: true });
    await fs.mkdir(path.join(outputPath, 'content', 'documents'), { recursive: true });
    await fs.mkdir(path.join(outputPath, 'assets'), { recursive: true });

    // Determine content types based on what's included
    const contentTypes: string[] = [];
    if (data.actors.size > 0) contentTypes.push('actors');
    if (data.items.size > 0) contentTypes.push('items');
    if (data.documents.size > 0) {
      // Determine document types from first few documents
      const docTypes = new Set<string>();
      for (const [, doc] of Array.from(data.documents.entries()).slice(0, 10)) {
        if (doc.type) docTypes.add(doc.type);
      }
      contentTypes.push(...docTypes);
    }
    
    // Write manifest
    const compendiumName = data.metadata?.label || path.basename(outputPath);
    const manifest: PackManifest = {
      name: compendiumName,
      slug: this.generateSlug(compendiumName),
      description: `Converted from Foundry pack: ${data.metadata?.name || 'unknown'}`,
      version: '1.0.0',
      gameSystemId: 'dnd-5e-2024',
      pluginId: 'dnd-5e-2024',
      authors: ['Foundry Converter'],
      license: 'MIT',
      contentTypes,
      assetDirectory: 'assets',
      contentDirectory: 'content',
      // Legacy fields for backwards compatibility
      author: 'Foundry Converter',
      convertedAt: new Date().toISOString(),
      sourceType: 'foundry',
      contents: {
        actors: data.actors.size,
        items: data.items.size,
        documents: data.documents.size,
        assets: data.assetMapping.size
      }
    };

    await fs.writeFile(
      path.join(outputPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Write actors
    for (const [id, actor] of data.actors) {
      const filename = this.sanitizeFilename(`${id}-${actor.name}.json`);
      await fs.writeFile(
        path.join(outputPath, 'content', 'actors', filename),
        JSON.stringify(actor, null, 2)
      );
    }

    // Write items  
    for (const [id, item] of data.items) {
      const filename = this.sanitizeFilename(`${id}-${item.name}.json`);
      await fs.writeFile(
        path.join(outputPath, 'content', 'items', filename),
        JSON.stringify(item, null, 2)
      );
    }

    // Write documents
    for (const [id, doc] of data.documents) {
      const filename = this.sanitizeFilename(`${id}-${doc.name}.json`);
      await fs.writeFile(
        path.join(outputPath, 'content', 'documents', filename),
        JSON.stringify(doc, null, 2)
      );
    }

    // Write asset mapping
    if (data.assetMapping.size > 0) {
      await fs.writeFile(
        path.join(outputPath, 'assets', 'mapping.json'),
        JSON.stringify(Object.fromEntries(data.assetMapping), null, 2)
      );
    }

    // Write invalid documents for debugging
    if (data.invalidDocuments && data.invalidDocuments.size > 0) {
      // Create invalid subdirectories
      await fs.mkdir(path.join(outputPath, 'content', 'actors', 'invalid'), { recursive: true });
      await fs.mkdir(path.join(outputPath, 'content', 'items', 'invalid'), { recursive: true });
      await fs.mkdir(path.join(outputPath, 'content', 'documents', 'invalid'), { recursive: true });

      for (const [id, invalidDoc] of data.invalidDocuments) {
        const filename = this.sanitizeFilename(`${id}-${invalidDoc.content.name}.json`);
        const errorFilename = this.sanitizeFilename(`${id}-${invalidDoc.content.name}.errors.json`);
        
        // Determine which subdirectory to use
        let subdirectory: string;
        switch (invalidDoc.targetType) {
          case 'Actor':
            subdirectory = 'actors';
            break;
          case 'Item':
            subdirectory = 'items';
            break;
          case 'VTTDocument':
            subdirectory = 'documents';
            break;
          default:
            subdirectory = 'documents'; // fallback
        }

        // Write the invalid document
        await fs.writeFile(
          path.join(outputPath, 'content', subdirectory, 'invalid', filename),
          JSON.stringify(invalidDoc.content, null, 2)
        );

        // Write the validation error
        const errorData = {
          documentId: id,
          documentName: invalidDoc.content.name,
          targetType: invalidDoc.targetType,
          validationError: invalidDoc.error,
          timestamp: new Date().toISOString()
        };

        await fs.writeFile(
          path.join(outputPath, 'content', subdirectory, 'invalid', errorFilename),
          JSON.stringify(errorData, null, 2)
        );
      }

      logger.info(`Wrote ${data.invalidDocuments.size} invalid documents to debug directories`);
    }
  }

  private sanitizeFilename(filename: string): string {
    // Replace invalid filename characters
    return filename
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .substring(0, 255); // Limit filename length
  }
}