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
      status: 'published',
      isPublic: false,
      statistics: {
        totalEntries: data.content.length,
        entriesByType: this.calculateTypeStatistics(data.content)
      }
    }], { session });

    const compendiumDoc = compendium[0] as CompendiumDocument;
    const compendiumId = compendiumDoc.id;

    // Process content by type
    const contentByType = this.groupContentByType(data.content);
    let processedItems = 0;
    const totalItems = data.content.length;

    // Create actors
    if (contentByType.actor.length > 0) {
      const actors = await ActorModel.create(
        contentByType.actor.map(item => ({
          ...(item.data as Record<string, unknown>),
          compendiumId,
          createdBy: data.compendium.createdBy
        })),
        { session }
      );

      // Create compendium entries for actors
      await CompendiumEntryModel.create(
        actors.map((actor, index) => ({
          compendiumId,
          contentType: 'actor',
          contentId: actor._id,
          name: contentByType.actor[index].name,
          tags: [],
          metadata: { originalPath: contentByType.actor[index].originalPath }
        })),
        { session }
      );

      processedItems += actors.length;
      progressCallback?.(processedItems, totalItems);
    }

    // Create items
    if (contentByType.item.length > 0) {
      const items = await ItemModel.create(
        contentByType.item.map(item => ({
          ...(item.data as Record<string, unknown>),
          compendiumId,
          createdBy: data.compendium.createdBy
        })),
        { session }
      );

      await CompendiumEntryModel.create(
        items.map((item, index) => ({
          compendiumId,
          contentType: 'item',
          contentId: item._id,
          name: contentByType.item[index].name,
          tags: [],
          metadata: { originalPath: contentByType.item[index].originalPath }
        })),
        { session }
      );

      processedItems += items.length;
      progressCallback?.(processedItems, totalItems);
    }

    // Create VTT documents
    if (contentByType['vtt-document'].length > 0) {
      const documents = await VTTDocumentModel.create(
        contentByType['vtt-document'].map(item => ({
          ...(item.data as Record<string, unknown>),
          compendiumId,
          createdBy: data.compendium.createdBy
        })),
        { session }
      );

      await CompendiumEntryModel.create(
        documents.map((doc, index) => ({
          compendiumId,
          contentType: 'vtt-document',
          contentId: doc._id,
          name: contentByType['vtt-document'][index].name,
          tags: [],
          metadata: { originalPath: contentByType['vtt-document'][index].originalPath }
        })),
        { session }
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
        { session }
      );
    }

    return compendiumDoc;
  }

  private determineContentType(filePath: string, data: { type?: string; [key: string]: unknown }): { type: 'actor' | 'item' | 'vtt-document'; subtype: string } {
    // Try to determine from file path first
    const pathParts = filePath.split('/');
    if (pathParts.length > 1) {
      const directory = pathParts[0];
      if (directory === 'actors') return { type: 'actor', subtype: data.type || 'character' };
      if (directory === 'items') return { type: 'item', subtype: data.type || 'equipment' };
      if (['spells', 'classes', 'backgrounds', 'races', 'feats'].includes(directory)) {
        return { type: 'vtt-document', subtype: directory.slice(0, -1) }; // Remove 's' from plural
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