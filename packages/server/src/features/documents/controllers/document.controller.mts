import { Request, Response } from 'express';
import { DocumentService, QueryValue } from '../services/document.service.mjs';
import { logger } from '../../../utils/logger.mjs';

export class DocumentController {
  private documentService: DocumentService;

  constructor() {
    this.documentService = new DocumentService();
  }

  getDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const document = await this.documentService.getDocumentById(id);
      res.json(document);
    } catch (error) {
      logger.error('Error in getDocument:', error);
      res.status(404).json({ error: 'Document not found' });
    }
  };

  searchDocuments = async (req: Request, res: Response): Promise<void> => {
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

      const documents = await this.documentService.searchDocuments(query as Record<string, QueryValue>);
      res.json(documents);
    } catch (error) {
      logger.error('Error in searchDocuments:', error);
      res.status(500).json({ error: 'Failed to search documents' });
    }
  };
} 