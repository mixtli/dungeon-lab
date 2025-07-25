import { Types, ClientSession } from 'mongoose';
// Removed unused createHash import
import { logger } from '../../../utils/logger.mjs';
import { ZipProcessorService } from '../../../services/zip-processor.service.mjs';
import { transactionService } from '../../../services/transaction.service.mjs';
import { pluginRegistry } from '../../../services/plugin-registry.service.mjs';
import { createAsset } from '../../../utils/asset-upload.utils.mjs';
import { CompendiumModel } from '../models/compendium.model.mjs';
import { CompendiumEntryModel } from '../models/compendium-entry.model.mjs';
// Removed unused model imports
import type { CompendiumDocument } from './compendium.service.mjs';
import { ImportProgress, CompendiumManifest, ValidationResult } from '@dungeon-lab/shared/schemas/import.schema.mjs';

interface ProcessedContent {
  type: 'actor' | 'item' | 'vtt-document';
  subtype: string;
  name: string;
  data: unknown;
  originalPath: string;
  // New fields from wrapper format
  entryMetadata?: {
    imageId?: string;
    category?: string;
    tags?: string[];
    sortOrder?: number;
  };
}

interface ValidationPlugin {
  validateActorData?: (subtype: string, data: unknown) => { success: boolean; data?: unknown; error?: Error };
  validateItemData?: (subtype: string, data: unknown) => { success: boolean; data?: unknown; error?: Error };
  validateDocumentData?: (subtype: string, data: unknown) => { success: boolean; data?: unknown; error?: Error };
}

