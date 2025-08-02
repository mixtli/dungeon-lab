import { Types } from 'mongoose';
import { CompendiumReferenceResolver } from '@dungeon-lab/shared/services/compendium-reference-resolver.mjs';
import { CompendiumEntryModel } from '../models/compendium-entry.model.mjs';
import { logger } from '../../../utils/logger.mjs';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';

/**
 * Service for resolving cross-document references in compendiums after import
 * This integrates the shared reference resolution logic with the server-side models
 */
export class ServerCompendiumReferenceResolutionService {
  private resolver = new CompendiumReferenceResolver();

  /**
   * Resolves all references in a compendium after import is complete
   */
  async resolveCompendiumReferences(compendiumId: string): Promise<{
    resolved: number;
    failed: number;
    ambiguous: number;
    errors: Array<{
      documentId: Types.ObjectId;
      fieldPath: string;
      reference: Record<string, unknown>;
      reason: string;
      candidates?: string[];
    }>;
  }> {
    logger.info(`Starting reference resolution for compendium: ${compendiumId}`);

    try {
      const result = await this.resolver.resolveCompendiumReferences(
        compendiumId,
        
        // Get all entries from this compendium
        async () => {
          const entries = await CompendiumEntryModel.find({ 
            compendiumId: new Types.ObjectId(compendiumId) 
          }).lean();
          
          // Transform to match IndexableCompendiumEntry interface
          return entries.map(entry => ({
            _id: entry._id,
            slug: (entry.content as BaseDocument)?.slug || entry.entry?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
            documentType: entry.entry?.documentType || 'unknown',
            pluginType: (entry.content as BaseDocument)?.pluginDocumentType || entry.entry?.documentType,
            source: (entry.content as BaseDocument)?.source || undefined,
            pluginData: (entry.content || {}) as Record<string, unknown>
          }));
        },
        
        // Update entry with resolved references
        async (entryId: Types.ObjectId, updates: unknown) => {
          const typedUpdates = updates as { pluginData?: Record<string, unknown> };
          if (typedUpdates.pluginData) {
            await CompendiumEntryModel.findByIdAndUpdate(
              entryId,
              { content: typedUpdates.pluginData },
              { new: true }
            );
          }
        }
      );

      // Log results
      this.resolver.logResolutionResults(compendiumId, result);

      // Transform result to match expected return type
      return {
        resolved: result.resolved,
        failed: result.failed,
        ambiguous: result.ambiguous,
        errors: result.errors.map(error => ({
          documentId: error.documentId,
          fieldPath: error.fieldPath,
          reference: error.reference,
          reason: error.reason,
          candidates: error.candidates?.map(id => id.toString())
        }))
      };
    } catch (error) {
      logger.error(`Reference resolution failed for compendium ${compendiumId}:`, error);
      throw error;
    }
  }

  /**
   * Gets statistics about unresolved references in a compendium
   */
  async getUnresolvedReferenceStats(compendiumId: string): Promise<{
    totalEntries: number;
    entriesWithReferences: number;
    totalReferences: number;
  }> {
    return await this.resolver.getUnresolvedReferenceStats(async () => {
      const entries = await CompendiumEntryModel.find({ 
        compendiumId: new Types.ObjectId(compendiumId) 
      }).lean();
      
      return entries.map(entry => ({
        _id: entry._id,
        slug: (entry.content as BaseDocument)?.slug || entry.entry?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
        documentType: entry.entry?.documentType || 'unknown',
        pluginType: (entry.content as BaseDocument)?.pluginDocumentType || entry.entry?.documentType,
        source: (entry.content as BaseDocument)?.source || undefined,
        pluginData: (entry.content || {}) as Record<string, unknown>
      }));
    });
  }

  /**
   * Re-runs resolution for a single entry (useful for manual fixes)
   */
  async resolveEntryReferences(entryId: string, compendiumId: string): Promise<{
    resolved: number;
    failed: number;
    errors: Array<{
      documentId: Types.ObjectId;
      fieldPath: string;
      reference: Record<string, unknown>;
      reason: string;
      candidates?: string[];
    }>;
  }> {
    // Get the entry
    const entry = await CompendiumEntryModel.findById(entryId).lean();
    if (!entry) {
      throw new Error(`Entry not found: ${entryId}`);
    }

    // Build index for the entire compendium
    const entries = await CompendiumEntryModel.find({ 
      compendiumId: new Types.ObjectId(compendiumId) 
    }).lean();
    
    const indexableEntries = entries.map(e => ({
      _id: e._id,
      slug: (e.content as BaseDocument)?.slug || e.entry?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
      documentType: e.entry?.documentType || 'unknown',
      pluginType: (e.content as BaseDocument)?.pluginDocumentType || e.entry?.documentType,
      source: (e.content as BaseDocument)?.source || undefined,
      pluginData: e.content || {}
    }));

    const { buildCompendiumIndex } = await import('@dungeon-lab/shared/services/reference-resolution.mjs');
    const index = buildCompendiumIndex(indexableEntries);

    // Resolve references for this specific entry
    const targetEntry = {
      _id: entry._id,
      slug: (entry.content as BaseDocument)?.slug || entry.entry?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
      documentType: entry.entry?.documentType || 'unknown',
      pluginType: (entry.content as BaseDocument)?.pluginDocumentType || entry.entry?.documentType,
      source: (entry.content as BaseDocument)?.source || undefined,
      pluginData: (entry.content || {}) as Record<string, unknown>
    };

    const result = await this.resolver.resolveEntryReferences(
      targetEntry,
      index,
      async (entryId: Types.ObjectId, updates: unknown) => {
        const typedUpdates = updates as { pluginData?: Record<string, unknown> };
        if (typedUpdates.pluginData) {
          await CompendiumEntryModel.findByIdAndUpdate(
            entryId,
            { content: typedUpdates.pluginData },
            { new: true }
          );
        }
      }
    );

    // Transform result to match expected return type
    return {
      resolved: result.resolved,
      failed: result.failed,
      errors: result.errors.map(error => ({
        documentId: error.documentId,
        fieldPath: error.fieldPath,
        reference: error.reference,
        reason: error.reason,
        candidates: error.candidates?.map(id => id.toString())
      }))
    };
  }
}

// Export singleton instance
export const compendiumReferenceResolutionService = new ServerCompendiumReferenceResolutionService();