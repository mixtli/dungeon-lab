import { Request, Response } from 'express';
import { DocumentService, QueryValue } from '../services/document.service.mjs';
import { logger } from '../../../utils/logger.mjs';
import { pluginRegistry } from '../../../services/plugin-registry.service.mjs';
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

  putDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const document = await this.documentService.putDocument(id, req.body);
      res.json(document);
    } catch (error) {
      logger.error('Error in putDocument:', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  };

  patchDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const document = await this.documentService.patchDocument(id, req.body);
      res.json(document);
    } catch (error) {
      logger.error('Error in updateDocument:', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  };

  deleteDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.documentService.deleteDocument(id);
      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      logger.error('Error in deleteDocument:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  createDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const plugin = pluginRegistry.getPlugin(req.body.pluginId);
      if (!plugin) {
        res.status(400).json({ error: 'Invalid game system ID' });
        return
      }
      const data = plugin.validateVTTDocumentData(req.body.documentType, req.body.data);
      if (!data.success) {
        res.status(400).json({ error: data.error });
        return
      }
      const document = await this.documentService.createDocument(req.body);
      res.json(document);
    } catch (error) {
      logger.error('Error in createDocument:', error);  
      res.status(500).json({ error: 'Failed to create document' });
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