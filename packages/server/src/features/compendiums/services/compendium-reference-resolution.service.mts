import { Types } from 'mongoose';
import { CompendiumReferenceResolver } from '@dungeon-lab/shared/services/compendium-reference-resolver.mjs';
import { CompendiumEntryModel } from '../models/compendium-entry.model.mjs';
import { CompendiumModel } from '../models/compendium.model.mjs';
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
      // Get the current compendium to find its plugin
      const currentCompendium = await CompendiumModel.findById(compendiumId).lean();
      if (!currentCompendium) {
        throw new Error(`Compendium not found: ${compendiumId}`);
      }

      const result = await this.resolver.resolveCompendiumReferences(
        compendiumId,
        
        // Get all entries from ALL compendiums in the same plugin
        async () => {
          // Find all compendiums for this plugin
          const allCompendiums = await CompendiumModel.find({ 
            pluginId: currentCompendium.pluginId 
          }).lean();
          
          const allCompendiumIds = allCompendiums.map(c => c._id);
          
          // Get entries from all compendiums in this plugin
          const entries = await CompendiumEntryModel.find({ 
            compendiumId: { $in: allCompendiumIds }
          }).lean();
          
          // Transform to match IndexableCompendiumEntry interface
          // Sort so entries from the current compendium come first (for prioritization)
          const transformedEntries = entries.map(entry => ({
            _id: entry._id,
            slug: (entry.content as BaseDocument)?.slug || entry.entry?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
            documentType: entry.entry?.documentType || 'unknown',
            pluginDocumentType: (entry.content as BaseDocument)?.pluginDocumentType || entry.entry?.documentType,
            source: (entry.content as BaseDocument)?.source || undefined,
            pluginData: (entry.content || {}) as Record<string, unknown>,
            // Add metadata for prioritization
            _isCurrentCompendium: entry.compendiumId.toString() === compendiumId
          }));
          
          // Sort to prioritize current compendium entries first
          const sortedEntries = transformedEntries.sort((a, b) => {
            if (a._isCurrentCompendium && !b._isCurrentCompendium) return -1;
            if (!a._isCurrentCompendium && b._isCurrentCompendium) return 1;
            return 0;
          });
          
          // Remove metadata before returning
          return sortedEntries.map(entry => ({
            _id: entry._id,
            slug: entry.slug,
            documentType: entry.documentType,
            pluginDocumentType: entry.pluginDocumentType,
            source: entry.source,
            pluginData: entry.pluginData
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
      // Only get entries from the target compendium for stats
      // (but they would be resolved against all compendiums in the plugin)
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

    // Get the current compendium to find its plugin
    const currentCompendium = await CompendiumModel.findById(compendiumId).lean();
    if (!currentCompendium) {
      throw new Error(`Compendium not found: ${compendiumId}`);
    }

    // Find all compendiums for this plugin and build index for all entries
    const allCompendiums = await CompendiumModel.find({ 
      pluginId: currentCompendium.pluginId 
    }).lean();
    
    const allCompendiumIds = allCompendiums.map(c => c._id);
    
    const entries = await CompendiumEntryModel.find({ 
      compendiumId: { $in: allCompendiumIds }
    }).lean();
    
    // Sort entries to prioritize current compendium first
    const sortedEntries = entries.sort((a, b) => {
      const aIsCurrentCompendium = a.compendiumId.toString() === compendiumId;
      const bIsCurrentCompendium = b.compendiumId.toString() === compendiumId;
      if (aIsCurrentCompendium && !bIsCurrentCompendium) return -1;
      if (!aIsCurrentCompendium && bIsCurrentCompendium) return 1;
      return 0;
    });
    
    const indexableEntries = sortedEntries.map(e => ({
      _id: e._id,
      slug: (e.content as BaseDocument)?.slug || e.entry?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
      documentType: e.entry?.documentType || 'unknown',
      pluginDocumentType: (e.content as BaseDocument)?.pluginDocumentType || e.entry?.documentType,
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