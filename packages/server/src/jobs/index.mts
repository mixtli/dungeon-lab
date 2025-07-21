import { logger } from '../utils/logger.mjs';
import { registerMapImageJobs } from '../features/maps/jobs/map-image.job.mjs';
import { registerActorImageJobs } from '../features/actors/jobs/actor-image.job.mjs';
import { registerCompendiumImportJobs } from '../features/compendiums/jobs/compendium-import.job.mjs';

console.log('Initializing jobs...');
/**
 * Initialize and register all background jobs
 */
export async function initializeJobs(): Promise<void> {
  logger.info('Initializing background jobs...');

  try {
    // Register all jobs here
    await registerMapImageJobs();
    await registerActorImageJobs();
    await registerCompendiumImportJobs();

    logger.info('All background jobs initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize background jobs', { error });
    throw error;
  }
}
