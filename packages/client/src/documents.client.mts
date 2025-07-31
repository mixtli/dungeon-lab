import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';
import {
  BaseAPIResponse,
  CreateDocumentRequest,
  PatchDocumentRequest,
  PutDocumentRequest,
  SearchDocumentsQuery
} from '@dungeon-lab/shared/types/api/index.mjs';
import { ApiClient } from './api.client.mjs';

/**
 * Client for interacting with the documents API
 */
export class DocumentsClient extends ApiClient {
  /**
   * Get a document by ID
   * @param documentId - The ID of the document to retrieve
   * @returns The document or undefined if not found
   */
  async getDocument(documentId: string): Promise<BaseDocument | undefined> {
    const response = await this.api.get<BaseAPIResponse<BaseDocument>>(
      `/api/documents/${documentId}`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get document');
    }
    return response.data.data;
  }

  /**
   * Get all documents (defaults to empty query)
   * @returns Array of documents
   */
  async getDocuments(params?: SearchDocumentsQuery): Promise<BaseDocument[]> {
    const response = await this.api.get<BaseAPIResponse<BaseDocument[]>>('/api/documents', {
      params
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get documents');
    }
    return response.data.data;
  }

  /**
   * Search documents with query parameters
   * @param query - Search query parameters
   * @returns Array of matching documents
   */
  async searchDocuments(query: SearchDocumentsQuery): Promise<BaseDocument[]> {
    const queryString = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryString.append(key, String(value));
      }
    });

    const response = await this.api.get<BaseAPIResponse<BaseDocument[]>>(
      `/api/documents?${queryString.toString()}`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to search documents');
    }
    return response.data.data;
  }

  /**
   * Create a new document
   * @param data - The document data to create
   * @returns The created document or undefined
   */
  async createDocument(data: CreateDocumentRequest): Promise<BaseDocument | undefined> {
    const response = await this.api.post<BaseAPIResponse<BaseDocument>>('/api/documents', data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create document');
    }
    return response.data.data;
  }

  /**
   * Update document (partial update with PATCH)
   * @param documentId - The ID of the document to update
   * @param data - The partial document data to update
   * @returns The updated document or undefined
   */
  async patchDocument(
    documentId: string,
    data: PatchDocumentRequest
  ): Promise<BaseDocument | undefined> {
    const response = await this.api.patch<BaseAPIResponse<BaseDocument>>(
      `/api/documents/${documentId}`,
      data
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update document');
    }
    return response.data.data;
  }

  /**
   * Replace document (full update with PUT)
   * @param documentId - The ID of the document to replace
   * @param data - The complete document data
   * @returns The updated document or undefined
   */
  async putDocument(
    documentId: string,
    data: PutDocumentRequest
  ): Promise<BaseDocument | undefined> {
    const response = await this.api.put<BaseAPIResponse<BaseDocument>>(
      `/api/documents/${documentId}`,
      data
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to replace document');
    }
    return response.data.data;
  }

  /**
   * Delete a document
   * @param documentId - The ID of the document to delete
   */
  async deleteDocument(documentId: string): Promise<void> {
    const response = await this.api.delete<BaseAPIResponse<void>>(`/api/documents/${documentId}`);
    if (response.data && !response.data.success) {
      throw new Error(response.data.error || 'Failed to delete document');
    }
  }
}
