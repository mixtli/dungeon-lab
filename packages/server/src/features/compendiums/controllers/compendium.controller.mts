import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../../utils/logger.mjs';
import { isErrorWithMessage } from '../../../utils/error.mjs';
import { CompendiumService } from '../services/compendium.service.mjs';
import { CompendiumValidationService } from '../services/compendium-validation.service.mjs';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';
import { 
  ICompendium, 
  ICompendiumEntry,
  ICompendiumCreateData,
  ICompendiumUpdateData,
  ICompendiumEntryCreateData,
  ICompendiumEntryUpdateData
} from '@dungeon-lab/shared/types/index.mjs';

// Define query schemas
const getCompendiumsQuerySchema = z.object({
  gameSystemId: z.string().optional(),
  pluginId: z.string().optional(),
  status: z.string().optional(),
  isPublic: z.string().transform(val => val === 'true').optional()
});

const getEntriesQuerySchema = z.object({
  contentType: z.string().optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  category: z.string().optional(),
  search: z.string().optional()
});

const linkContentBodySchema = z.object({
  contentType: z.enum(['Actor', 'Item', 'VTTDocument']),
  contentId: z.string(),
  name: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sortOrder: z.number().optional()
});

export class CompendiumController {
  private compendiumService: CompendiumService;
  private validationService: CompendiumValidationService;

  constructor(
    compendiumService?: CompendiumService,
    validationService?: CompendiumValidationService
  ) {
    this.compendiumService = compendiumService || new CompendiumService();
    this.validationService = validationService || new CompendiumValidationService();
  }

  /**
   * Get all compendiums with optional filtering
   * @route GET /api/compendiums
   */
  getCompendiums = async (
    req: Request,
    res: Response<BaseAPIResponse<ICompendium[]>>
  ): Promise<Response<BaseAPIResponse<ICompendium[]>> | void> => {
    try {
      const query = getCompendiumsQuerySchema.parse(req.query);
      const compendiums = await this.compendiumService.getAllCompendiums(query);

      return res.status(200).json({
        success: true,
        data: compendiums
      });
    } catch (error) {
      logger.error('Error getting compendiums:', error);
      const message = isErrorWithMessage(error) ? error.message : 'Failed to get compendiums';
      return res.status(500).json({
        success: false,
        error: message
      });
    }
  };

