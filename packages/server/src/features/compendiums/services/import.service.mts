import { Types, ClientSession } from 'mongoose';
import { logger } from '../../../utils/logger.mjs';
import { ZipProcessorService } from '../../../services/zip-processor.service.mjs';
import { transactionService } from '../../../services/transaction.service.mjs';
import { pluginRegistry } from '../../../services/plugin-registry.service.mjs';
import { createAsset } from '../../../utils/asset-upload.utils.mjs';
import { CompendiumModel } from '../models/compendium.model.mjs';
import { CompendiumEntryModel } from '../models/compendium-entry.model.mjs';
import { ActorModel } from '../../actors/models/actor.model.mjs';
import { ItemModel } from '../../items/models/item.model.mjs';
import { VTTDocumentModel } from '../../documents/models/vtt-document.model.mjs';
import { AssetModel } from '../../assets/models/asset.model.mjs';
import type { CompendiumDocument } from './compendium.service.mjs';
import { ImportProgress, CompendiumManifest, ValidationResult, AssetMapping } from '@dungeon-lab/shared/schemas/import.schema.mjs';

interface ProcessedContent {
  type: 'actor' | 'item' | 'vtt-document';
  subtype: string;
  name: string;
  data: unknown;
  originalPath: string;
}

interface ValidationPlugin {
  validateActorData?: (subtype: string, data: unknown) => { success: boolean; data?: unknown; error?: Error };
  validateItemData?: (subtype: string, data: unknown) => { success: boolean; data?: unknown; error?: Error };
  validateDocumentData?: (subtype: string, data: unknown) => { success: boolean; data?: unknown; error?: Error };
}

interface ProcessedImportData {
  compendium: {
    name: string;
    description?: string;
    gameSystemId: string;
    pluginId: string;
    version: string;
    createdBy: Types.ObjectId;
  };
  content: ProcessedContent[];
  assets: AssetMapping[];
}

export class ImportService {
  private zipProcessor = new ZipProcessorService();

  /**
   * Import a compendium from a ZIP file
   */
  async importFromZip(
    zipBuffer: Buffer,
    userId: string,
    progressCallback?: (progress: ImportProgress) => void
  ): Promise<CompendiumDocument> {
    const startTime = Date.now();
    const userObjectId = new Types.ObjectId(userId);
    const uploadedAssets: string[] = [];

    try {
      // Stage 1: Validate and process ZIP
      this.updateProgress(progressCallback, {
        stage: 'validating',
        processedItems: 0,
        totalItems: 0,
        currentItem: 'Processing ZIP file',
        errors: []
      });

      const processedZip = await this.zipProcessor.processZipFile(zipBuffer);
      const manifest = processedZip.manifest;

      // Validate plugin exists
      const plugin = pluginRegistry.getPlugin(manifest.pluginId);
      if (!plugin) {
        throw new Error(`Plugin not found: ${manifest.pluginId}`);
      }

      // Check for duplicate compendium name
      const existingCompendium = await CompendiumModel.findOne({
        name: manifest.name,
        gameSystemId: manifest.gameSystemId
      });
      if (existingCompendium) {
        throw new Error(`A compendium named "${manifest.name}" already exists for game system "${manifest.gameSystemId}"`);
      }

      // Stage 2: Validate content files
      this.updateProgress(progressCallback, {
        stage: 'validating',
        processedItems: 0,
        totalItems: processedZip.contentFiles.size,
        currentItem: 'Validating content files',
        errors: []
      });

      const processedContent = await this.processContentFiles(
        processedZip.contentFiles, 
        plugin,
        (processed, total) => this.updateProgress(progressCallback, {
          stage: 'validating',
          processedItems: processed,
          totalItems: total,
          currentItem: 'Validating content',
          errors: []
        })
      );

      // Stage 3: Upload assets
      this.updateProgress(progressCallback, {
        stage: 'uploading',
        processedItems: 0,
        totalItems: processedZip.assetFiles.size,
        currentItem: 'Uploading assets',
        errors: []
      });

      const assetMappings = await this.uploadAssets(
        processedZip.assetFiles,
        userId,
        manifest.name,
        uploadedAssets,
        (uploaded, total) => this.updateProgress(progressCallback, {
          stage: 'uploading',
          processedItems: uploaded,
          totalItems: total,
          currentItem: 'Uploading assets',
          errors: []
        })
      );

      // Stage 4: Create compendium and content in transaction
      this.updateProgress(progressCallback, {
        stage: 'processing',
        processedItems: 0,
        totalItems: processedContent.length,
        currentItem: 'Creating compendium',
        errors: []
      });

      const compendium = await transactionService.withTransaction(async (session) => {
          return await this.createCompendiumWithContent({
          compendium: {
            name: manifest.name,
            description: manifest.description,
            gameSystemId: manifest.gameSystemId,
            pluginId: manifest.pluginId,
            version: manifest.version,
            createdBy: userObjectId
          },
          content: processedContent,
          assets: assetMappings
        }, session, (processed, total) => this.updateProgress(progressCallback, {
          stage: 'processing',
          processedItems: processed,
          totalItems: total,
          currentItem: 'Creating content',
          errors: []
        }));
      });

      // Stage 5: Complete
      const duration = Date.now() - startTime;
      logger.info(`Import completed in ${duration}ms: ${processedContent.length} items, ${assetMappings.length} assets`);

      this.updateProgress(progressCallback, {
        stage: 'complete',
        processedItems: processedContent.length,
        totalItems: processedContent.length,
        currentItem: 'Import complete',
        errors: []
      });

      return compendium;

    } catch (error) {
      logger.error('Import failed:', error);

      // Cleanup uploaded assets on failure
      if (uploadedAssets.length > 0) {
        await transactionService.rollbackAssets(uploadedAssets);
      }

      this.updateProgress(progressCallback, {
        stage: 'error',
        processedItems: 0,
        totalItems: 0,
        currentItem: 'Import failed',
        errors: [error instanceof Error ? error.message : String(error)]
      });

      throw error;
    }
  }

