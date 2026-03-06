import type { Socket } from 'socket.io-client';
import type {
  BaseDocument,
  DocumentTypeMap,
  DocumentType
} from '@dungeon-lab/shared/types/index.js';
import type {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  SearchDocumentsQuery
} from '@dungeon-lab/shared/types/api/documents.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  DocumentGetRequest,
  DocumentSearchRequest,
  DocumentCreateRequest,
  DocumentUpdateRequest,
  DocumentDeleteRequest,
  DocumentGetResponse,
  DocumentSearchResponse,
  DocumentCreateResponse,
  DocumentUpdateResponse,
  DocumentDeleteResponse
} from '@dungeon-lab/shared/types/socket/index.js';

/**
 * Socket-based client for document operations
 * Provides the same interface as DocumentsClient but uses Socket.io for real-time communication
 */
export class DocumentsSocketClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  constructor(socket?: Socket<ServerToClientEvents, ClientToServerEvents>) {
    this.socket = socket || null;
  }

  /**
   * Set the socket instance
   */
  setSocket(socket: Socket<ServerToClientEvents, ClientToServerEvents>): void {
    this.socket = socket;
  }

  /**
   * Helper method to ensure socket is available
   */
  private ensureSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (!this.socket) {
      throw new Error('Socket not available. Make sure socket is connected and set.');
    }
    return this.socket;
  }

  /**
   * Helper method for document:get socket calls
   */
  private documentGetCall(
    request: DocumentGetRequest,
    timeout = DocumentsSocketClient.DEFAULT_TIMEOUT
  ): Promise<DocumentGetResponse> {
    return new Promise((resolve, reject) => {
      const socket = this.ensureSocket();

      const timeoutId = setTimeout(() => {
        reject(new Error(`Socket call 'document:get' timed out after ${timeout}ms`));
      }, timeout);

      try {
        socket.emit('document:get', request, (response: DocumentGetResponse) => {
          clearTimeout(timeoutId);
          resolve(response);
        });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Helper method for document:search socket calls
   */
  private documentSearchCall(
    request: DocumentSearchRequest,
    timeout = DocumentsSocketClient.DEFAULT_TIMEOUT
  ): Promise<DocumentSearchResponse> {
    return new Promise((resolve, reject) => {
      const socket = this.ensureSocket();

      const timeoutId = setTimeout(() => {
        reject(new Error(`Socket call 'document:search' timed out after ${timeout}ms`));
      }, timeout);

      try {
        socket.emit('document:search', request, (response: DocumentSearchResponse) => {
          clearTimeout(timeoutId);
          resolve(response);
        });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Helper method for document:create socket calls
   */
  private documentCreateCall(
    request: DocumentCreateRequest,
    timeout = DocumentsSocketClient.DEFAULT_TIMEOUT
  ): Promise<DocumentCreateResponse> {
    return new Promise((resolve, reject) => {
      const socket = this.ensureSocket();

      const timeoutId = setTimeout(() => {
        reject(new Error(`Socket call 'document:create' timed out after ${timeout}ms`));
      }, timeout);

      try {
        socket.emit('document:create', request, (response: DocumentCreateResponse) => {
          clearTimeout(timeoutId);
          resolve(response);
        });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Helper method for document:update socket calls
   */
  private documentUpdateCall(
    request: DocumentUpdateRequest,
    timeout = DocumentsSocketClient.DEFAULT_TIMEOUT
  ): Promise<DocumentUpdateResponse> {
    return new Promise((resolve, reject) => {
      const socket = this.ensureSocket();

      const timeoutId = setTimeout(() => {
        reject(new Error(`Socket call 'document:update' timed out after ${timeout}ms`));
      }, timeout);

      try {
        socket.emit('document:update', request, (response: DocumentUpdateResponse) => {
          clearTimeout(timeoutId);
          resolve(response);
        });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Helper method for document:delete socket calls
   */
  private documentDeleteCall(
    request: DocumentDeleteRequest,
    timeout = DocumentsSocketClient.DEFAULT_TIMEOUT
  ): Promise<DocumentDeleteResponse> {
    return new Promise((resolve, reject) => {
      const socket = this.ensureSocket();

      const timeoutId = setTimeout(() => {
        reject(new Error(`Socket call 'document:delete' timed out after ${timeout}ms`));
      }, timeout);

      try {
        socket.emit('document:delete', request, (response: DocumentDeleteResponse) => {
          clearTimeout(timeoutId);
          resolve(response);
        });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Helper method to handle response and extract data
   */
  private handleResponse<T>(response: { success: boolean; data?: T; error?: string }): T | undefined {
    if (!response.success) {
      throw new Error(response.error || 'Socket operation failed');
    }
    return response.data;
  }

  /**
   * Get a document by ID with specific type
   */
  async getDocument<T extends DocumentType>(
    documentId: string,
    documentType: T
  ): Promise<DocumentTypeMap[T] | undefined>

  /**
   * Get a document by ID (untyped)
   */
  async getDocument(documentId: string): Promise<BaseDocument | undefined>

  async getDocument(
    documentId: string,
    documentType?: DocumentType // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<BaseDocument | undefined> {
    const request: DocumentGetRequest = {
      id: documentId,
      documentType
    };

    const response = await this.documentGetCall(request);

    return this.handleResponse(response);
  }

  /**
   * Get documents with specific type
   */
  async getDocuments<T extends DocumentType>(
    params: SearchDocumentsQuery & { documentType: T }
  ): Promise<DocumentTypeMap[T][]>

  /**
   * Get all documents (untyped)
   */
  async getDocuments(params?: SearchDocumentsQuery): Promise<BaseDocument[]>

  async getDocuments(params?: SearchDocumentsQuery): Promise<BaseDocument[]> {
    const request: DocumentSearchRequest = {
      documentType: params?.documentType,
      pluginId: params?.pluginId,
      pluginDocumentType: params?.pluginDocumentType,
      ownerId: params?.ownerId as string | undefined,
      name: params?.name,
      limit: params?.limit as number | undefined,
      offset: params?.offset as number | undefined
    };

    const response = await this.documentSearchCall(request);

    return this.handleResponse(response) || [];
  }

  /**
   * Search documents with specific type
   */
  async searchDocuments<T extends DocumentType>(
    query: SearchDocumentsQuery & { documentType: T }
  ): Promise<DocumentTypeMap[T][]>

  /**
   * Search documents (untyped)
   */
  async searchDocuments(query: SearchDocumentsQuery): Promise<BaseDocument[]>

  async searchDocuments(query: SearchDocumentsQuery): Promise<BaseDocument[]> {
    // For socket client, search and get are the same operation
    return this.getDocuments(query);
  }

  /**
   * Create a new document with specific type
   */
  async createDocument<T extends DocumentType>(
    data: CreateDocumentRequest & { documentType: T }
  ): Promise<DocumentTypeMap[T] | undefined>

  /**
   * Create a new document (untyped)
   */
  async createDocument(data: CreateDocumentRequest): Promise<BaseDocument | undefined>

  async createDocument(data: CreateDocumentRequest): Promise<BaseDocument | undefined> {
    const request: DocumentCreateRequest = {
      name: data.name,
      documentType: data.documentType,
      pluginId: data.pluginId,
      pluginDocumentType: data.pluginDocumentType,
      pluginData: data.pluginData || {},
      userData: data.userData || {}
    };

    const response = await this.documentCreateCall(request);

    return this.handleResponse(response);
  }

  /**
   * Update document (handles both partial and full updates)
   */
  async updateDocument(
    documentId: string,
    data: UpdateDocumentRequest
  ): Promise<BaseDocument | undefined> {
    const request: DocumentUpdateRequest = {
      id: documentId,
      data: {
        name: data.name,
        pluginData: data.pluginData,
        userData: data.userData,
        state: data.state,
        itemState: data.itemState
      }
    };

    const response = await this.documentUpdateCall(request);

    return this.handleResponse(response);
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    const request: DocumentDeleteRequest = {
      id: documentId
    };

    const response = await this.documentDeleteCall(request);

    this.handleResponse(response);
  }

  /**
   * Resolve ObjectId references in documents (not implemented for socket client)
   * This operation is administrative and should use the REST client
   */
  async resolveDocumentReferences(documentIds: string[]): Promise<{ // eslint-disable-line @typescript-eslint/no-unused-vars
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
    throw new Error('resolveDocumentReferences is not supported by socket client. Use REST client for administrative operations.');
  }
}