import type { BaseDocument, DocumentTypeMap, DocumentType } from '@dungeon-lab/shared/types/index.mjs';
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
   * Get a document by ID with specific type
   * @param documentId - The ID of the document to retrieve
   * @param documentType - The type of document expected
   * @returns The document or undefined if not found
   */
  async getDocument<T extends DocumentType>(
    documentId: string,
    documentType: T
  ): Promise<DocumentTypeMap[T] | undefined>
  
  /**
   * Get a document by ID (untyped)
   * @param documentId - The ID of the document to retrieve
   * @returns The document or undefined if not found
   */
  async getDocument(documentId: string): Promise<BaseDocument | undefined>
  
  async getDocument(
    documentId: string, 
    documentType?: DocumentType // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<BaseDocument | undefined> {
    const response = await this.api.get<BaseAPIResponse<BaseDocument>>(
      `/api/documents/${documentId}`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get document');
    }
    return response.data.data;
  }

  /**
   * Get documents with specific type
   * @param params - Search parameters including documentType
   * @returns Array of documents of the specified type
   */
  async getDocuments<T extends DocumentType>(
    params: SearchDocumentsQuery & { documentType: T }
  ): Promise<DocumentTypeMap[T][]>
  
  /**
   * Get all documents (untyped)
   * @param params - Search parameters
   * @returns Array of documents
   */
  async getDocuments(params?: SearchDocumentsQuery): Promise<BaseDocument[]>
  
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
   * Search documents with specific type
   * @param query - Search query parameters including documentType
   * @returns Array of matching documents of the specified type
   */
  async searchDocuments<T extends DocumentType>(
    query: SearchDocumentsQuery & { documentType: T }
  ): Promise<DocumentTypeMap[T][]>
  
  /**
   * Search documents (untyped)
   * @param query - Search query parameters
   * @returns Array of matching documents
   */
  async searchDocuments(query: SearchDocumentsQuery): Promise<BaseDocument[]>
  
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
   * Create a new document with specific type
   * @param data - The document data to create with documentType
   * @returns The created document or undefined
   */
  async createDocument<T extends DocumentType>(
    data: CreateDocumentRequest & { documentType: T }
  ): Promise<DocumentTypeMap[T] | undefined>
  
  /**
   * Create a new document (untyped)
   * @param data - The document data to create
   * @returns The created document or undefined
   */
  async createDocument(data: CreateDocumentRequest): Promise<BaseDocument | undefined>
  
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

  /**
   * Resolve ObjectId references in documents to ensure they point to documents rather than compendium entries
   * @param documentIds - Array of document IDs to resolve references for
   * @returns Resolution result with statistics and details
   */
  async resolveDocumentReferences(documentIds: string[]): Promise<{
    processed: number;
    resolved: number;
    created: number;
    errors: number;
    details: Array<{
      documentId: string;
      fieldPath: string;
      originalObjectId: string;
      resolvedObjectId?: string;
      action: 'kept_existing' | 'resolved_to_document' | 'created_document' | 'error';
      error?: string;
    }>;
  }> {
    const response = await this.api.post<BaseAPIResponse<{
      processed: number;
      resolved: number;
      created: number;
      errors: number;
      details: Array<{
        documentId: string;
        fieldPath: string;
        originalObjectId: string;
        resolvedObjectId?: string;
        action: 'kept_existing' | 'resolved_to_document' | 'created_document' | 'error';
        error?: string;
      }>;
    }>>('/api/documents/resolve-references', {
      documentIds
    });
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to resolve document references');
    }
    
    return response.data.data;
  }
}
