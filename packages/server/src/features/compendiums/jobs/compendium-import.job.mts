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
      
      try {
        // Download ZIP from MinIO storage
        const buffer = await downloadBuffer(zipStorageKey);
        
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
        
        // Update job with completion data
        job.attrs.data = {
          ...job.attrs.data,
          compendiumId: compendium.id.toString(),
          progress: {
            stage: 'complete',
            processedItems: importProgress.get(jobId)?.totalItems || 0,
            totalItems: importProgress.get(jobId)?.totalItems || 0,
            errors: []
          }
        };
        
        logger.info(`Compendium import completed successfully: ${compendium.id}`);
        
        // Clean up ZIP file from storage
        try {
          await deleteFile(zipStorageKey);
          logger.debug(`Cleaned up ZIP file: ${zipStorageKey}`);
        } catch (cleanupError) {
          logger.warn(`Failed to clean up ZIP file ${zipStorageKey}:`, cleanupError);
          // Don't fail the job for cleanup errors
        }
        
        // Clean up progress data after a delay
        setTimeout(() => {
          importProgress.delete(jobId);
        }, 60 * 60 * 1000); // Keep for 1 hour
        
      } catch (error) {
        logger.error(`Error importing compendium for job ${jobId}:`, error);
        
        // Clean up ZIP file from storage even on error
        try {
          await deleteFile(zipStorageKey);
          logger.debug(`Cleaned up ZIP file after error: ${zipStorageKey}`);
        } catch (cleanupError) {
          logger.warn(`Failed to clean up ZIP file ${zipStorageKey} after error:`, cleanupError);
        }
        
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
        
        throw error;
      }
    },
    {
      priority: 'normal',
      concurrency: 2, // Limit concurrent imports
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 } // 10 second initial delay
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