interface ProcessedImportData {
  compendium: {
    name: string;
    slug: string;
    description?: string;
    pluginId: string;
    version: string;
    createdBy: Types.ObjectId;
  };
  content: ProcessedContent[];
  assetFiles: Map<string, { buffer: Buffer; mimetype: string; originalPath: string }>;
  userId: string;
  compendiumName: string;
  uploadedAssets: string[];
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
        pluginId: manifest.pluginId
      });
      if (existingCompendium) {
        throw new Error(`A compendium named "${manifest.name}" already exists for plugin "${manifest.pluginId}"`);
      }

      // Stage 2: Validate content files
      this.updateProgress(progressCallback, {
        stage: 'validating',
        processedItems: 0,
        totalItems: processedZip.contentFiles.size,
        currentItem: 'Validating content files',
        errors: []
      });

      const { processedContent, errors: _validationErrors } = await this.processContentFiles(
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

      // Stage 3: Create compendium and content in transaction (assets uploaded on-demand)
      this.updateProgress(progressCallback, {
        stage: 'processing',
        processedItems: 0,
        totalItems: processedContent.length,
        currentItem: 'Creating compendium',
        errors: []
      });

      const compendium = await transactionService.withTransaction(async (session) => {
          return await this.createCompendiumIterative({
          compendium: {
            name: manifest.name,
            slug: manifest.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            description: manifest.description,
            pluginId: manifest.pluginId,
            version: manifest.version,
            createdBy: userObjectId
          },
          content: processedContent,
          assetFiles: processedZip.assetFiles,
          userId,
          compendiumName: manifest.name,
          uploadedAssets
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
      logger.info(`Import completed in ${duration}ms: ${processedContent.length} items`);

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
   * Create compendium and import content iteratively (one item at a time)
   */
  private async createCompendiumIterative(
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

    logger.info(`Starting iterative import of ${data.content.length} items`);
    
    let processedItems = 0;
    let successCount = 0;
    const totalItems = data.content.length;
    const errors: string[] = [];

    // Process each content item individually
    for (const contentItem of data.content) {
      try {
        await this.processContentItem(
          contentItem, 
          compendiumId, 
          data.assetFiles, 
          data.userId, 
          data.compendiumName, 
          data.uploadedAssets
        );
        successCount++;
        logger.info(`Successfully imported: ${contentItem.name} (${contentItem.type})`);
      } catch (error) {
        const errorMsg = `Failed to import ${contentItem.name}: ${error instanceof Error ? error.message : String(error)}`;
        logger.warn(errorMsg);
        errors.push(errorMsg);
      }

      processedItems++;
      if (progressCallback) {
        progressCallback(processedItems, totalItems);
      }
    }

    // Update compendium statistics
    const entriesByType: Record<string, number> = {};
    const compendiumEntries = await CompendiumEntryModel.find({ compendiumId });
    
    for (const entry of compendiumEntries) {
      const type = entry.embeddedContent?.type || 'unknown';
      entriesByType[type] = (entriesByType[type] || 0) + 1;
    }

    await CompendiumModel.findByIdAndUpdate(compendiumId, {
      totalEntries: successCount,
      entriesByType
    }, { session });

    logger.info(`Iterative import completed: ${successCount}/${totalItems} items imported successfully`);
    if (errors.length > 0) {
      logger.warn(`Import errors encountered: ${errors.length} items failed`);
    }

    return compendiumDoc;
  }

  /**
   * Process a single content item: validate, process images, and save to database
   */
  private async processContentItem(
    contentItem: ProcessedContent,
    compendiumId: string,
    assetFiles: Map<string, { buffer: Buffer; mimetype: string; originalPath: string }>,
    userId: string,
    compendiumName: string,
    uploadedAssets: string[]
  ): Promise<void> {
    // Process images and get processed content with asset IDs
    const { processedContent, processedImageIds } = await this.processContentImages(
      contentItem,
      assetFiles,
      userId,
      compendiumName,
      uploadedAssets
    );

    // Extract the actual content data from the processed result
    const contentData = processedContent.data as Record<string, unknown>;
    
    // Debug: Log the actual content data structure
    logger.info(`Processing ${contentItem.type} "${contentItem.name}": keys=${Object.keys(contentData)}`);
    if (contentItem.type === 'vtt-document') {
      logger.info(`VTT Document data:`, { 
        hasName: 'name' in contentData,
        hasSlug: 'slug' in contentData, 
        hasPluginId: 'pluginId' in contentData,
        hasDocumentType: 'documentType' in contentData,
        hasDescription: 'description' in contentData,
        hasData: 'data' in contentData,
        actualKeys: Object.keys(contentData)
      });
    }
    
    // For compendium imports, we don't create actual documents in the database
    // Instead, we create CompendiumEntry records with embedded content
    const compendiumEntry = new CompendiumEntryModel({
      compendiumId,
      embeddedContent: {
        type: contentItem.type === 'vtt-document' ? 'vttdocument' : contentItem.type,
        data: contentData
      },
      name: contentItem.name,
      tags: contentItem.entryMetadata?.tags || [],
      category: contentItem.entryMetadata?.category,
      sortOrder: contentItem.entryMetadata?.sortOrder || 0,
      imageId: contentItem.entryMetadata?.imageId ? processedImageIds.get(contentItem.entryMetadata.imageId) : undefined,
      metadata: {
        originalPath: contentItem.originalPath
      }
    });

    await compendiumEntry.save(); // This properly triggers pre-save middleware
  }

  /**
   * Process images for a single content item
   */
  private async processContentImages(
    contentItem: ProcessedContent,
    assetFiles: Map<string, { buffer: Buffer; mimetype: string; originalPath: string }>,
    userId: string,
    compendiumName: string,
    uploadedAssets: string[]
  ): Promise<{ processedContent: ProcessedContent; processedImageIds: Map<string, string> }> {
    const processedImageIds = new Map<string, string>();

    // Process entry-level image if present
    if (contentItem.entryMetadata?.imageId) {
      try {
        const assetId = await this.uploadAssetOnDemand(
          contentItem.entryMetadata.imageId,
          assetFiles,
          userId,
          compendiumName,
          uploadedAssets
        );
        if (assetId) {
          processedImageIds.set(contentItem.entryMetadata.imageId, assetId);
        }
      } catch (error) {
        logger.warn(`Failed to upload entry-level image ${contentItem.entryMetadata.imageId}:`, error);
      }
    }

    // Process content-level images
    const { processedData } = await this.processDocumentImages(
      contentItem.data as Record<string, unknown>, 
      assetFiles, 
      userId, 
      compendiumName, 
      uploadedAssets
    );

    return {
      processedContent: {
        ...contentItem,
        data: processedData
      },
      processedImageIds
    };
  }

  /**
   * Process and validate content files using plugin schemas
   */
  private async processContentFiles(
    contentFiles: Map<string, Buffer>,
    plugin: ValidationPlugin,
    progressCallback?: (processed: number, total: number) => void
  ): Promise<{ processedContent: ProcessedContent[]; errors: string[] }> {
    const processedContent: ProcessedContent[] = [];
    const errors: string[] = [];
    const totalFiles = contentFiles.size;
    let processedFiles = 0;

    for (const [filePath, buffer] of contentFiles) {
      try {
        const contentText = buffer.toString('utf-8');
        const fileData = JSON.parse(contentText);

        // Check if this is the new wrapper format
        let contentData: unknown;
        let entryMetadata: { imageId?: string; category?: string; tags?: string[]; sortOrder?: number } | undefined = undefined;
        
        if (fileData.entry && fileData.content) {
          // New wrapper format
          entryMetadata = {
            imageId: fileData.entry.imageId,
            category: fileData.entry.category,
            tags: fileData.entry.tags || [],
            sortOrder: fileData.entry.sortOrder || 0
          };
          contentData = fileData.content;
        } else {
          // Legacy format - content is directly in the file
          contentData = fileData;
        }

        // Determine content type from file path or data
        const { type, subtype } = this.determineContentType(filePath, contentData as { type?: string; documentType?: string; [key: string]: unknown });
        
        // Validate using plugin
        const validationResult = this.validateContent(plugin, type, subtype, contentData);
        
        if (!validationResult.success) {
          const errorMsg = `Validation failed for ${filePath}: ${validationResult.error?.message}`;
          logger.warn(errorMsg);
          errors.push(errorMsg);
        } else {
          processedContent.push({
            type,
            subtype,
            name: (contentData as { name?: string }).name || filePath,
            data: validationResult.data,
            originalPath: filePath,
            entryMetadata
          });
        }

        processedFiles++;
        progressCallback?.(processedFiles, totalFiles);

      } catch (error) {
        const errorMsg = `Failed to process content file ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
        logger.warn(errorMsg);
        errors.push(errorMsg);
        processedFiles++;
        progressCallback?.(processedFiles, totalFiles);
      }
    }

    return { processedContent, errors };
  }

  /**
   * Upload a single asset on-demand and return the asset ID
   */
  private async uploadAssetOnDemand(
    imagePath: string,
    assetFiles: Map<string, { buffer: Buffer; mimetype: string; originalPath: string }>,
    userId: string,
    compendiumName: string,
    uploadedAssets: string[]
  ): Promise<string | null> {
    logger.info(`uploadAssetOnDemand: Starting upload for "${imagePath}"`);
    logger.debug(`uploadAssetOnDemand: Parameters:`, {
      imagePath,
      userId,
      compendiumName,
      assetFilesHasPath: assetFiles.has(imagePath),
      totalAssetFiles: assetFiles.size,
      uploadedAssetsCount: uploadedAssets.length
    });

    try {
      const assetData = assetFiles.get(imagePath);
      if (!assetData) {
        logger.warn(`uploadAssetOnDemand: Asset not found in ZIP: ${imagePath}`);
        logger.debug(`uploadAssetOnDemand: Available assets: [${Array.from(assetFiles.keys()).slice(0, 10).join(', ')}${assetFiles.size > 10 ? '...' : ''}]`);
        return null;
      }

      logger.info(`uploadAssetOnDemand: Found asset data for "${imagePath}" - buffer size: ${assetData.buffer.length}, mimetype: ${assetData.mimetype}, originalPath: ${assetData.originalPath}`);

      // Create a File object from the buffer
      const file = new File([assetData.buffer], imagePath, { type: assetData.mimetype });
      logger.debug(`uploadAssetOnDemand: Created File object - name: ${file.name}, size: ${file.size}, type: ${file.type}`);
      
      // Upload to storage
      logger.info(`uploadAssetOnDemand: Calling createAsset with path "compendiums/${compendiumName}/assets" for user ${userId}`);
      const asset = await createAsset(
        file,
        `compendiums/${compendiumName}/assets`,
        userId
      );

      logger.info(`uploadAssetOnDemand: createAsset successful - asset.id: ${asset.id}, asset.path: ${asset.path}`);

      // Track for potential rollback
      uploadedAssets.push(asset.path);

      logger.info(`uploadAssetOnDemand: Upload complete: ${imagePath} -> ${asset.id}`);
      return asset.id.toString();

    } catch (error) {
      const errorMsg = `Failed to upload asset ${imagePath}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(`uploadAssetOnDemand: ${errorMsg}`);
      logger.debug(`uploadAssetOnDemand: Error details:`, error);
      return null;
    }
  }

  /**
   * Process image fields in document data and upload assets on-demand
   * Also handles entry-level imageId from wrapper format
   */
  private async processDocumentImages(
    docData: Record<string, unknown>,
    assetFiles: Map<string, { buffer: Buffer; mimetype: string; originalPath: string }>,
    userId: string,
    compendiumName: string,
    uploadedAssets: string[],
    entryMetadata?: { imageId?: string; category?: string; tags?: string[]; sortOrder?: number }
  ): Promise<{ processedData: Record<string, unknown>; entryImageId?: string }> {
    const processedData = { ...docData };
    const imageFields = ['imageId', 'avatarId', 'defaultTokenImageId'];

    logger.info(`processDocumentImages: Processing document "${docData.name || 'Unknown'}" with ${assetFiles.size} available assets`);
    // logger.debug(`processDocumentImages: Available asset paths: [${Array.from(assetFiles.keys()).join(', ')}]`);

    // Process entry-level imageId first (from wrapper format)
    let entryImageId: string | undefined;
    if (entryMetadata?.imageId) {
      logger.info(`processDocumentImages: Processing entry-level imageId = "${entryMetadata.imageId}"`);
      
      entryImageId = await this.uploadAssetOnDemand(
        entryMetadata.imageId,
        assetFiles,
        userId,
        compendiumName,
        uploadedAssets
      ) || undefined;
      
      logger.info(`processDocumentImages: Entry-level imageId result: ${entryImageId || 'null'}`);
    }

    // Process content-level image fields
    for (const field of imageFields) {
      if (processedData[field] && typeof processedData[field] === 'string') {
        const imagePath = processedData[field] as string;
        logger.info(`processDocumentImages: Found ${field} = "${imagePath}" in document "${docData.name || 'Unknown'}"`);
        
        logger.debug(`processDocumentImages: Calling uploadAssetOnDemand with:`, {
          imagePath,
          userId,
          compendiumName,
          assetFilesSize: assetFiles.size,
          uploadedAssetsCount: uploadedAssets.length
        });
        
        const assetId = await this.uploadAssetOnDemand(
          imagePath,
          assetFiles,
          userId,
          compendiumName,
          uploadedAssets
        );
        
        logger.info(`processDocumentImages: uploadAssetOnDemand returned: ${assetId || 'null'} for ${field} = "${imagePath}"`);
        
        if (assetId) {
          processedData[field] = assetId;
          logger.info(`processDocumentImages: Successfully mapped ${field}: ${imagePath} -> ${assetId}`);
        } else {
          // Remove the field if asset upload failed
          delete processedData[field];
          logger.warn(`processDocumentImages: Removed ${field} field due to failed asset upload: ${imagePath}`);
        }
      } else if (processedData[field]) {
        logger.debug(`processDocumentImages: Skipping ${field} - not a string (type: ${typeof processedData[field]})`);
      }
    }

    const resultImageFields = imageFields.filter(field => processedData[field]).map(field => `${field}=${processedData[field]}`);
    logger.info(`processDocumentImages: Final result for "${docData.name || 'Unknown'}": [${resultImageFields.join(', ')}]`);

    return { processedData, entryImageId };
  }

  // Removed unused createCompendiumWithContent method

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

  // Removed unused groupContentByType method

  // Removed unused calculateTypeStatistics method

  private updateProgress(callback: ((progress: ImportProgress) => void) | undefined, progress: ImportProgress) {
    if (callback) {
      callback(progress);
    }
  }
}

// Export singleton instance
export const importService = new ImportService();