  /**
   * Get compendium by ID
   * @route GET /api/compendiums/:id
   */
  getCompendium = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<ICompendium>>
  ): Promise<Response<BaseAPIResponse<ICompendium>> | void> => {
    try {
      const compendium = await this.compendiumService.getCompendiumById(req.params.id);

      return res.status(200).json({
        success: true,
        data: compendium,
      });
    } catch (error) {
      logger.error('Error getting compendium:', error);
      const message = isErrorWithMessage(error) ? error.message : 'Failed to get compendium';
      const status = message.includes('not found') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  /**
   * Create new compendium
   * @route POST /api/compendiums
   */
  createCompendium = async (
    req: Request<Record<string, unknown>, unknown, ICompendiumCreateData>,
    res: Response<BaseAPIResponse<ICompendium>>
  ): Promise<Response<BaseAPIResponse<ICompendium>> | void> => {
    try {
      if (!req.session.user) {
        return res.status(401).json({
          success: false,
          error: 'You must be logged in to create a compendium'
        });
      }

      // Validate compendium metadata
      const validation = this.validationService.validateCompendiumMetadata(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: validation.error?.message || 'Invalid compendium data'
        });
      }

      const compendium = await this.compendiumService.createCompendium(
        req.body,
        req.session.user.id
      );

      return res.status(201).json({
        success: true,
        data: compendium,
      });
    } catch (error) {
      logger.error('Error creating compendium:', error);
      const message = isErrorWithMessage(error) ? error.message : 'Failed to create compendium';
      return res.status(500).json({
        success: false,
        error: message
      });
    }
  };

  /**
   * Update compendium
   * @route PUT /api/compendiums/:id
   */
  updateCompendium = async (
    req: Request<{ id: string }, unknown, ICompendiumUpdateData>,
    res: Response<BaseAPIResponse<ICompendium>>
  ): Promise<Response<BaseAPIResponse<ICompendium>> | void> => {
    try {
      if (!req.session.user) {
        return res.status(401).json({
          success: false,
          error: 'You must be logged in to update a compendium'
        });
      }

      const compendium = await this.compendiumService.updateCompendium(
        req.params.id,
        req.body,
        req.session.user.id
      );

      return res.status(200).json({
        success: true,
        data: compendium,
      });
    } catch (error) {
      logger.error('Error updating compendium:', error);
      const message = isErrorWithMessage(error) ? error.message : 'Failed to update compendium';
      const status = message.includes('not found') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  /**
   * Delete compendium
   * @route DELETE /api/compendiums/:id
   */
  deleteCompendium = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<void>>
  ): Promise<Response<BaseAPIResponse<void>> | void> => {
    try {
      await this.compendiumService.deleteCompendium(req.params.id);

      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      logger.error('Error deleting compendium:', error);
      const message = isErrorWithMessage(error) ? error.message : 'Failed to delete compendium';
      const status = message.includes('not found') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  /**
   * Get compendium entries
   * @route GET /api/compendiums/:id/entries
   */
  getCompendiumEntries = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<ICompendiumEntry[]>>
  ): Promise<Response<BaseAPIResponse<ICompendiumEntry[]>> | void> => {
    try {
      const query = getEntriesQuerySchema.parse(req.query);
      const entries = await this.compendiumService.getCompendiumEntries(req.params.id, query);

      return res.status(200).json({
        success: true,
        data: entries,
      });
    } catch (error) {
      logger.error('Error getting compendium entries:', error);
      const message = isErrorWithMessage(error) ? error.message : 'Failed to get compendium entries';
      return res.status(500).json({
        success: false,
        error: message
      });
    }
  };

  /**
   * Get compendium entry by ID
   * @route GET /api/compendiums/entries/:id
   */
  getCompendiumEntry = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<ICompendiumEntry>>
  ): Promise<Response<BaseAPIResponse<ICompendiumEntry>> | void> => {
    try {
      const entry = await this.compendiumService.getCompendiumEntryById(req.params.id);

      return res.status(200).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      logger.error('Error getting compendium entry:', error);
      const message = isErrorWithMessage(error) ? error.message : 'Failed to get compendium entry';
      const status = message.includes('not found') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  /**
   * Create compendium entry
   * @route POST /api/compendiums/:id/entries
   */
  createCompendiumEntry = async (
    req: Request<{ id: string }, unknown, ICompendiumEntryCreateData>,
    res: Response<BaseAPIResponse<ICompendiumEntry>>
  ): Promise<Response<BaseAPIResponse<ICompendiumEntry>> | void> => {
    try {
      if (!req.session.user) {
        return res.status(401).json({
          success: false,
          error: 'You must be logged in to create a compendium entry'
        });
      }

      // First lookup the compendium by slug to get its ObjectId
      const compendium = await this.compendiumService.getCompendiumById(req.params.id);

      const entry = await this.compendiumService.createCompendiumEntry(
        { ...req.body, compendiumId: compendium.id },
        req.session.user.id
      );

      return res.status(201).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      logger.error('Error creating compendium entry:', error);
      const message = isErrorWithMessage(error) ? error.message : 'Failed to create compendium entry';
      const status = message.includes('not found') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  /**
   * Update compendium entry
   * @route PUT /api/compendiums/entries/:id
   */
  updateCompendiumEntry = async (
    req: Request<{ id: string }, unknown, ICompendiumEntryUpdateData>,
    res: Response<BaseAPIResponse<ICompendiumEntry>>
  ): Promise<Response<BaseAPIResponse<ICompendiumEntry>> | void> => {
    try {
      if (!req.session.user) {
        return res.status(401).json({
          success: false,
          error: 'You must be logged in to update a compendium entry'
        });
      }

      const entry = await this.compendiumService.updateCompendiumEntry(
        req.params.id,
        req.body,
        req.session.user.id
      );

      return res.status(200).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      logger.error('Error updating compendium entry:', error);
      const message = isErrorWithMessage(error) ? error.message : 'Failed to update compendium entry';
      const status = message.includes('not found') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  /**
   * Delete compendium entry
   * @route DELETE /api/compendiums/entries/:id
   */
  deleteCompendiumEntry = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<void>>
  ): Promise<Response<BaseAPIResponse<void>> | void> => {
    try {
      await this.compendiumService.deleteCompendiumEntry(req.params.id);

      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      logger.error('Error deleting compendium entry:', error);
      const message = isErrorWithMessage(error) ? error.message : 'Failed to delete compendium entry';
      const status = message.includes('not found') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  /**
   * Link existing content to compendium
   * @route POST /api/compendiums/:id/link
   */
  linkContent = async (
    req: Request<{ id: string }, unknown, z.infer<typeof linkContentBodySchema>>,
    res: Response<BaseAPIResponse<ICompendiumEntry>>
  ): Promise<Response<BaseAPIResponse<ICompendiumEntry>> | void> => {
    try {
      if (!req.session.user) {
        return res.status(401).json({
          success: false,
          error: 'You must be logged in to link content'
        });
      }

      const body = linkContentBodySchema.parse(req.body);
      
      const entry = await this.compendiumService.linkContentToCompendium(
        req.params.id,
        body.contentType,
        body.contentId,
        body,
        req.session.user.id
      );

      return res.status(201).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      logger.error('Error linking content to compendium:', error);
      const message = isErrorWithMessage(error) ? error.message : 'Failed to link content to compendium';
      return res.status(500).json({
        success: false,
        error: message
      });
    }
  };

  /**
   * Unlink content from compendium
   * @route DELETE /api/compendiums/entries/:id/unlink
   */
  unlinkContent = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<void>>
  ): Promise<Response<BaseAPIResponse<void>> | void> => {
    try {
      await this.compendiumService.unlinkContentFromCompendium(req.params.id);

      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      logger.error('Error unlinking content from compendium:', error);
      const message = isErrorWithMessage(error) ? error.message : 'Failed to unlink content from compendium';
      const status = message.includes('not found') ? 404 : 500;
      return res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  /**
   * Get compendium statistics
   * @route GET /api/compendiums/:id/stats
   */
  getCompendiumStats = async (
    req: Request<{ id: string }>,
    res: Response<BaseAPIResponse<Record<string, unknown>>>
  ): Promise<Response<BaseAPIResponse<Record<string, unknown>>> | void> => {
    try {
      const stats = await this.compendiumService.getCompendiumStats(req.params.id);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting compendium stats:', error);
      const message = isErrorWithMessage(error) ? error.message : 'Failed to get compendium statistics';
      return res.status(500).json({
        success: false,
        error: message
      });
    }
  };
}