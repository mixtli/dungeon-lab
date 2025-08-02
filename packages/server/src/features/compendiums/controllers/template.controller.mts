import { Request, Response } from 'express';
import { CompendiumEntryModel } from '../models/compendium-entry.model.mjs';
import { TemplateService } from '../services/template.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import type { ICompendiumEntry } from '@dungeon-lab/shared/types/index.mjs';

// Extended interface for MongoDB document with populated fields
interface ICompendiumEntryDocument extends Omit<ICompendiumEntry, '_id'> {
  _id: unknown; // MongoDB ObjectId
  [key: string]: unknown;
}

export class TemplateController {
  private templateService = new TemplateService();

  /**
   * POST /api/compendiums/:compendiumId/entries/:entryId/instantiate
   * Create an instance from a compendium template
   */
  async instantiateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { compendiumId, entryId } = req.params;
      const { overrides = {}, campaignId } = req.body;
      
      if (!req.session?.user?.id) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const entry = await CompendiumEntryModel.findOne({
        _id: entryId,
        compendiumId
      }).lean();

      if (!entry) {
        res.status(404).json({ error: 'Compendium entry not found' });
        return;
      }

      // Validate campaignId is provided for actors and items
      if ((entry.entry.documentType === 'actor' || entry.entry.documentType === 'item') && !campaignId) {
        res.status(400).json({ 
          error: `Campaign ID is required when instantiating ${entry.entry.documentType} documents`,
          details: `${entry.entry.documentType} documents must belong to a campaign`
        });
        return;
      }

      const instance = await this.templateService.createFromTemplate(
        entry as unknown as ICompendiumEntryDocument,
        overrides,
        req.session.user.id,
        campaignId
      );

      res.status(201).json({
        success: true,
        data: instance
      });
    } catch (error) {
      logger.error('Error instantiating template:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create instance from template',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * PUT /api/compendiums/:compendiumId/entries/:entryId/template
   * Update template content
   */
  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { compendiumId, entryId } = req.params;
      const newData = req.body;

      const entry = await CompendiumEntryModel.findOne({
        _id: entryId,
        compendiumId
      }).lean();

      if (!entry) {
        res.status(404).json({ error: 'Compendium entry not found' });
        return;
      }

      const updatedEntry = await this.templateService.updateTemplate(entry as unknown as ICompendiumEntryDocument, newData);

      res.json(updatedEntry);
    } catch (error) {
      logger.error('Error updating template:', error);
      res.status(500).json({ 
        error: 'Failed to update template',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * GET /api/compendiums/:compendiumId/entries/:entryId/template
   * Get template content
   */
  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { compendiumId, entryId } = req.params;

      const entry = await CompendiumEntryModel.findOne({
        _id: entryId,
        compendiumId
      }).lean();

      if (!entry) {
        res.status(404).json({ error: 'Compendium entry not found' });
        return;
      }

      const templateData = this.templateService.getTemplate(entry as unknown as ICompendiumEntryDocument);

      res.json({
        entryId: entry._id,
        contentType: entry.entry.documentType,
        templateData
      });
    } catch (error) {
      logger.error('Error getting template:', error);
      res.status(500).json({ 
        error: 'Failed to get template',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * GET /api/compendiums/:compendiumId/entries/:entryId/usage
   * Get template usage statistics
   */
  async getTemplateUsage(req: Request, res: Response): Promise<void> {
    try {
      const { entryId } = req.params;

      const usage = await this.templateService.getTemplateUsage(entryId);

      res.json(usage);
    } catch (error) {
      logger.error('Error getting template usage:', error);
      res.status(500).json({ 
        error: 'Failed to get template usage',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}