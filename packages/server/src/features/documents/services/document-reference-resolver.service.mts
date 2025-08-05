import { Types } from 'mongoose';
import { logger } from '../../../utils/logger.mjs';
import { TemplateService } from '../../compendiums/services/template.service.mjs';
import { CompendiumEntryModel } from '../../compendiums/models/compendium-entry.model.mjs';
import { DocumentModel } from '../models/document.model.mjs';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';

/**
 * Result of document reference resolution attempt
 */
export interface DocumentResolutionAttempt {
  success: boolean;
  resolvedObjectId?: Types.ObjectId;
  action?: 'kept_existing' | 'resolved_to_document' | 'created_document';
  reason?: 'document_exists' | 'document_found' | 'document_created' | 'compendium_not_found';
  error?: string;
}

/**
 * Results of resolving document references
 */
export interface DocumentResolutionResult {
  processed: number;
  resolved: number;
  created: number;
  errors: number;
  details: DocumentResolutionDetail[];
}

/**
 * Details about a specific resolution attempt
 */
export interface DocumentResolutionDetail {
  documentId: Types.ObjectId;
  fieldPath: string;
  originalObjectId: string;
  resolvedObjectId?: string;
  action: 'kept_existing' | 'resolved_to_document' | 'created_document' | 'error';
  error?: string;
}

/**
 * Service for resolving ObjectId references in documents to ensure they point to documents rather than compendium entries
 */
export class DocumentReferenceResolverService {
  private templateService = new TemplateService();

