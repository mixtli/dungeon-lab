import { logger } from '../../../utils/logger.mjs';
import { GameStateSyncService } from './game-state-sync.service.mjs';

/**
 * Service for managing periodic game state synchronization
 * Runs background tasks to sync game state to backing models at regular intervals
 */
export class PeriodicSyncService {
  private syncService = new GameStateSyncService();
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start periodic sync with specified interval
   * @param intervalMs - Interval in milliseconds (default: 10 minutes)
   */
  start(intervalMs: number = 1000 * 60 * 10): void {
    if (this.isRunning) {
      logger.warn('Periodic sync service is already running');
      return;
    }

    this.intervalId = setInterval(async () => {
      await this.performPeriodicSync();
    }, intervalMs);

    this.isRunning = true;
    logger.info('Periodic sync service started', { intervalMs });
  }

  /**
   * Stop periodic sync
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Periodic sync service stopped');
  }

  /**
   * Get current status
   */
  get status(): { isRunning: boolean; intervalId: NodeJS.Timeout | null } {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId
    };
  }

  /**
   * Perform a single periodic sync operation
   */
  private async performPeriodicSync(): Promise<void> {
    try {
      logger.info('Starting periodic game state sync');

      // Get sessions that need syncing (older than 30 minutes since last update)
      const sessionsNeedingSync = await this.syncService.getSessionsNeedingSync(1000 * 60 * 30);
      
      if (sessionsNeedingSync.length === 0) {
        logger.info('No sessions need periodic sync');
        return;
      }

      // Batch sync sessions with rate limiting
      const batchResult = await this.syncService.syncMultipleSessions(
        sessionsNeedingSync, 
        'periodic',
        { timeout: 1000 * 60 * 2 } // 2 minute timeout per session
      );

      logger.info('Periodic sync completed', { 
        sessionCount: sessionsNeedingSync.length,
        successful: batchResult.summary.successful,
        failed: batchResult.summary.failed
      });

      // Log any failures for monitoring
      const failedSessions = batchResult.results.filter(r => !r.success);
      if (failedSessions.length > 0) {
        logger.warn('Some periodic syncs failed', {
          failedCount: failedSessions.length,
          errors: failedSessions.flatMap(r => r.errors)
        });
      }

    } catch (error) {
      logger.error('Periodic sync operation failed', { error });
    }
  }

  /**
   * Manual trigger for periodic sync (for testing/admin purposes)
   */
  async triggerManualSync(): Promise<void> {
    logger.info('Manual periodic sync triggered');
    await this.performPeriodicSync();
  }
}

// Singleton instance for server-wide use
export const periodicSyncService = new PeriodicSyncService();