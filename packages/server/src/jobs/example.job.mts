import { backgroundJobService, Job } from '../services/background-job.service.mjs';
import { logger } from '../utils/logger.mjs';

/**
 * A simple example job that logs a message
 */
export async function registerExampleJob(): Promise<void> {
  // Define the job processor
  backgroundJobService.defineJob(
    'example-job',
    async (job: Job) => {
      const { message } = job.attrs.data || { message: 'Hello from background job!' };
      logger.info(`Executing example job: ${message}`, {
        jobId: job.attrs.id,
        timestamp: new Date().toISOString()
      });
      
      // The job is successful if it doesn't throw an error
      return;
    },
    {
      // Job-specific options
      priority: 'normal',
      concurrency: 1
    }
  );

  // Schedule this job to run every minute
  await backgroundJobService.scheduleRecurringJob('1 minute', 'example-job', {
    message: 'This is a recurring job running every minute!'
  });

  logger.info('Example job registered and scheduled');
} 