  /**
   * Resolves references in multiple documents
   */
  async resolveDocumentReferences(
    documentIds: Types.ObjectId[],
    userId: string
  ): Promise<DocumentResolutionResult> {
    logger.info(`Starting document reference resolution for ${documentIds.length} documents`);

    const result: DocumentResolutionResult = {
      processed: 0,
      resolved: 0,
      created: 0,
      errors: 0,
      details: []
    };

    // Build mapping of compendiumEntryId -> documentId for all existing documents
    const documentMapping = await this.buildDocumentMapping();
    logger.info(`Built document mapping with ${documentMapping.size} entries`);

    // Process each document
    for (const documentId of documentIds) {
      try {
        await this.resolveDocumentReferencesById(documentId, documentMapping, userId, result);
        result.processed++;
      } catch (error) {
        logger.error(`Failed to resolve references for document ${documentId}:`, error);
        result.errors++;
        result.details.push({
          documentId,
          fieldPath: 'root',
          originalObjectId: documentId.toString(),
          action: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info(`Document reference resolution completed: ${result.processed} processed, ${result.resolved} resolved, ${result.created} created, ${result.errors} errors`);
    return result;
  }

  /**
   * Builds a mapping of compendiumEntryId -> documentId for fast lookups
   */
  private async buildDocumentMapping(): Promise<Map<string, Types.ObjectId>> {
    const documents = await DocumentModel.find({
      compendiumEntryId: { $exists: true }
    }).select('_id compendiumEntryId').lean();

    const mapping = new Map<string, Types.ObjectId>();
    for (const doc of documents) {
      if (doc.compendiumEntryId) {
        mapping.set(doc.compendiumEntryId, doc._id);
      }
    }

    return mapping;
  }

  /**
   * Resolves references in a single document
   */
  private async resolveDocumentReferencesById(
    documentId: Types.ObjectId,
    documentMapping: Map<string, Types.ObjectId>,
    userId: string,
    result: DocumentResolutionResult
  ): Promise<void> {
    const document = await DocumentModel.findById(documentId).lean();
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Process the document content recursively
    const processedContent = await this.processValueForObjectIdReferences(
      document,
      documentMapping,
      userId,
      result,
      documentId,
      ''
    );

    // Update the document if any changes were made
    if (processedContent !== document) {
      await DocumentModel.findByIdAndUpdate(
        documentId,
        processedContent as any, // Type assertion needed due to complex discriminated union
        { new: true }
      );
    }
  }

  /**
   * Recursively processes a value to find and resolve ObjectId references
   */
  private async processValueForObjectIdReferences(
    value: unknown,
    documentMapping: Map<string, Types.ObjectId>,
    userId: string,
    result: DocumentResolutionResult,
    documentId: Types.ObjectId,
    fieldPath: string
  ): Promise<unknown> {
    // Check if this is an ObjectId string
    if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
      const resolution = await this.resolveObjectIdReference(value, documentMapping, userId);
      
      if (resolution.success && resolution.resolvedObjectId) {
        const resolvedId = resolution.resolvedObjectId.toString();
        
        if (resolvedId !== value) {
          // ObjectId was changed - track the resolution
          result.resolved++;
          
          if (resolution.action === 'created_document') {
            result.created++;
          }
          
          result.details.push({
            documentId,
            fieldPath,
            originalObjectId: value,
            resolvedObjectId: resolvedId,
            action: resolution.action!
          });
          
          return resolvedId;
        }
      } else if (!resolution.success && resolution.error) {
        // Resolution failed - this should only happen during auto-creation failures
        result.errors++;
        result.details.push({
          documentId,
          fieldPath,
          originalObjectId: value,
          action: 'error',
          error: resolution.error
        });
        
        // Return original value - don't convert to unresolved reference
        return value;
      }
      
      // Return original value if no change needed
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      const processedArray = [];
      for (let i = 0; i < value.length; i++) {
        const processedItem = await this.processValueForObjectIdReferences(
          value[i],
          documentMapping,
          userId,
          result,
          documentId,
          `${fieldPath}[${i}]`
        );
        processedArray.push(processedItem);
      }
      return processedArray;
    }

    // Handle objects
    if (value && typeof value === 'object' && value.constructor === Object) {
      const processedObject: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        processedObject[key] = await this.processValueForObjectIdReferences(
          val,
          documentMapping,
          userId,
          result,
          documentId,
          fieldPath ? `${fieldPath}.${key}` : key
        );
      }
      return processedObject;
    }

    // Return primitive values unchanged
    return value;
  }


  /**
   * Attempts to resolve a single ObjectId reference using the smart algorithm
   */
  private async resolveObjectIdReference(
    objectIdString: string,
    documentMapping: Map<string, Types.ObjectId>,
    userId: string
  ): Promise<DocumentResolutionAttempt> {
    const objectId = new Types.ObjectId(objectIdString);

    // Step 1: Check if document with this ObjectId exists
    const existingDocument = await DocumentModel.findById(objectId).select('_id').lean();
    if (existingDocument) {
      return {
        success: true,
        resolvedObjectId: objectId,
        action: 'kept_existing',
        reason: 'document_exists'
      };
    }

    // Step 2: Check if any document has this ObjectId as compendiumEntryId
    const documentId = documentMapping.get(objectIdString);
    if (documentId) {
      return {
        success: true,
        resolvedObjectId: documentId,
        action: 'resolved_to_document',
        reason: 'document_found'
      };
    }

    // Step 3: Auto-creation - check if this ObjectId is a compendium entry
    try {
      const compendiumEntry = await CompendiumEntryModel.findById(objectId).lean();
      if (compendiumEntry) {
        logger.info(`Auto-creating document for compendium entry: ${compendiumEntry.entry.name}`);
        
        // Convert MongoDB document to proper format with id field
        const entryWithId = {
          ...compendiumEntry,
          id: compendiumEntry._id.toString()
        };

        // Use the template service to create the document
        const createdDocument = await this.templateService.createFromTemplate(
          entryWithId as any,
          {}, // no overrides
          userId,
          undefined, // no campaignId for auto-created documents
          {} // no options
        );

        if (createdDocument && typeof createdDocument === 'object' && '_id' in createdDocument) {
          // Update our mapping with the newly created document
          documentMapping.set(objectIdString, createdDocument._id as Types.ObjectId);
          
          return {
            success: true,
            resolvedObjectId: createdDocument._id as Types.ObjectId,
            action: 'created_document',
            reason: 'document_created'
          };
        } else {
          return {
            success: false,
            error: 'Failed to create document from compendium entry'
          };
        }
      }
    } catch (error) {
      logger.error(`Error during auto-creation for ObjectId ${objectIdString}:`, error);
      return {
        success: false,
        error: `Auto-creation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }

    // Step 4: ObjectId doesn't exist as document or compendium entry - leave unchanged
    // This is likely a legitimate reference to another entity type (campaign, user, map, etc.)
    return {
      success: true,
      resolvedObjectId: objectId,
      action: 'kept_existing',
      reason: 'non_document_reference'
    };
  }
}

// Export singleton instance
export const documentReferenceResolverService = new DocumentReferenceResolverService();