import type { IVTTDocument } from '@dungeon-lab/shared/types/index.mjs';
import { VTTDocument } from '../models/vtt-document.model.mjs';
import { logger } from '../../../utils/logger.mjs';
import { deepMerge } from '@dungeon-lab/shared/utils/index.mjs';
import { Types } from 'mongoose';
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

  async createDocument(document: Omit<IVTTDocument, 'id'>, userId: string): Promise<IVTTDocument> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const documentData = {
        ...document,
        createdBy: userObjectId,
        updatedBy: userObjectId
      };

      const newDocument = new VTTDocument(documentData);
      await newDocument.save();
      return newDocument;
    } catch (error) {
      logger.error('Error creating document:', error);
      throw error;
    }
  }

  async patchDocument(
    id: string,
    document: Partial<IVTTDocument>,
    userId: string
  ): Promise<IVTTDocument> {
    try {
      const existingDocument = await VTTDocument.findById(id);
      if (!existingDocument) {
        throw new Error('Document not found');
      }

      const updateData = {
        ...document,
        updatedBy: userId
      };

      const obj = existingDocument?.toObject();
      existingDocument.set(deepMerge(obj, updateData));
      await existingDocument.save();

      return existingDocument;
    } catch (error) {
      logger.error('Error patching document:', error);
      throw error;
    }
  }

  async putDocument(
    id: string,
    document: Omit<IVTTDocument, 'id'>,
    userId: string
  ): Promise<IVTTDocument> {
    try {
      const existingDocument = await VTTDocument.findById(id);
      if (!existingDocument) {
        throw new Error('Document not found');
      }

      const userObjectId = new Types.ObjectId(userId);
      const updateData = {
        ...document,
        updatedBy: userObjectId
      };

      existingDocument.set(updateData);
      await existingDocument.save();
      return existingDocument;
    } catch (error) {
      logger.error('Error updating document:', error);
      throw error;
    }
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
