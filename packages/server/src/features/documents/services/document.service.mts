import { IVTTDocument } from '@dungeon-lab/shared/schemas/vtt-document.schema.mjs';
import { VTTDocument } from '../models/vtt-document.model.mjs';
import { logger } from '../../../utils/logger.mjs';
import { deepMerge } from '@dungeon-lab/shared/utils/deepMerge.mjs';
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

  async createDocument(document: IVTTDocument): Promise<IVTTDocument> {
    const newDocument = new VTTDocument(document);
    await newDocument.save();
    return newDocument;
  }

  async updateDocument(id: string, document: IVTTDocument): Promise<IVTTDocument> {
    const existingDocument = await VTTDocument.findById(id);
    if (!existingDocument) {
      throw new Error('Document not found');
    }
    const obj = existingDocument?.toObject();
    existingDocument.set(deepMerge(obj, document));
    await existingDocument.save();

    // const updatedDocument = await VTTDocument.findByIdAndUpdate(id, document, { new: true });
    // if (!updatedDocument) {
    //   throw new Error('Document not found');
    // }
    // return updatedDocument;
    return existingDocument;
  }

  async deleteDocument(id: string): Promise<void> {
    await VTTDocument.findByIdAndDelete(id);
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