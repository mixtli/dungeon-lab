import { Types } from 'mongoose';
import {
  CompendiumIndex,
  ResolutionResult,
  ResolutionError,
  IndexableCompendiumEntry,
  buildCompendiumIndex,
  processValueForReferences,
  hasUnresolvedReferences
} from './reference-resolution.mjs';

/**
 * Service for resolving cross-document references in compendiums after import
 */
export class CompendiumReferenceResolver {
  
  /**
   * Resolves all references in a compendium after import is complete
   * 
   * @param compendiumId - The compendium to process
   * @param getEntries - Function to retrieve all entries from the compendium
   * @param updateEntry - Function to update an entry with resolved references
   * @returns Resolution result with statistics and errors
   */
  async resolveCompendiumReferences<T extends IndexableCompendiumEntry>(
    compendiumId: string,
    getEntries: () => Promise<T[]>,
    updateEntry: (entryId: Types.ObjectId, updates: Partial<T>) => Promise<void>
  ): Promise<ResolutionResult> {
    
    // 1. Get all entries
    const entries = await getEntries();
    
    if (entries.length === 0) {
      return {
        resolved: 0,
        failed: 0,
        ambiguous: 0,
        errors: []
      };
    }
    
    // 2. Build lookup index
    const index = buildCompendiumIndex(entries);
    
    // 3. Initialize result tracking
    const result: ResolutionResult = {
      resolved: 0,
      failed: 0,
      ambiguous: 0,
      errors: []
    };
    
    // 4. Process each entry that has unresolved references
    const entriesToUpdate: Array<{ entry: T; resolvedPluginData: Record<string, unknown> }> = [];
    
    for (const entry of entries) {
      if (!hasUnresolvedReferences(entry)) {
        continue; // Skip entries with no references to resolve
      }
      
      // Process the pluginData to resolve references
      const resolvedPluginData = processValueForReferences(
        entry.pluginData,
        index,
        result,
        entry._id,
        'pluginData'
      ) as Record<string, unknown>;
      
      // Check if anything changed
      if (JSON.stringify(resolvedPluginData) !== JSON.stringify(entry.pluginData)) {
        entriesToUpdate.push({
          entry,
          resolvedPluginData
        });
      }
    }
    
    // 5. Apply updates in batches
    await this.applyUpdatesInBatches(entriesToUpdate, updateEntry);
    
    return result;
  }
  
  /**
   * Applies updates to entries in batches to avoid overwhelming the database
   */
  private async applyUpdatesInBatches<T extends IndexableCompendiumEntry>(
    updates: Array<{ entry: T; resolvedPluginData: Record<string, unknown> }>,
    updateEntry: (entryId: Types.ObjectId, updates: Partial<T>) => Promise<void>,
    batchSize: number = 50
  ): Promise<void> {
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      // Process batch in parallel
      await Promise.all(
        batch.map(({ entry, resolvedPluginData }) =>
          updateEntry(entry._id, { pluginData: resolvedPluginData } as Partial<T>)
        )
      );
      
      // Small delay between batches to be nice to the database
      if (i + batchSize < updates.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  /**
   * Logs resolution results for debugging and monitoring
   */
  logResolutionResults(compendiumId: string, result: ResolutionResult): void {
    console.log(`Reference Resolution Complete for compendium ${compendiumId}:`);
    console.log(`  Resolved: ${result.resolved}`);
    console.log(`  Failed: ${result.failed}`);
    console.log(`  Ambiguous: ${result.ambiguous}`);
    
    if (result.errors.length > 0) {
      console.log(`  Errors (${result.errors.length}):`);
      
      // Group errors by reason for cleaner output
      const errorsByReason = result.errors.reduce((acc, error) => {
        if (!acc[error.reason]) {
          acc[error.reason] = [];
        }
        acc[error.reason].push(error);
        return acc;
      }, {} as Record<string, ResolutionError[]>);
      
      for (const [reason, errors] of Object.entries(errorsByReason)) {
        console.log(`    ${reason.toUpperCase()} (${errors.length}):`);
        
        // Show first few examples
        const examples = errors.slice(0, 3);
        for (const error of examples) {
          console.log(`      - ${error.reference.documentType}:"${error.reference.slug}" at ${error.fieldPath}`);
        }
        
        if (errors.length > 3) {
          console.log(`      ... and ${errors.length - 3} more`);
        }
      }
    }
  }
  
  /**
   * Re-runs resolution for a single entry (useful for manual fixes)
   */
  async resolveEntryReferences<T extends IndexableCompendiumEntry>(
    entry: T,
    index: CompendiumIndex,
    updateEntry: (entryId: Types.ObjectId, updates: Partial<T>) => Promise<void>
  ): Promise<{ resolved: number; failed: number; errors: ResolutionError[] }> {
    
    const result: ResolutionResult = {
      resolved: 0,
      failed: 0,
      ambiguous: 0,
      errors: []
    };
    
    if (!hasUnresolvedReferences(entry)) {
      return result;
    }
    
    const resolvedPluginData = processValueForReferences(
      entry.pluginData,
      index,
      result,
      entry._id,
      'pluginData'
    );
    
    if (JSON.stringify(resolvedPluginData) !== JSON.stringify(entry.pluginData)) {
      await updateEntry(entry._id, { pluginData: resolvedPluginData } as Partial<T>);
    }
    
    return result;
  }
  
  /**
   * Gets statistics about unresolved references in a compendium
   */
  async getUnresolvedReferenceStats<T extends IndexableCompendiumEntry>(
    getEntries: () => Promise<T[]>
  ): Promise<{
    totalEntries: number;
    entriesWithReferences: number;
    totalReferences: number;
  }> {
    
    const entries = await getEntries();
    let entriesWithReferences = 0;
    let totalReferences = 0;
    
    for (const entry of entries) {
      if (hasUnresolvedReferences(entry)) {
        entriesWithReferences++;
        totalReferences += this.countReferences(entry.pluginData);
      }
    }
    
    return {
      totalEntries: entries.length,
      entriesWithReferences,
      totalReferences
    };
  }
  
  /**
   * Counts the number of reference objects in a data structure
   */
  private countReferences(obj: unknown): number {
    if (typeof obj !== 'object' || obj === null) {
      return 0;
    }
    
    // Check if this object itself is a reference
    if ('_ref' in obj && obj._ref && typeof obj._ref === 'object') {
      return 1;
    }
    
    let count = 0;
    
    if (Array.isArray(obj)) {
      for (const item of obj) {
        count += this.countReferences(item);
      }
    } else {
      for (const value of Object.values(obj)) {
        count += this.countReferences(value);
      }
    }
    
    return count;
  }
}