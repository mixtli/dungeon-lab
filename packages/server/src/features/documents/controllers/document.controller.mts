import { Request, Response } from 'express';
import { DocumentService, QueryValue } from '../services/document.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { pluginRegistry } from '../../../services/plugin-registry.service.mjs';
import {
  BaseAPIResponse,
  createDocumentRequestSchema,
  putDocumentRequestSchema,
  patchDocumentRequestSchema,
  SearchDocumentsQuery
} from '@dungeon-lab/shared/types/api/index.mjs';
import { IVTTDocument } from '@dungeon-lab/shared/types/index.mjs';
import { ZodError } from 'zod';
import { createSearchParams } from '../../../utils/create.search.params.mjs';
import { isErrorWithMessage } from '../../../utils/error.mjs';

export class DocumentController {
  private documentService: DocumentService;

  constructor() {
    this.documentService = new DocumentService();
  }

  getDocument = async (
    req: Request,
    res: Response<BaseAPIResponse<IVTTDocument>>
  ): Promise<Response<BaseAPIResponse<IVTTDocument>> | void> => {
    try {
      const { id } = req.params;
      const document = await this.documentService.getDocumentById(id);
      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      logger.error('Error in getDocument:', error);
      if (isErrorWithMessage(error) && error.message === 'Document not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Document not found'
        });
      }
      res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to retrieve document'
      });
    }
  };

  putDocument = async (
    req: Request<{ id: string }, object, IVTTDocument>,
    res: Response<BaseAPIResponse<IVTTDocument>>
  ): Promise<Response<BaseAPIResponse<IVTTDocument>> | void> => {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;
      const validatedData = putDocumentRequestSchema.parse(req.body);
      const document = await this.documentService.putDocument(id, validatedData, userId);
      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      logger.error('Error in putDocument:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          data: null,
          error: error.errors.map((e) => e.message).join(', ')
        });
      }
      if (isErrorWithMessage(error) && error.message === 'Document not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Document not found'
        });
      }
      res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to update document'
      });
    }
  };

  patchDocument = async (
    req: Request<{ id: string }, object, IVTTDocument>,
    res: Response<BaseAPIResponse<IVTTDocument>>
  ): Promise<Response<BaseAPIResponse<IVTTDocument>> | void> => {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;
      const validatedData = patchDocumentRequestSchema.parse(req.body);
      const document = await this.documentService.patchDocument(id, validatedData, userId);
      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      logger.error('Error in patchDocument:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          data: null,
          error: error.errors.map((e) => e.message).join(', ')
        });
      }
      if (isErrorWithMessage(error) && error.message === 'Document not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Document not found'
        });
      }
      res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to update document'
      });
    }
  };

  deleteDocument = async (
    req: Request,
    res: Response<BaseAPIResponse<void>>
  ): Promise<Response<BaseAPIResponse<void>> | void> => {
    try {
      const { id } = req.params;
      await this.documentService.deleteDocument(id);
      res.json({
        success: true,
        data: null
      });
    } catch (error) {
      logger.error('Error in deleteDocument:', error);
      if (isErrorWithMessage(error) && error.message === 'Document not found') {
        return res.status(404).json({
          success: false,
          data: null,
          error: 'Document not found'
        });
      }
      res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to delete document'
      });
    }
  };

  createDocument = async (
    req: Request<object, object, IVTTDocument>,
    res: Response<BaseAPIResponse<IVTTDocument>>
  ): Promise<Response<BaseAPIResponse<IVTTDocument>> | void> => {
    try {
      const userId = req.session.user.id;
      const validatedData = createDocumentRequestSchema.parse(req.body);
      const plugin = pluginRegistry.getPlugin(validatedData.pluginId);

      if (!plugin) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Invalid game system ID'
        });
      }

      const data = plugin.validateVTTDocumentData?.(validatedData.documentType, validatedData.data) || { success: true };
      if (!data.success) {
        return res.status(400).json({
          success: false,
          data: null,
          error: data.error instanceof Error ? data.error.message : 'Invalid document data'
        });
      }

      const document = await this.documentService.createDocument(validatedData, userId);
      res.status(201).json({
        success: true,
        data: document
      });
    } catch (error) {
      logger.error('Error in createDocument:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          data: null,
          error: error.errors.map((e) => e.message).join(', ')
        });
      }
      res.status(500).json({
        success: false,
        data: null,
        error: 'Failed to create document'
      });
    }
  };

  searchDocuments = async (
    req: Request<object, object, object, SearchDocumentsQuery>,
    res: Response<BaseAPIResponse<IVTTDocument[]>>
  ): Promise<Response<BaseAPIResponse<IVTTDocument[]>> | void> => {
    try {
      // Convert dot notation in query params to nested objects
      const query = createSearchParams(req.query as Record<string, QueryValue>);

      const documents = await this.documentService.searchDocuments(query);
      res.json({
        success: true,
        data: documents
      });
    } catch (error) {
      logger.error('Error in searchDocuments:', error);
      res.status(500).json({
        success: false,
        data: [],
        error: 'Failed to search documents'
      });
    }
  };
}
