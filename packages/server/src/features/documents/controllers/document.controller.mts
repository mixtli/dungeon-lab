import { Request, Response } from 'express';
import { DocumentService, QueryValue } from '../services/document.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { pluginRegistry } from '../../../services/plugin-registry.service.mjs';
import {
  GetDocumentResponse,
  CreateDocumentRequest,
  CreateDocumentResponse,
  PutDocumentRequest,
  PutDocumentResponse,
  PatchDocumentRequest,
  PatchDocumentResponse,
  DeleteDocumentResponse,
  SearchDocumentsResponse,
  createDocumentRequestSchema,
  putDocumentRequestSchema,
  patchDocumentRequestSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { ZodError } from 'zod';

export class DocumentController {
  private documentService: DocumentService;

  constructor() {
    this.documentService = new DocumentService();
  }

  getDocument = async (
    req: Request,
    res: Response<GetDocumentResponse>
  ): Promise<Response<GetDocumentResponse> | void> => {
    try {
      const { id } = req.params;
      const document = await this.documentService.getDocumentById(id);
      res.json({
        success: true,
        data: document
      });
    } catch (error) {
      logger.error('Error in getDocument:', error);
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
  };

  putDocument = async (
    req: Request<{ id: string }, object, PutDocumentRequest>,
    res: Response<PutDocumentResponse>
  ): Promise<Response<PutDocumentResponse> | void> => {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;
      const validatedData = putDocumentRequestSchema.parse(req.body);
      // @ts-expect-error - Service expects id which will be provided from route params
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
          error: JSON.parse(error.message)
        });
      }
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to update document'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to update document'
      });
    }
  };

  patchDocument = async (
    req: Request<{ id: string }, object, PatchDocumentRequest>,
    res: Response<PatchDocumentResponse>
  ): Promise<Response<PatchDocumentResponse> | void> => {
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
      logger.error('Error in updateDocument:', error);
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: JSON.parse(error.message)
        });
      }
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to update document'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to update document'
      });
    }
  };

  deleteDocument = async (
    req: Request,
    res: Response<DeleteDocumentResponse>
  ): Promise<Response<DeleteDocumentResponse> | void> => {
    try {
      const { id } = req.params;
      await this.documentService.deleteDocument(id);
      res.status(204).send();
    } catch (error) {
      logger.error('Error in deleteDocument:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to delete document'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to delete document'
      });
    }
  };

  createDocument = async (
    req: Request<object, object, CreateDocumentRequest>,
    res: Response<CreateDocumentResponse>
  ): Promise<Response<CreateDocumentResponse> | void> => {
    try {
      const userId = req.session.user.id;
      const validatedData = createDocumentRequestSchema.parse(req.body);
      const plugin = pluginRegistry.getPlugin(validatedData.pluginId);

      if (!plugin) {
        return res.status(400).json({
          success: false,
          error: 'Invalid game system ID'
        });
      }

      const data = plugin.validateVTTDocumentData(validatedData.documentType, validatedData.data);
      if (!data.success) {
        return res.status(400).json({
          success: false,
          error: JSON.parse(data.error.message)
        });
      }

      // @ts-expect-error - Service expects id which will be generated
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
          error: JSON.parse(error.message)
        });
      }
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to create document'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to create document ' + error
      });
    }
  };

  searchDocuments = async (
    req: Request,
    res: Response<SearchDocumentsResponse>
  ): Promise<Response<SearchDocumentsResponse> | void> => {
    try {
      // Convert dot notation in query params to nested objects
      const query = Object.entries(req.query).reduce((acc, [key, value]) => {
        if (key.includes('.')) {
          const parts = key.split('.');
          let current = acc;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!(parts[i] in current)) {
              current[parts[i]] = {};
            }
            current = current[parts[i]] as Record<string, unknown>;
          }
          current[parts[parts.length - 1]] = value;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, unknown>);

      const documents = await this.documentService.searchDocuments(
        query as Record<string, QueryValue>
      );
      res.status(200).json({
        success: true,
        data: documents
      });
    } catch (error) {
      logger.error('Error in searchDocuments:', error);
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          data: [],
          error: error.message || 'Failed to search documents'
        });
      }
      res.status(500).json({
        success: false,
        data: [],
        error: 'Failed to search documents'
      });
    }
  };
}
