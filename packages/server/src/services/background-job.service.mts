import  { Pulse } from '@pulsecron/pulse';
import { config } from '../config/index.mjs';
import { logger } from '../utils/logger.mjs';
import type { Job } from '@pulsecron/pulse';

// Define types for JobAttributesData and other Pulse-related types
type JobAttributesData = Record<string, unknown>;


/**
 * Background Job Service using PulseCron
 * Handles scheduling and processing of background jobs
 */
class BackgroundJobService {
  private pulse: Pulse;
  private initialized = false;

  constructor() {
    // Create Pulse instance with MongoDB connection
    this.pulse = new Pulse({
      db: { 
        address: config.mongoUri, // Updated to match the actual property name from config
        collection: 'backgroundJobs'
      },
      defaultConcurrency: 5,
      maxConcurrency: 20,
      defaultLockLifetime: 30 * 60 * 1000, // 30 minutes (increased from 10 for long-running imports)
      processEvery: '10 seconds', // Check for jobs every 10 seconds
    });

    // Set up event listeners
    this.pulse.on('start', (job) => {
      logger.info(`Background job started: ${job.attrs.name}`, { jobId: job.attrs.id });
    });

    this.pulse.on('success', (job) => {
      logger.info(`Background job completed successfully: ${job.attrs.name}`, { 
        jobId: job.attrs.id,
        duration: job.attrs.lastRunAt ? new Date().getTime() - job.attrs.lastRunAt.getTime() : undefined,
        failCount: job.attrs.failCount,
        runCount: job.attrs.runCount
      });
    });

    this.pulse.on('fail', (error: Error, job) => {
      logger.error(`Background job failed: ${job.attrs.name}`, {
        jobId: job.attrs.id,
        error: error.message,
        stack: error.stack,
        failCount: job.attrs.failCount,
        runCount: job.attrs.runCount
      });
      
      // Special logging for "aborted" errors
      if (error.message === 'aborted') {
        logger.error(`PULSECRON ABORTED ERROR DETECTED for job ${job.attrs.id}:`, {
          jobName: job.attrs.name,
          jobData: job.attrs.data,
          lastRunAt: job.attrs.lastRunAt,
          lockedAt: job.attrs.lockedAt,
          fullError: error
        });
      }
    });
  }

  /**
   * Initialize the background job service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.pulse.start();
      this.initialized = true;
      logger.info('Background job service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize background job service', { error });
      throw error;
    }
  }

  /**
   * Define a job processor
   * @param name The name of the job
   * @param handler The function to run when the job is processed
   * @param options Options for the job
   */
  defineJob(name: string, handler: (job: Job) => Promise<void>, options: Record<string, unknown> = {}): void {
    this.pulse.define(name, handler as (job: unknown) => Promise<unknown>, {
      shouldSaveResult: true,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      ...options
    });
  }

  /**
   * Schedule a job to run once at a specific time
   * @param when When to run the job (can be a Date object or a string like 'in 5 minutes')
   * @param name The name of the job (must be defined first)
   * @param data Data to pass to the job
   */
  async scheduleJob(when: string | Date, name: string, data?: JobAttributesData): Promise<unknown> {
    try {
      return await this.pulse.schedule(when, name, data);
    } catch (error) {
      logger.error(`Failed to schedule job: ${name}`, { error, when, data });
      throw error;
    }
  }

  /**
   * Schedule a job to run repeatedly
   * @param interval The interval at which to run the job (e.g., '1 hour', '5 * * * *')
   * @param name The name of the job (must be defined first)
   * @param data Data to pass to the job
   */
  async scheduleRecurringJob(interval: string, name: string, data?: JobAttributesData): Promise<unknown> {
    try {
      return await this.pulse.every(interval, name, data);
    } catch (error) {
      logger.error(`Failed to schedule recurring job: ${name}`, { error, interval, data });
      throw error;
    }
  }

  /**
   * Create a new job instance that can be customized and saved
   * @param name The name of the job
   * @param data Data to pass to the job
   */
  createJob(name: string, data?: JobAttributesData): unknown {
    return this.pulse.create(name, data || {});
  }

  /**
   * Cancel all scheduled jobs of a specific type
   * @param name The name of the job to cancel
   */
  async cancelJobs(name: string): Promise<number> {
    try {
      const result = await this.pulse.cancel({ name });
      logger.info(`Cancelled ${result} jobs of type: ${name}`);
      return result || 0;
    } catch (error) {
      logger.error(`Failed to cancel jobs: ${name}`, { error });
      throw error;
    }
  }

  /**
   * Get a list of pending jobs
   * @param name Optional job name to filter by
   */
  async getPendingJobs(name?: string): Promise<unknown[]> {
    const query: Record<string, unknown> = { nextRunAt: { $exists: true } };
    if (name) {
      query.name = name;
    }
    return await this.pulse.jobs(query);
  }

  /**
   * Get a list of completed jobs
   * @param name Optional job name to filter by
   */
  async getCompletedJobs(name?: string): Promise<unknown[]> {
    const query: Record<string, unknown> = { lastFinishedAt: { $exists: true } };
    if (name) {
      query.name = name;
    }
    return await this.pulse.jobs(query);
  }

  /**
   * Get a list of failed jobs
   * @param name Optional job name to filter by
   */
  async getFailedJobs(name?: string): Promise<unknown[]> {
    const query: Record<string, unknown> = { 
      failCount: { $gt: 0 },
      lastFinishedAt: { $exists: true } 
    };
    if (name) {
      query.name = name;
    }
    return await this.pulse.jobs(query);
  }

  /**
   * Shutdown the background job service
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.pulse.stop();
      this.initialized = false;
      logger.info('Background job service shut down successfully');
    } catch (error) {
      logger.error('Failed to shut down background job service', { error });
      throw error;
    }
  }
}

// Export a singleton instance
export const backgroundJobService = new BackgroundJobService(); 