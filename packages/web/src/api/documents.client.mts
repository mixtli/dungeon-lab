import type { IVTTDocument } from '@dungeon-lab/shared/schemas/vtt-document.schema.mjs';
import {
  CreateDocumentRequest,
  PatchDocumentRequest,
  PutDocumentRequest,
  GetDocumentResponse,
  GetDocumentsResponse,
  CreateDocumentResponse,
  PatchDocumentResponse,
  PutDocumentResponse,
  DeleteDocumentResponse,
  SearchDocumentsQuery
} from '@dungeon-lab/shared/types/api/index.mjs';
import api from './axios.mts';

/**
 * Get a document by ID
 * @param documentId - The ID of the document to retrieve
 * @returns The document or undefined if not found
 */
export async function getDocument(documentId: string): Promise<IVTTDocument | undefined> {
  const response = await api.get<GetDocumentResponse>(`/api/documents/${documentId}`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get document');
  }
  return response.data.data;
}

/**
 * Get all documents (defaults to empty query)
 * @returns Array of documents
 */
export async function getDocuments(): Promise<IVTTDocument[]> {
  const response = await api.get<GetDocumentsResponse>('/api/documents');
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
export async function searchDocuments(query: SearchDocumentsQuery): Promise<IVTTDocument[]> {
  const queryString = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryString.append(key, String(value));
    }
  });

  const response = await api.get<GetDocumentsResponse>(`/api/documents?${queryString.toString()}`);
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
export async function createDocument(
  data: CreateDocumentRequest
): Promise<IVTTDocument | undefined> {
  const response = await api.post<CreateDocumentResponse>('/api/documents', data);
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
export async function patchDocument(
  documentId: string,
  data: PatchDocumentRequest
): Promise<IVTTDocument | undefined> {
  const response = await api.patch<PatchDocumentResponse>(`/api/documents/${documentId}`, data);
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
export async function putDocument(
  documentId: string,
  data: PutDocumentRequest
): Promise<IVTTDocument | undefined> {
  const response = await api.put<PutDocumentResponse>(`/api/documents/${documentId}`, data);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to replace document');
  }
  return response.data.data;
}

/**
 * Delete a document
 * @param documentId - The ID of the document to delete
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const response = await api.delete<DeleteDocumentResponse>(`/api/documents/${documentId}`);
  if (response.data && !response.data.success) {
    throw new Error(response.data.error || 'Failed to delete document');
  }
}
