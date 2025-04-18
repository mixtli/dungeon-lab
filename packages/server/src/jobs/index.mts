import { logger } from '../utils/logger.mjs';
import { registerExampleJob } from './example.job.mjs';

console.log('Initializing jobs...');
/**
 * Initialize and register all background jobs
 */
export async function initializeJobs(): Promise<void> {
  logger.info('Initializing background jobs...');
  
  try {
    // Register all jobs here
    await registerExampleJob();
    
    logger.info('All background jobs initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize background jobs', { error });
    throw error;
  }
} 