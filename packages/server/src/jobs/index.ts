import { logger } from '../utils/logger.js';
import { registerMapImageJobs } from '../features/maps/jobs/map-image.job.js';
import { registerDocumentImageJobs } from '../features/documents/jobs/document-image.job.js';
import { registerCompendiumImportJobs } from '../features/compendiums/jobs/compendium-import.job.js';

console.log('Initializing jobs...');
/**
 * Initialize and register all background jobs
 */
export async function initializeJobs(): Promise<void> {
  logger.info('Initializing background jobs...');

  try {
    // Register all jobs here
    await registerMapImageJobs();
    await registerDocumentImageJobs();
    await registerCompendiumImportJobs();

    logger.info('All background jobs initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize background jobs', { error });
    throw error;
  }
}
