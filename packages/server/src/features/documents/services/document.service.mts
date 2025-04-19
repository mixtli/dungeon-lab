import { IVTTDocument } from '@dungeon-lab/shared/schemas/vtt-document.schema.mjs';
import { VTTDocument } from '../models/vtt-document.model.mjs';
import { logger } from '../../../utils/logger.mjs';

// Define a type for document query values
export type QueryValue = string | number | boolean | RegExp | Date | object;

export class DocumentService {
  async getDocumentById(id: string): Promise<IVTTDocument> {
    try {
      const document = await VTTDocument.findById(id);
      if (!document) {
        throw new Error('Document not found');
      }
      return document;
    } catch (error) {
      logger.error('Error fetching document:', error);
      throw error;
    }
  }

  async searchDocuments(query: Record<string, QueryValue>): Promise<IVTTDocument[]> {
    try {
      // Convert query to case-insensitive regex for string values
      // Only convert simple string values, not nested paths
      const mongoQuery = Object.entries(query).reduce((acc, [key, value]) => {
        if (typeof value === 'string' && !key.includes('.')) {
          acc[key] = new RegExp(value, 'i');
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, QueryValue>);

      const documents = await VTTDocument.find(mongoQuery);
      return documents;
    } catch (error) {
      logger.error('Error searching documents:', error);
      throw new Error('Failed to search documents');
    }
  }
} 