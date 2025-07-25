import mongoose, { ClientSession } from 'mongoose';
import { logger } from '../utils/logger.mjs';
import { deleteDirectory } from './storage.service.mjs';
import { CompendiumModel } from '../features/compendiums/models/compendium.model.mjs';
import { CompendiumEntryModel } from '../features/compendiums/models/compendium-entry.model.mjs';
import { DocumentModel } from '../features/documents/models/document.model.mjs';
import { VTTDocumentModel } from '../features/documents/models/vtt-document.model.mjs';

export class TransactionService {
  /**
   * Execute an operation within a MongoDB transaction
   * Automatically handles commit/rollback based on success/failure
   * Falls back to non-transactional operation if transactions are not supported
   */
  async withTransaction<T>(operation: (session: ClientSession) => Promise<T>): Promise<T> {
    // Check if we're in a test environment, development, or if transactions are not supported
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isTestEnv || isDevelopment) {
      // For tests or development, run without transactions since MongoMemoryServer/single instance doesn't support them
      logger.debug(`Running without transaction (${isTestEnv ? 'test' : 'development'} environment)`);
      const session = await mongoose.startSession();
      try {
        const result = await operation(session);
        return result;
      } finally {
        await session.endSession();
      }
    }
    
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();
      
      const result = await operation(session);
      
      await session.commitTransaction();
      logger.info('Transaction committed successfully');
      
      return result;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Transaction aborted due to error:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Rollback assets from storage (MinIO)
   * Used when an import fails after assets have been uploaded
   */
  async rollbackAssets(assetKeys: string[]): Promise<void> {
    if (assetKeys.length === 0) return;

    try {
      logger.info(`Rolling back ${assetKeys.length} assets from storage`);
      
      // Group assets by directory for efficient deletion
      const directories = new Set<string>();
      assetKeys.forEach(key => {
        const parts = key.split('/');
        if (parts.length > 1) {
          // Get the directory path (everything except the filename)
          const dir = parts.slice(0, -1).join('/');
          directories.add(dir);
        }
      });

      // Delete directories (which will delete all files within them)
      for (const directory of directories) {
        try {
          await deleteDirectory(directory);
          logger.info(`Deleted asset directory: ${directory}`);
        } catch (error) {
          logger.error(`Failed to delete asset directory ${directory}:`, error);
          // Continue with other directories even if one fails
        }
      }
    } catch (error) {
      logger.error('Asset rollback failed:', error);
      // Don't throw here - we don't want to mask the original error
    }
  }

  /**
   * Rollback a partially created compendium
   * This should be called within a transaction that will be aborted
   */
  async rollbackCompendium(compendiumId: string, session?: ClientSession): Promise<void> {
    try {
      logger.info(`Rolling back compendium: ${compendiumId}`);
      
      // Models are now imported at the top of the file

      // Delete all content associated with this compendium
      await Promise.all([
        CompendiumEntryModel.deleteMany({ compendiumId }, { session }),
        DocumentModel.deleteMany({ compendiumId, documentType: 'actor' }, { session }),
        DocumentModel.deleteMany({ compendiumId, documentType: 'item' }, { session }),
        VTTDocumentModel.deleteMany({ compendiumId }, { session }),
        CompendiumModel.findByIdAndDelete(compendiumId, { session })
      ]);

      logger.info(`Compendium rollback complete: ${compendiumId}`);
    } catch (error) {
      logger.error(`Compendium rollback failed for ${compendiumId}:`, error);
      // Don't throw here - we're already in an error state
    }
  }

  /**
   * Cleanup orphaned content that might exist without a compendium
   * This is a maintenance operation that can be run periodically
   */
  async cleanupOrphanedContent(): Promise<{
    actors: number;
    items: number;
    documents: number;
  }> {
    const session = await mongoose.startSession();
    
    try {
      session.startTransaction();

      // Models are imported at the top of the file

      // Get all valid compendium IDs
      const validCompendiumIds = await CompendiumModel.find({}, { _id: 1 }, { session });
      const validIds = validCompendiumIds.map(c => c._id);

      // Find and delete orphaned content
      const [actorsDeleted, itemsDeleted, documentsDeleted] = await Promise.all([
        DocumentModel.deleteMany({ 
          documentType: 'actor',
          compendiumId: { $exists: true, $nin: validIds } 
        }, { session }),
        DocumentModel.deleteMany({ 
          documentType: 'item',
          compendiumId: { $exists: true, $nin: validIds } 
        }, { session }),
        VTTDocumentModel.deleteMany({ 
          compendiumId: { $exists: true, $nin: validIds } 
        }, { session })
      ]);

      await session.commitTransaction();

      const result = {
        actors: actorsDeleted.deletedCount || 0,
        items: itemsDeleted.deletedCount || 0,
        documents: documentsDeleted.deletedCount || 0
      };

      logger.info('Cleanup completed:', result);
      return result;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Cleanup failed:', error);
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

// Export singleton instance
export const transactionService = new TransactionService();