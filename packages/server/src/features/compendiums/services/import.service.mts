import { Types, ClientSession } from 'mongoose';
import type { ICompendium } from '@dungeon-lab/shared/types/index.mjs';
import { logger } from '../../../utils/logger.mjs';
import { ZipProcessorService } from '../../../services/zip-processor.service.mjs';
import { transactionService } from '../../../services/transaction.service.mjs';
import { createAsset } from '../../../utils/asset-upload.utils.mjs';
import { CompendiumModel } from '../models/compendium.model.mjs';
import { CompendiumEntryModel } from '../models/compendium-entry.model.mjs';
// Removed unused model imports
import { ImportProgress, CompendiumManifest, ValidationResult } from '@dungeon-lab/shared/schemas/import.schema.mjs';
import { 
  contentFileWrapperSchema,
  actorSchema,
  itemSchema, 
  vttDocumentSchema,
  characterSchema
} from '@dungeon-lab/shared/schemas/index.mjs';

interface ProcessedContent {
  entry: {
    name: string;
    documentType: 'actor' | 'item' | 'vtt-document' | 'character';
    imageId?: string;
    category?: string;
    tags?: string[];
    sortOrder?: number;
  };
  content: unknown; // The actual document data
  originalPath: string;
}

// Using ValidationResult from shared schema (imported above)
// Internal validation result for schema validation with data
interface InternalValidationResult {
  success: boolean;
  data?: unknown;
  error?: Error;
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
  existingCompendium?: InstanceType<typeof CompendiumModel> | null;
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
  ): Promise<ICompendium> {
    const startTime = Date.now();
    const userObjectId = new Types.ObjectId(userId);
    const uploadedAssets: string[] = [];
    let existingCompendium: InstanceType<typeof CompendiumModel> | null = null;

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

      // Note: Server-side validation of known schemas, plugin-specific data remains flexible

      // Check for existing compendium - we'll update it instead of throwing an error
      existingCompendium = await CompendiumModel.findOne({
        name: manifest.name,
        pluginId: manifest.pluginId
      });
      
      if (existingCompendium) {
        logger.info(`Found existing compendium "${manifest.name}" - will update it with new content`);
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
          return await this.createOrUpdateCompendiumIterative({
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
          uploadedAssets,
          existingCompendium
        }, session, (processed, total) => this.updateProgress(progressCallback, {
          stage: 'processing',
          processedItems: processed,
          totalItems: total,
          currentItem: existingCompendium ? 'Updating content' : 'Creating content',
          errors: []
        }));
      });

      // Stage 5: Complete
      const duration = Date.now() - startTime;
      const operation = existingCompendium ? 'Update' : 'Import';
      logger.info(`${operation} completed in ${duration}ms: ${processedContent.length} items`);

      this.updateProgress(progressCallback, {
        stage: 'complete',
        processedItems: processedContent.length,
        totalItems: processedContent.length,
        currentItem: `${operation} complete`,
        errors: []
      });

      return compendium;

    } catch (error) {
      logger.error('Import failed:', error);

      // Cleanup uploaded assets on failure
      if (uploadedAssets.length > 0) {
        await transactionService.rollbackAssets(uploadedAssets);
      }

      const operation = existingCompendium ? 'Update' : 'Import';
      this.updateProgress(progressCallback, {
        stage: 'error',
        processedItems: 0,
        totalItems: 0,
        currentItem: `${operation} failed`,
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
   * Create or update compendium and import content iteratively (one item at a time)
   */
  private async createOrUpdateCompendiumIterative(
    data: ProcessedImportData,
    session: ClientSession,
    progressCallback?: (processed: number, total: number) => void
  ): Promise<ICompendium> {
    let compendiumDoc: InstanceType<typeof CompendiumModel>;
    let compendiumId: string;

    if (data.existingCompendium) {
      // Update existing compendium manifest data
      const updatedDoc = await CompendiumModel.findByIdAndUpdate(
        (data.existingCompendium as any)._id, // eslint-disable-line @typescript-eslint/no-explicit-any
        {
          description: data.compendium.description,
          version: data.compendium.version,
          status: 'active', // Ensure it's active
          // Keep existing createdBy, name, slug, pluginId
          updatedAt: new Date()
        },
        { session, new: true }
      );
      
      if (!updatedDoc) {
        throw new Error('Failed to update existing compendium');
      }
      
      compendiumDoc = updatedDoc;
      compendiumId = compendiumDoc.id;
      
      // Clear existing entries (we'll replace them with the new content)
      const existingEntryCount = await CompendiumEntryModel.countDocuments({ compendiumId });
      await CompendiumEntryModel.deleteMany({ compendiumId }, { session });
      logger.info(`Cleared ${existingEntryCount} existing entries for update`);
    } else {
      // Create new compendium
      const compendium = await CompendiumModel.create([{
        ...data.compendium,
        status: 'active',
        isPublic: false,
        totalEntries: 0, // Will be updated after entries are created
        entriesByType: {}
      }], { session });

      compendiumDoc = compendium[0];
      compendiumId = compendiumDoc.id;
    }

    logger.info(`Starting iterative ${data.existingCompendium ? 'update' : 'import'} of ${data.content.length} items`);
    
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
        logger.info(`Successfully imported: ${contentItem.entry.name} (${contentItem.entry.documentType})`);
      } catch (error) {
        const errorMsg = `Failed to import ${contentItem.entry.name} (${contentItem.entry.documentType}): ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMsg);
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
      const type = entry.entry?.documentType || 'unknown';
      entriesByType[type] = (entriesByType[type] || 0) + 1;
    }

    await CompendiumModel.findByIdAndUpdate(compendiumId, {
      totalEntries: successCount,
      entriesByType
    }, { session });

    logger.info(`Iterative ${data.existingCompendium ? 'update' : 'import'} completed: ${successCount}/${totalItems} items ${data.existingCompendium ? 'updated' : 'imported'} successfully`);
    if (errors.length > 0) {
      logger.warn(`${data.existingCompendium ? 'Update' : 'Import'} errors encountered: ${errors.length} items failed`);
    }

    return compendiumDoc.toObject() as ICompendium;
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

    // Create CompendiumEntry using the new entry+content structure (no transformation needed!)
    const compendiumEntry = new CompendiumEntryModel({
      compendiumId,
      entry: {
        name: processedContent.entry.name,
        documentType: processedContent.entry.documentType, // Direct from upload, no mapping bugs!
        category: processedContent.entry.category,
        tags: processedContent.entry.tags || [],
        sortOrder: processedContent.entry.sortOrder || 0,
        imageId: processedContent.entry.imageId ? processedImageIds.get(processedContent.entry.imageId) : undefined
      },
      content: processedContent.content, // Direct save, no transformation
      sourceData: {
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
    if (contentItem.entry.imageId) {
      try {
        const assetId = await this.uploadAssetOnDemand(
          contentItem.entry.imageId,
          assetFiles,
          userId,
          compendiumName,
          uploadedAssets
        );
        if (assetId) {
          processedImageIds.set(contentItem.entry.imageId, assetId);
        }
      } catch (error) {
        logger.warn(`Failed to upload entry-level image ${contentItem.entry.imageId}:`, error);
      }
    }

    // Process content-level images
    const { processedData } = await this.processDocumentImages(
      contentItem.content as Record<string, unknown>, 
      assetFiles, 
      userId, 
      compendiumName, 
      uploadedAssets
    );

    return {
      processedContent: {
        entry: contentItem.entry,
        content: processedData,
        originalPath: contentItem.originalPath
      },
      processedImageIds
    };
  }

  /**
   * Process and validate content files using server schemas
   */
  private async processContentFiles(
    contentFiles: Map<string, Buffer>,
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

        // Step 1: Validate wrapper format using server schema
        const wrapperValidation = contentFileWrapperSchema.safeParse(fileData);
        if (!wrapperValidation.success) {
          const errorMsg = `Invalid file format: ${filePath} - ${wrapperValidation.error.message}`;
          logger.warn(errorMsg);
          errors.push(errorMsg);
          processedFiles++;
          progressCallback?.(processedFiles, totalFiles);
          continue;
        }

        const { entry, content } = wrapperValidation.data;

        // Step 2: Validate content against appropriate server schema based on documentType
        const contentValidation = this.validateContentAgainstSchema(entry.documentType, content);
        
        if (!contentValidation.success) {
          const errorMsg = `Content validation failed for ${filePath}: ${contentValidation.error?.message}`;
          logger.warn(errorMsg);
          errors.push(errorMsg);
          processedFiles++;
          progressCallback?.(processedFiles, totalFiles);
          continue;
        }

        // Add validated content to processed list
        processedContent.push({
          entry,
          content: contentValidation.data,
          originalPath: filePath
        });

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
    try {
      const assetData = assetFiles.get(imagePath);
      if (!assetData) {
        return null;
      }

      // Create a File object from the buffer
      const file = new File([assetData.buffer], imagePath, { type: assetData.mimetype });
      
      // Upload to storage
      const asset = await createAsset(
        file,
        `compendiums/${compendiumName}/assets`,
        userId
      );

      // Track for potential rollback
      uploadedAssets.push(asset.path);
      return asset.id.toString();

    } catch (error) {
      logger.error(`Failed to upload asset ${imagePath}: ${error instanceof Error ? error.message : String(error)}`);
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
    const imageFields = ['imageId', 'avatarId', 'tokenImageId'];

    // Process entry-level imageId first (from wrapper format)
    let entryImageId: string | undefined;
    if (entryMetadata?.imageId) {
      entryImageId = await this.uploadAssetOnDemand(
        entryMetadata.imageId,
        assetFiles,
        userId,
        compendiumName,
        uploadedAssets
      ) || undefined;
    }

    // Process content-level image fields
    for (const field of imageFields) {
      if (processedData[field] && typeof processedData[field] === 'string') {
        const imagePath = processedData[field] as string;
        
        const assetId = await this.uploadAssetOnDemand(
          imagePath,
          assetFiles,
          userId,
          compendiumName,
          uploadedAssets
        );
        
        if (assetId) {
          processedData[field] = assetId;
        } else {
          // Remove the field if asset upload failed
          delete processedData[field];
          logger.warn(`Failed to upload asset: ${imagePath}`);
        }
      }
    }

    // Fallback: If tokenImageId is not set but imageId is, set tokenImageId to the same as imageId
    if (!processedData.tokenImageId && processedData.imageId) {
      processedData.tokenImageId = processedData.imageId;
      logger.info(`Applied tokenImageId fallback for document: ${docData.name || 'unnamed'}`);
    }

    // Images processed (detailed logging removed for cleaner output)

    return { processedData, entryImageId };
  }

  // Removed unused createCompendiumWithContent method

  // REMOVED: determineContentType method - no longer needed!
  // Content type is now taken directly from entry.type in the upload format

  /**
   * Validate content against the appropriate server schema based on document type
   */
  private validateContentAgainstSchema(documentType: string, data: unknown): InternalValidationResult {
    try {
      let schema;
      
      switch (documentType) {
        case 'actor':
          schema = actorSchema;
          break;
        case 'item':
          schema = itemSchema;
          break;
        case 'vtt-document':
          schema = vttDocumentSchema;
          break;
        case 'character':
          schema = characterSchema;
          break;
        default:
          return { 
            success: false, 
            error: new Error(`Unknown document type: ${documentType}`) 
          };
      }

      // Use safeParse to validate against the schema
      const result = schema.safeParse(data);
      
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return { 
          success: false, 
          error: new Error(`Schema validation failed: ${result.error.message}`) 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error(String(error)) 
      };
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