  /**
   * Validate manifest only (lightweight validation)
   */
  async validateManifest(zipBuffer: Buffer): Promise<{ manifest: CompendiumManifest; validation: ValidationResult }> {
    return await this.zipProcessor.validateManifestOnly(zipBuffer);
  }

  /**
   * Process and validate content files using plugin schemas
   */
  private async processContentFiles(
    contentFiles: Map<string, Buffer>,
    plugin: ValidationPlugin,
    progressCallback?: (processed: number, total: number) => void
  ): Promise<ProcessedContent[]> {
    const processedContent: ProcessedContent[] = [];
    const totalFiles = contentFiles.size;
    let processedFiles = 0;

    for (const [filePath, buffer] of contentFiles) {
      try {
        const contentText = buffer.toString('utf-8');
        const contentData = JSON.parse(contentText);

        // Determine content type from file path or data
        const { type, subtype } = this.determineContentType(filePath, contentData);
        
        // Validate using plugin
        const validationResult = this.validateContent(plugin, type, subtype, contentData);
        
        if (!validationResult.success) {
          throw new Error(`Validation failed for ${filePath}: ${validationResult.error?.message}`);
        }

        processedContent.push({
          type,
          subtype,
          name: contentData.name || filePath,
          data: validationResult.data,
          originalPath: filePath
        });

        processedFiles++;
        progressCallback?.(processedFiles, totalFiles);

      } catch (error) {
        logger.error(`Failed to process content file ${filePath}:`, error);
        throw new Error(`Content processing failed for ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return processedContent;
  }

  /**
   * Upload assets to storage and create asset records
   */
  private async uploadAssets(
    assetFiles: Map<string, { buffer: Buffer; mimetype: string; originalPath: string }>,
    userId: string,
    compendiumName: string,
    uploadedAssets: string[],
    progressCallback?: (uploaded: number, total: number) => void
  ): Promise<AssetMapping[]> {
    const assetMappings: AssetMapping[] = [];
    const totalAssets = assetFiles.size;
    let uploadedCount = 0;

    for (const [relativePath, assetData] of assetFiles) {
      try {
        // Create a File object from the buffer
        const file = new File([assetData.buffer], relativePath, { type: assetData.mimetype });
        
        // Upload to storage
        const asset = await createAsset(
          file,
          `compendiums/${compendiumName}/assets`,
          userId
        );

        // Track for potential rollback
        uploadedAssets.push(asset.path);

        assetMappings.push({
          originalPath: assetData.originalPath,
          storageKey: asset.path,
          publicUrl: asset.url,
          assetId: asset.id.toString()
        });

        uploadedCount++;
        progressCallback?.(uploadedCount, totalAssets);

      } catch (error) {
        logger.error(`Failed to upload asset ${relativePath}:`, error);
        throw new Error(`Asset upload failed for ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return assetMappings;
  }

  /**
   * Create compendium and all content within a transaction
   */
  private async createCompendiumWithContent(
    data: ProcessedImportData,
    session: ClientSession,
    progressCallback?: (processed: number, total: number) => void
  ): Promise<CompendiumDocument> {
    // Create compendium
    const compendium = await CompendiumModel.create([{
      ...data.compendium,
      status: 'active',
      isPublic: false,
      totalEntries: 0, // Will be updated after entries are created
      entriesByType: {}
    }], { session });

    const compendiumDoc = compendium[0] as CompendiumDocument;
    const compendiumId = compendiumDoc.id;

    // Process content by type
    const contentByType = this.groupContentByType(data.content);
    logger.info(`Content grouped by type:`, {
      actors: contentByType.actor?.length || 0,
      items: contentByType.item?.length || 0,
      documents: contentByType['vtt-document']?.length || 0,
      total: data.content.length
    });
    let processedItems = 0;
    const totalItems = data.content.length;

    // Create actors
    if (contentByType.actor.length > 0) {
      logger.info(`Creating ${contentByType.actor.length} actors`);
      try {
        const actorDocs = contentByType.actor.map(item => {
          const actorData = item.data as Record<string, unknown>;
          const { data: nestedData, gameSystemId, type, pluginId, name, avatarId: _avatarId, defaultTokenImageId: _defaultTokenImageId, ...otherFields } = actorData;
          const doc = {
            gameSystemId: gameSystemId || data.compendium.gameSystemId,
            type,
            pluginId: pluginId || data.compendium.pluginId,
            name,
            data: nestedData,
            ...otherFields,
            compendiumId,
            createdBy: data.compendium.createdBy
          };
          return doc;
        });
        
        const actors = await ActorModel.create(actorDocs, { ordered: true });
        logger.info(`Successfully created ${actors.length} actors`);
        
        // Create compendium entries for actors
        await CompendiumEntryModel.create(
          actors.map((actor, index) => ({
            compendiumId,
            contentType: 'Actor',
            contentId: actor._id,
            name: contentByType.actor[index].name,
            tags: [],
            metadata: { originalPath: contentByType.actor[index].originalPath }
          })),
          { ordered: true }
        );

        processedItems += actors.length;
        progressCallback?.(processedItems, totalItems);
      } catch (error) {
        logger.error(`Failed to create actors:`, error);
        throw error;
      }
    }

    // Create items
    if (contentByType.item.length > 0) {
      logger.info(`Creating ${contentByType.item.length} items`);
      try {
        const itemDocs = contentByType.item.map(item => {
          const itemData = item.data as Record<string, unknown>;
          const { data: nestedData, gameSystemId, type, pluginId, name, ...otherFields } = itemData;
          const doc = {
            gameSystemId: gameSystemId || data.compendium.gameSystemId,
            type,
            pluginId: pluginId || data.compendium.pluginId,
            name,
            data: nestedData,
            ...otherFields,
            compendiumId,
            createdBy: data.compendium.createdBy
          };
          return doc;
        });
        
        const items = await ItemModel.create(itemDocs, { ordered: true });
        logger.info(`Successfully created ${items.length} items`);

        await CompendiumEntryModel.create(
          items.map((item, index) => ({
            compendiumId,
            contentType: 'Item',
            contentId: item._id,
            name: contentByType.item[index].name,
            tags: [],
            metadata: { originalPath: contentByType.item[index].originalPath }
          })),
          { ordered: true }
        );

        processedItems += items.length;
        progressCallback?.(processedItems, totalItems);
      } catch (error) {
        logger.error(`Failed to create items:`, error);
        throw error;
      }
    }

    // Create VTT documents
    if (contentByType['vtt-document'].length > 0) {
      logger.info(`Creating ${contentByType['vtt-document'].length} VTT documents`);
      const documents = await VTTDocumentModel.create(
        contentByType['vtt-document'].map(item => {
          const docData = item.data as Record<string, unknown>;
          const { data: nestedData, pluginId, documentType, name, slug, description, ...otherFields } = docData;
          return {
            pluginId: pluginId || data.compendium.pluginId,
            documentType,
            name,
            slug,
            description: description || 'No description available',
            data: nestedData,
            ...otherFields,
            compendiumId,
            createdBy: data.compendium.createdBy
          };
        }),
        { ordered: true }
      );

      await CompendiumEntryModel.create(
        documents.map((doc, index) => ({
          compendiumId,
          contentType: 'VTTDocument',
          contentId: doc._id,
          name: contentByType['vtt-document'][index].name,
          tags: [],
          metadata: { originalPath: contentByType['vtt-document'][index].originalPath }
        })),
        { ordered: true }
      );

      processedItems += documents.length;
      progressCallback?.(processedItems, totalItems);
    }

    // Create asset records
    if (data.assets.length > 0) {
      await AssetModel.create(
        data.assets.map(asset => ({
          path: asset.storageKey,
          url: asset.publicUrl,
          size: 0, // Will be updated by storage service
          type: 'image/unknown',
          name: asset.originalPath.split('/').pop() || 'unknown',
          createdBy: data.compendium.createdBy,
          compendiumId
        })),
        { ordered: true }
      );
    }

    // Update compendium statistics after all entries are created
    const totalEntries = data.content.length;
    const entriesByType = this.calculateTypeStatistics(data.content);
    
    await CompendiumModel.findByIdAndUpdate(
      compendiumId,
      {
        totalEntries,
        entriesByType
      },
      { session }
    );
    
    // Update the returned document with the correct statistics
    compendiumDoc.totalEntries = totalEntries;
    compendiumDoc.entriesByType = entriesByType;

    return compendiumDoc;
  }

  private determineContentType(filePath: string, data: { type?: string; documentType?: string; [key: string]: unknown }): { type: 'actor' | 'item' | 'vtt-document'; subtype: string } {
    // Check data structure first - more reliable than file path
    if ('documentType' in data && data.documentType) {
      return { type: 'vtt-document', subtype: data.documentType as string };
    }
    
    // Try to determine from file path
    const pathParts = filePath.split('/');
    if (pathParts.length > 1) {
      const directory = pathParts[0];
      if (directory === 'actors') return { type: 'actor', subtype: data.type || 'character' };
      if (directory === 'items') return { type: 'item', subtype: data.type || 'equipment' };
      if (directory === 'documents' || ['spells', 'classes', 'backgrounds', 'races', 'feats'].includes(directory)) {
        return { type: 'vtt-document', subtype: data.documentType as string || directory.slice(0, -1) };
      }
    }

    // Fall back to data inspection
    if (data.type) {
      if (['character', 'npc', 'vehicle'].includes(data.type)) {
        return { type: 'actor', subtype: data.type };
      }
      if (['weapon', 'armor', 'equipment', 'consumable', 'tool', 'loot'].includes(data.type)) {
        return { type: 'item', subtype: data.type };
      }
      if (['spell', 'class', 'background', 'race', 'feat'].includes(data.type)) {
        return { type: 'vtt-document', subtype: data.type };
      }
    }

    // Default fallback
    return { type: 'item', subtype: 'equipment' };
  }

  private validateContent(plugin: ValidationPlugin, type: string, subtype: string, data: unknown): { success: boolean; data?: unknown; error?: Error } {
    switch (type) {
      case 'actor':
        return plugin.validateActorData?.(subtype, data) || { success: true, data };
      case 'item':
        return plugin.validateItemData?.(subtype, data) || { success: true, data };
      case 'vtt-document':
        return plugin.validateDocumentData?.(subtype, data) || { success: true, data };
      default:
        return { success: false, error: new Error(`Unknown content type: ${type}`) };
    }
  }

  private groupContentByType(content: ProcessedContent[]) {
    return content.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {} as Record<string, ProcessedContent[]>);
  }

  private calculateTypeStatistics(content: ProcessedContent[]) {
    return content.reduce((acc, item) => {
      const key = `${item.type}s`; // Pluralize
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private updateProgress(callback: ((progress: ImportProgress) => void) | undefined, progress: ImportProgress) {
    if (callback) {
      callback(progress);
    }
  }
}

// Export singleton instance
export const importService = new ImportService();