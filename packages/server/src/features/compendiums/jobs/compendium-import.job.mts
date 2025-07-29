import { backgroundJobService } from '../../../services/background-job.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { importService } from '../services/import.service.mjs';
import { downloadBuffer, deleteFile } from '../../../services/storage.service.mjs';
import type { Job } from '@pulsecron/pulse';
import { ImportProgress } from '@dungeon-lab/shared/schemas/import.schema.mjs';

// Job names
export const COMPENDIUM_IMPORT_JOB = 'import-compendium';

// In-memory storage for import progress (could be replaced with Redis in production)
const importProgress = new Map<string, ImportProgress>();

/**
 * Register compendium import job handler
 */
export async function registerCompendiumImportJobs(): Promise<void> {
  logger.info('Registering compendium import job handler...');
  
  // Register compendium import job
  backgroundJobService.defineJob(
    COMPENDIUM_IMPORT_JOB,
    async (job: Job): Promise<void> => {
      const { zipStorageKey, userId } = job.attrs.data as { 
        zipStorageKey: string; // MinIO storage key
        userId: string;
        overwriteExisting?: boolean;
      };
      
      if (!zipStorageKey || !userId) {
        throw new Error('ZIP storage key and User ID are required for compendium import');
      }
      
      const jobId = job.attrs._id?.toString() || 'unknown';
      logger.info(`Starting compendium import job ${jobId} for user ${userId}`);
      logger.debug(`Initial job state:`, {
        jobId,
        lastFinishedAt: job.attrs.lastFinishedAt,
        lockedAt: job.attrs.lockedAt,
        failCount: job.attrs.failCount
      });
      
      try {
        // Download ZIP from MinIO storage
        logger.info(`Starting ZIP download from storage. Key: ${zipStorageKey}`);
        const buffer = await downloadBuffer(zipStorageKey);
        logger.info(`ZIP download successful. Key: ${zipStorageKey}, Size: ${buffer.length} bytes`);
        
        // Process the import with progress callback
        const compendium = await importService.importFromZip(
          buffer,
          userId,
          (progress: ImportProgress) => {
            // Store progress for retrieval
            importProgress.set(jobId, progress);
            
            // Also update job progress metadata
            job.attrs.data = {
              ...job.attrs.data,
              progress
            };
          }
        );
        
        // Get final progress state
        const finalProgress = importProgress.get(jobId);
        
        // Update job with completion data
        job.attrs.data = {
          ...job.attrs.data,
          compendiumId: compendium.id.toString(),
          progress: finalProgress || {
            stage: 'complete',
            processedItems: 0,
            totalItems: 0,
            currentItem: 'Import complete',
            errors: []
          }
        };
        
        // Explicitly save job data to database to ensure persistence
        try {
          await (job as { save(): Promise<unknown> }).save();
          logger.info(`Job data saved successfully for job ${jobId}`);
          
          // Also save again after a short delay to ensure persistence through any cleanup cycles
          setTimeout(async () => {
            try {
              await (job as { save(): Promise<unknown> }).save();
              logger.debug(`Job data re-saved for persistence: ${jobId}`);
            } catch (resaveError) {
              logger.warn(`Failed to re-save job data for ${jobId}:`, resaveError);
            }
          }, 5000); // Re-save after 5 seconds
          
        } catch (saveError) {
          logger.error(`Failed to save job data for job ${jobId}:`, saveError);
          // Continue execution - don't fail the job for save errors
        }
        
        logger.info(`Compendium import completed successfully: ${compendium.id}`);
        logger.info(`Final progress stored: processedItems=${finalProgress?.processedItems}, totalItems=${finalProgress?.totalItems}, stage=${finalProgress?.stage}`);
        
        // Explicitly mark job as successful completion
        logger.info(`Job ${jobId} marked as SUCCESS - no errors to throw`);
        
        // Clean up ZIP file from storage
        try {
          await deleteFile(zipStorageKey);
          logger.debug(`Cleaned up ZIP file: ${zipStorageKey}`);
        } catch (cleanupError) {
          logger.warn(`Failed to clean up ZIP file ${zipStorageKey}:`, cleanupError);
          // Don't fail the job for cleanup errors
        }
        
        // Clean up progress data after a longer delay to handle immediate status queries
        setTimeout(() => {
          importProgress.delete(jobId);
          logger.debug(`Cleaned up in-memory progress for job ${jobId}`);
        }, 24 * 60 * 60 * 1000); // Keep for 24 hours
        
        // Explicitly return success (don't let any async operations cause issues)
        return;
        
      } catch (error) {
        logger.error(`Error importing compendium for job ${jobId}:`, error);
        logger.error(`Error type: ${typeof error}, Error message: ${error instanceof Error ? error.message : String(error)}, Stack: ${error instanceof Error ? error.stack : 'N/A'}`);
        
        // Check if this is the mysterious "aborted" error
        if (error instanceof Error && error.message === 'aborted') {
          logger.error(`FOUND THE ABORTED ERROR! Stack trace: ${error.stack}`);
        } else if (String(error) === 'aborted') {
          logger.error(`FOUND THE ABORTED ERROR as string! Full error object:`, error);
        }
        
        // Clean up ZIP file from storage even on error
        // TODO: Temporarily disabled for debugging
        // try {
        //   await deleteFile(zipStorageKey);
        //   logger.debug(`Cleaned up ZIP file after error: ${zipStorageKey}`);
        // } catch (cleanupError) {
        //   logger.warn(`Failed to clean up ZIP file ${zipStorageKey} after error:`, cleanupError);
        // }
        
        // Update progress with error
        const errorProgress: ImportProgress = {
          stage: 'error',
          processedItems: 0,
          totalItems: 0,
          errors: [error instanceof Error ? error.message : String(error)]
        };
        
        importProgress.set(jobId, errorProgress);
        job.attrs.data = {
          ...job.attrs.data,
          progress: errorProgress,
          error: error instanceof Error ? error.message : String(error)
        };
        
        // Save error state to database
        try {
          await (job as { save(): Promise<unknown> }).save();
          logger.info(`Job error data saved for job ${jobId}`);
        } catch (saveError) {
          logger.error(`Failed to save job error data for job ${jobId}:`, saveError);
        }
        
        throw error;
      }
    },
    {
      priority: 'normal',
      concurrency: 1, // Only one import at a time to prevent resource conflicts
      attempts: 1, // Single attempt - imports are not safe to retry
      lockLifetime: 45 * 60 * 1000, // 45 minutes for long-running imports
      shouldSaveResult: true, // Ensure job data is saved
    }
  );
  
  logger.info(`Compendium import job registered: ${COMPENDIUM_IMPORT_JOB}`);
}

/**
 * Get import progress for a job
 */
export function getImportProgress(jobId: string): ImportProgress | null {
  return importProgress.get(jobId) || null;
}

/**
 * Clear all import progress data (for testing)
 */
export function clearImportProgress(): void {
  importProgress.clear();
}