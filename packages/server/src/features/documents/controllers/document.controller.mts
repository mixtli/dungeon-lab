import { Request, Response } from 'express';
import { DocumentService, QueryValue } from '../services/document.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import {
  BaseAPIResponse,
  createDocumentRequestSchema,
  putDocumentRequestSchema,
  patchDocumentRequestSchema,
  SearchDocumentsQuery
} from '@dungeon-lab/shared/types/api/index.mjs';
import { 
  characterCreateSchema,
  actorCreateSchema,
  itemCreateSchema,
  vttDocumentCreateSchema
} from '@dungeon-lab/shared/schemas/index.mjs';
import { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';
import { ZodError } from 'zod';
import { createSearchParams } from '../../../utils/create.search.params.mjs';
import { isErrorWithMessage } from '../../../utils/error.mjs';

export class DocumentController {
  constructor() {
    // No need for instance - all methods are static now
  }

  getDocument = async (
    req: Request,
    res: Response<BaseAPIResponse<BaseDocument>>
  ): Promise<Response<BaseAPIResponse<BaseDocument>> | void> => {
    try {
      const { id } = req.params;
      const document = await DocumentService.findById(id);
      if (!document) {
        throw new Error('Document not found');
      }
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
    req: Request<{ id: string }, object, BaseDocument>,
    res: Response<BaseAPIResponse<BaseDocument>>
  ): Promise<Response<BaseAPIResponse<BaseDocument>> | void> => {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;
      const validatedData = putDocumentRequestSchema.parse(req.body);
      const updateData = {
        ...validatedData,
        updatedBy: userId
      };
      
      // DEBUG: Log what we're updating
      logger.info('[DEBUG] putDocument - About to update document:', {
        id,
        userId,
        updateDataKeys: Object.keys(updateData),
        armorClassUpdate: (updateData.pluginData as Record<string, unknown>)?.attributes && 
                          ((updateData.pluginData as Record<string, unknown>).attributes as Record<string, unknown>)?.armorClass,
        fullPluginData: updateData.pluginData
      });
      
      const document = await DocumentService.updateById(id, updateData);
      
      // DEBUG: Log what we got back
      logger.info('[DEBUG] putDocument - Document update result:', {
        id,
        found: !!document,
        armorClassInResult: (document?.pluginData as Record<string, unknown>)?.attributes && 
                            ((document?.pluginData as Record<string, unknown>).attributes as Record<string, unknown>)?.armorClass
      });
      
      if (!document) {
        throw new Error('Document not found');
      }
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
    req: Request<{ id: string }, object, BaseDocument>,
    res: Response<BaseAPIResponse<BaseDocument>>
  ): Promise<Response<BaseAPIResponse<BaseDocument>> | void> => {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;
      const validatedData = patchDocumentRequestSchema.parse(req.body);
      const updateData = {
        ...validatedData,
        updatedBy: userId
      };
      const document = await DocumentService.updateById(id, updateData);
      if (!document) {
        throw new Error('Document not found');
      }
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
      const deleted = await DocumentService.deleteById(id);
      if (!deleted) {
        throw new Error('Document not found');
      }
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
    req: Request<object, object, BaseDocument>,
    res: Response<BaseAPIResponse<BaseDocument>>
  ): Promise<Response<BaseAPIResponse<BaseDocument>> | void> => {
    try {
      const userId = req.session.user.id;
      
      // Use document-type-specific validation schema
      let validatedData: unknown;
      const documentType = req.body.documentType;
      
      switch (documentType) {
        case 'character': {
          // Use character create schema which already omits server-generated fields
          validatedData = characterCreateSchema.parse(req.body);
          break;
        }
        case 'actor': {
          // Use actor create schema which already omits server-generated fields  
          validatedData = actorCreateSchema.parse(req.body);
          break;
        }
        case 'item': {
          validatedData = itemCreateSchema.parse(req.body);
          break;
        }
        case 'vtt-document': {
          validatedData = vttDocumentCreateSchema.parse(req.body);
          break;
        }
        default:
          // Fallback to base document schema
          validatedData = createDocumentRequestSchema.parse(req.body);
          break;
      }
      
      // Note: Plugin validation now happens client-side only
      // Server trusts that client has already validated plugin data

      // Auto-generate slug from name if not provided
      const data = validatedData as Record<string, unknown>;
      const documentData = {
        ...data,
        slug: (data.slug as string) || this.generateSlugFromName(data.name as string),
        createdBy: userId,
        updatedBy: userId
      };

      const document = await DocumentService.create(documentData as Omit<BaseDocument, 'id' | 'createdAt' | 'updatedAt'>);
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

  /**
   * Generate a URL-friendly slug from a name
   */
  private generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  searchDocuments = async (
    req: Request<object, object, object, SearchDocumentsQuery>,
    res: Response<BaseAPIResponse<BaseDocument[]>>
  ): Promise<Response<BaseAPIResponse<BaseDocument[]>> | void> => {
    try {
      // Convert dot notation in query params to nested objects
      const query = createSearchParams(req.query as Record<string, QueryValue>);

      // Convert query to case-insensitive regex for string values
      const mongoQuery = Object.entries(query).reduce((acc, [key, value]) => {
        if (typeof value === 'string' && !key.includes('.')) {
          acc[key] = new RegExp(value, 'i');
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, QueryValue>);
      
      const documents = await DocumentService.find(mongoQuery);
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
