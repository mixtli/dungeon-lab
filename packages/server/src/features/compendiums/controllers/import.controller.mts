import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { nanoid } from 'nanoid';
import { logger } from '../../../utils/logger.mjs';
import { importService } from '../services/import.service.mjs';
import { backgroundJobService } from '../../../services/background-job.service.mjs';
import { COMPENDIUM_IMPORT_JOB, getImportProgress } from '../jobs/compendium-import.job.mjs';
import { uploadBuffer } from '../../../services/storage.service.mjs';
import { transactionService } from '../../../services/transaction.service.mjs';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/base.mjs';
import { CompendiumManifest, ImportProgress, ValidationResult, ImportZipRequest, ValidateZipRequest } from '@dungeon-lab/shared/schemas/import.schema.mjs';
import type { Job } from '@pulsecron/pulse';

interface ImportResponse {
  jobId: string;
  message: string;
}

interface ImportStatusResponse {
  jobId: string;
  status: string;
  progress: ImportProgress;
  compendiumId?: string;
  error?: string;
}

interface ValidateZipResponse {
  valid: boolean;
  manifest?: CompendiumManifest;
  validation?: ValidationResult;
  error?: string;
}

export class ImportController {
  /**
   * POST /api/compendiums/import
   * Import a compendium from a ZIP file (raw ZIP data in request body)
   */
  importZip = asyncHandler(async (req: Request, res: Response<BaseAPIResponse<ImportResponse>>) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if request has raw ZIP data
      if (!req.body || !Buffer.isBuffer(req.body)) {
        res.status(400).json({
          success: false,
          error: 'ZIP file data is required in request body'
        });
        return;
      }

      const zipBuffer = req.body as Buffer;
      
      // Get query parameters for options
      const overwriteExisting = req.query.overwriteExisting === 'true';
      const validateOnly = req.query.validateOnly === 'true';

      // If validateOnly is true, just validate and return
      if (validateOnly) {
        try {
          await importService.validateManifest(zipBuffer);
          
          res.status(200).json({
            success: true,
            data: {
              jobId: 'validation-only',
              message: 'ZIP file validated successfully'
            }
          });
          return;
        } catch (error) {
          res.status(400).json({
            success: false,
            error: `Validation failed: ${error instanceof Error ? error.message : String(error)}`
          });
          return;
        }
      }

      // Store ZIP file in MinIO and create import job
      const storageKey = `imports/${userId}/${Date.now()}-${nanoid()}.zip`;
      logger.info(`Starting ZIP upload to MinIO. Size: ${zipBuffer.length} bytes, Key: ${storageKey}`);
      
      try {
        await uploadBuffer(storageKey, zipBuffer, 'application/zip');
        logger.info(`ZIP upload successful. Key: ${storageKey}`);
      } catch (uploadError) {
        logger.error(`ZIP upload failed. Key: ${storageKey}`, uploadError);
        throw uploadError;
      }
      
      const job = backgroundJobService.createJob(COMPENDIUM_IMPORT_JOB, {
        zipStorageKey: storageKey, // Store only the storage reference
        userId,
        overwriteExisting
      }) as Job;
      
      await (job as { save(): Promise<unknown> }).save();
      const jobId = job.attrs._id?.toString() || 'unknown';

      logger.info(`Import job created: ${jobId} for user: ${userId}`);

      res.status(202).json({
        success: true,
        data: {
          jobId,
          message: 'Import job started. Use the status endpoint to monitor progress.'
        }
      });

    } catch (error) {
      logger.error('Import controller error:', error);
      res.status(500).json({
        success: false,
        error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  /**
   * GET /api/compendiums/import/:jobId/status
   * Get the status of an import job
   */
  getImportStatus = asyncHandler(async (req: Request, res: Response<BaseAPIResponse<ImportStatusResponse>>) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { jobId } = req.params;
      
      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'Job ID is required'
        });
        return;
      }

      // Get jobs from Pulse
      const jobs = await backgroundJobService.getPendingJobs(COMPENDIUM_IMPORT_JOB) as Job[];
      const completedJobs = await backgroundJobService.getCompletedJobs(COMPENDIUM_IMPORT_JOB) as Job[];
      const failedJobs = await backgroundJobService.getFailedJobs(COMPENDIUM_IMPORT_JOB) as Job[];
      
      const allJobs = [...jobs, ...completedJobs, ...failedJobs];
      const job = allJobs.find(j => j.attrs._id?.toString() === jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Import job not found'
        });
        return;
      }

      // Verify the job belongs to the requesting user
      const jobData = job.attrs.data as { userId?: string; compendiumId?: string; progress?: unknown; error?: unknown; zipStorageKey?: string };
      if (jobData.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      // Determine job status
      let status = 'pending';
      if (job.attrs.lastFinishedAt) {
        status = job.attrs.failCount && job.attrs.failCount > 0 ? 'failed' : 'completed';
      } else if (job.attrs.lockedAt) {
        status = 'processing';
      }

      // Get progress from in-memory storage or job data
      const progress = getImportProgress(jobId) || (jobData.progress as ImportProgress) || {
        stage: 'validating' as const,
        processedItems: 0,
        totalItems: 0,
        currentItem: 'Pending',
        errors: []
      };

      res.status(200).json({
        success: true,
        data: {
          jobId,
          status,
          progress,
          compendiumId: jobData.compendiumId,
          error: jobData.error as string | undefined
        }
      });

    } catch (error) {
      logger.error('Import status controller error:', error);
      res.status(500).json({
        success: false,
        error: `Failed to get import status: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  /**
   * POST /api/compendiums/validate
   * Validate a ZIP file without importing (raw ZIP data in request body)
   */
  validateZip = asyncHandler(async (req: Request, res: Response<BaseAPIResponse<ValidateZipResponse>>) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if request has raw ZIP data
      if (!req.body || !Buffer.isBuffer(req.body)) {
        res.status(400).json({
          success: false,
          error: 'ZIP file data is required in request body'
        });
        return;
      }

      const zipBuffer = req.body as Buffer;

      try {
        const { manifest, validation } = await importService.validateManifest(zipBuffer);

        res.status(200).json({
          success: true,
          data: {
            valid: true,
            manifest,
            validation
          }
        });

      } catch (error) {
        logger.warn('ZIP validation failed:', error);
        
        res.status(200).json({
          success: true,
          data: {
            valid: false,
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }

    } catch (error) {
      logger.error('Validate ZIP controller error:', error);
      res.status(500).json({
        success: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  /**
   * DELETE /api/compendiums/import/:jobId
   * Cancel an import job (if still pending)
   */
  cancelImport = asyncHandler(async (req: Request, res: Response<BaseAPIResponse<{ message: string }>>) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { jobId } = req.params;
      
      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'Job ID is required'
        });
        return;
      }

      // Get the job
      const jobs = await backgroundJobService.getPendingJobs(COMPENDIUM_IMPORT_JOB) as Job[];
      const job = jobs.find(j => j.attrs._id?.toString() === jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Import job not found or already completed'
        });
        return;
      }

      // Verify the job belongs to the requesting user
      const jobData = job.attrs.data as { userId?: string; compendiumId?: string; progress?: unknown; error?: unknown; zipStorageKey?: string };
      if (jobData.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      // Cancel the job
      await job.remove();

      res.status(200).json({
        success: true,
        data: {
          message: 'Import job cancelled successfully'
        }
      });

    } catch (error) {
      logger.error('Cancel import controller error:', error);
      res.status(500).json({
        success: false,
        error: `Failed to cancel import: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  /**
   * GET /api/compendiums/import/jobs
   * Get all import jobs for the current user
   */
  getUserImportJobs = asyncHandler(async (req: Request, res: Response<BaseAPIResponse<ImportStatusResponse[]>>) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Get all import jobs and filter by user
      const pendingJobs = await backgroundJobService.getPendingJobs(COMPENDIUM_IMPORT_JOB) as Job[];
      const completedJobs = await backgroundJobService.getCompletedJobs(COMPENDIUM_IMPORT_JOB) as Job[];
      const failedJobs = await backgroundJobService.getFailedJobs(COMPENDIUM_IMPORT_JOB) as Job[];
      
      const allJobs = [...pendingJobs, ...completedJobs, ...failedJobs];
      const userJobs = allJobs.filter(job => {
        const jobData = job.attrs.data as { userId?: string; compendiumId?: string; progress?: unknown; error?: unknown };
        return jobData.userId === userId;
      });

      const jobStatuses: ImportStatusResponse[] = userJobs.map(job => {
        const jobData = job.attrs.data as { userId?: string; compendiumId?: string; progress?: unknown; error?: unknown };
        const jobId = job.attrs._id?.toString() || 'unknown';
        
        // Determine job status
        let status = 'pending';
        if (job.attrs.lastFinishedAt) {
          status = job.attrs.failCount && job.attrs.failCount > 0 ? 'failed' : 'completed';
        } else if (job.attrs.lockedAt) {
          status = 'processing';
        }

        // Get progress
        const progress = getImportProgress(jobId) || (jobData.progress as ImportProgress) || {
          stage: 'validating' as const,
          processedItems: 0,
          totalItems: 0,
          currentItem: 'Pending',
          errors: []
        };

        return {
          jobId,
          status,
          progress,
          compendiumId: jobData.compendiumId,
          error: jobData.error as string | undefined
        };
      });

      res.status(200).json({
        success: true,
        data: jobStatuses
      });

    } catch (error) {
      logger.error('Get user import jobs controller error:', error);
      res.status(500).json({
        success: false,
        error: `Failed to get import jobs: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  /**
   * DELETE /api/compendiums/:id
   * Delete an entire compendium and all associated content
   */
  deleteCompendium = asyncHandler(async (req: Request, res: Response<BaseAPIResponse<{ message: string }>>) => {
    try {
      const userId = req.session.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { id: compendiumSlug } = req.params;
      
      if (!compendiumSlug) {
        res.status(400).json({
          success: false,
          error: 'Compendium slug is required'
        });
        return;
      }

      // First lookup the compendium by slug to get its ObjectId
      const { CompendiumModel } = await import('../models/compendium.model.mjs');
      const compendium = await CompendiumModel.findOne({ slug: compendiumSlug }).lean();
      
      if (!compendium) {
        res.status(404).json({
          success: false,
          error: 'Compendium not found'
        });
        return;
      }

      // Use the transaction service to rollback the compendium with ObjectId
      await transactionService.rollbackCompendium(compendium._id.toString());

      res.status(200).json({
        success: true,
        data: {
          message: 'Compendium deleted successfully'
        }
      });

    } catch (error) {
      logger.error('Delete compendium controller error:', error);
      const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(status).json({
        success: false,
        error: `Failed to delete compendium: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
}

export const importController = new ImportController();