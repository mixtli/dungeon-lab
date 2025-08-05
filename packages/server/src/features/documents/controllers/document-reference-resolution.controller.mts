import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { documentReferenceResolverService } from '../services/document-reference-resolver.service.mjs';
import { logger } from '../../../utils/logger.mjs';

export class DocumentReferenceResolutionController {
  /**
   * POST /api/documents/resolve-references
   * Resolves ObjectId references in documents to ensure they point to documents rather than compendium entries
   */
  async resolveDocumentReferences(req: Request, res: Response): Promise<void> {
    try {
      const { documentIds } = req.body;
      
      if (!req.session?.user?.id) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        res.status(400).json({ error: 'documentIds array is required and must not be empty' });
        return;
      }

      // Validate that all documentIds are valid ObjectIds
      const validObjectIds: Types.ObjectId[] = [];
      for (const id of documentIds) {
        if (!Types.ObjectId.isValid(id)) {
          res.status(400).json({ error: `Invalid ObjectId: ${id}` });
          return;
        }
        validObjectIds.push(new Types.ObjectId(id));
      }

      logger.info(`Starting document reference resolution for ${validObjectIds.length} documents by user ${req.session.user.id}`);

      const result = await documentReferenceResolverService.resolveDocumentReferences(
        validObjectIds,
        req.session.user.id
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error resolving document references:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve document references',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}