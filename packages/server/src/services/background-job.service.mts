import  { Pulse } from '@pulsecron/pulse';
import { config } from '../config/index.mjs';
import { logger } from '../utils/logger.mjs';

// Get the Pulse class constructor from the module

/**
 * Background Job Service using PulseCron
 * Handles scheduling and processing of background jobs
 */
class BackgroundJobService {
  private pulse: any; // Using any for Pulse type since it doesn't have TypeScript definitions
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
      defaultLockLifetime: 10 * 60 * 1000, // 10 minutes
    });

    // Set up event listeners
    this.pulse.on('start', (job: any) => {
      logger.info(`Background job started: ${job.attrs.name}`, { jobId: job.attrs.id });
    });

    this.pulse.on('success', (job: any) => {
      logger.info(`Background job completed successfully: ${job.attrs.name}`, { 
        jobId: job.attrs.id,
        duration: job.attrs.lastRunAt ? new Date().getTime() - job.attrs.lastRunAt.getTime() : undefined
      });
    });

    this.pulse.on('fail', (error: Error, job: any) => {
      logger.error(`Background job failed: ${job.attrs.name}`, {
        jobId: job.attrs.id,
        error: error.message,
        stack: error.stack
      });
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
    } catch (error: any) {
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
  defineJob(name: string, handler: (job: any) => Promise<void>, options: any = {}): void {
    this.pulse.define(name, handler, {
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
  async scheduleJob(when: string | Date, name: string, data?: any): Promise<any> {
    try {
      return await this.pulse.schedule(when, name, data);
    } catch (error: any) {
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
  async scheduleRecurringJob(interval: string, name: string, data?: any): Promise<any> {
    try {
      return await this.pulse.every(interval, name, data);
    } catch (error: any) {
      logger.error(`Failed to schedule recurring job: ${name}`, { error, interval, data });
      throw error;
    }
  }

  /**
   * Create a new job instance that can be customized and saved
   * @param name The name of the job
   * @param data Data to pass to the job
   */
  createJob(name: string, data?: any): any {
    return this.pulse.create(name, data);
  }

  /**
   * Cancel all scheduled jobs of a specific type
   * @param name The name of the job to cancel
   */
  async cancelJobs(name: string): Promise<number> {
    try {
      const result = await this.pulse.cancel({ name });
      logger.info(`Cancelled ${result} jobs of type: ${name}`);
      return result;
    } catch (error: any) {
      logger.error(`Failed to cancel jobs: ${name}`, { error });
      throw error;
    }
  }

  /**
   * Get a list of pending jobs
   * @param name Optional job name to filter by
   */
  async getPendingJobs(name?: string): Promise<any[]> {
    const query: any = { nextRunAt: { $exists: true } };
    if (name) {
      query.name = name;
    }
    return await this.pulse.jobs(query);
  }

  /**
   * Get a list of completed jobs
   * @param name Optional job name to filter by
   */
  async getCompletedJobs(name?: string): Promise<any[]> {
    const query: any = { lastFinishedAt: { $exists: true } };
    if (name) {
      query.name = name;
    }
    return await this.pulse.jobs(query);
  }

  /**
   * Get a list of failed jobs
   * @param name Optional job name to filter by
   */
  async getFailedJobs(name?: string): Promise<any[]> {
    const query: any = { 
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
    } catch (error: any) {
      logger.error('Failed to shut down background job service', { error });
      throw error;
    }
  }
}

// Export a singleton instance
export const backgroundJobService = new BackgroundJobService(); 