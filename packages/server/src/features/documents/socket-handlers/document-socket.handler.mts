import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../../../websocket/handler-registry.mjs';
import { logger } from '../../../utils/logger.mjs';
import { DocumentService } from '../services/document.service.mjs';
import type { FilterQuery } from 'mongoose';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  DocumentChangedNotification,
  DocumentSearchRequest,
  DocumentCreateRequest,
  DocumentUpdateRequest,
  DocumentDeleteRequest,
  DocumentSearchResponse,
  DocumentCreateResponse,
  DocumentUpdateResponse,
  DocumentDeleteResponse
} from '@dungeon-lab/shared/types/socket/index.mjs';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';

/**
 * Socket handler for document operations
 * Provides real-time document access for encounter contexts
 */
function documentSocketHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>) {
  const userId = socket.userId;

  // Helper function to create success response
  const createSuccessResponse = <T,>(data: T): { success: true; data: T; error?: undefined } => ({
    success: true,
    data
  });

  // Helper function to create error response
  const createErrorResponse = (error: string): { success: false; error: string; data?: undefined } => ({
    success: false,
    error
  });

  // Helper function to broadcast document changes to relevant users
  const broadcastDocumentChange = (action: 'created' | 'updated' | 'deleted', document?: BaseDocument, documentId?: string) => {
    const notification: DocumentChangedNotification = {
      action,
      document,
      documentId: documentId || document?.id || '',
      userId: userId || ''
    };

    // Broadcast to all connected sockets (in future, this could be scoped to session/campaign participants)
    socket.broadcast.emit('document:changed', notification);

    logger.debug(`Document ${action} broadcast sent`, {
      documentId: notification.documentId,
      action,
      userId
    });
  };

  /**
   * Get a document by ID
   */
  socket.on('document:get', async (request, callback) => {
    try {
      logger.debug(`Document get request from ${userId}`, request);

      if (!request.id) {
        callback(createErrorResponse('Document ID is required'));
        return;
      }

      const document = await DocumentService.findById(request.id);

      if (!document) {
        callback(createErrorResponse('Document not found'));
        return;
      }

      // Check if user has permission to access this document
      // For now, we'll allow access to all documents, but this could be restricted in the future

      callback(createSuccessResponse(document));

      logger.debug(`Document retrieved successfully`, {
        documentId: request.id,
        documentName: document.name,
        userId
      });

    } catch (error) {
      logger.error('Error in document:get handler:', error);
      callback(createErrorResponse(error instanceof Error ? error.message : 'Failed to get document'));
    }
  });

  /**
   * Search documents
   */
  socket.on('document:search', async (request: DocumentSearchRequest, callback: (response: DocumentSearchResponse) => void) => {
    try {
      logger.debug(`Document search request from ${userId}`, request);

      // Build search criteria from request
      const searchCriteria: FilterQuery<BaseDocument> = {};

      if (request.documentType) searchCriteria.documentType = request.documentType;
      if (request.pluginId) searchCriteria.pluginId = request.pluginId;
      if (request.pluginDocumentType) searchCriteria.pluginDocumentType = request.pluginDocumentType;
      if (request.ownerId) searchCriteria.ownerId = request.ownerId;
      if (request.name) {
        // Use regex for partial name matching
        searchCriteria.name = { $regex: request.name, $options: 'i' };
      }

      const documents = await DocumentService.find(
        searchCriteria,
        {
          limit: request.limit || 50,
          skip: request.offset || 0
        }
      );

      callback(createSuccessResponse(documents));

      logger.debug(`Document search completed`, {
        searchCriteria,
        resultCount: documents.length,
        userId
      });

    } catch (error) {
      logger.error('Error in document:search handler:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search documents',
        data: []
      });
    }
  });

  /**
   * Create a new document
   */
  socket.on('document:create', async (request: DocumentCreateRequest, callback: (response: DocumentCreateResponse) => void) => {
    try {
      logger.debug(`Document create request from ${userId}`, request);

      if (!userId) {
        callback(createErrorResponse('Authentication required'));
        return;
      }

      // Validate required fields
      if (!request.name || !request.documentType || !request.pluginId || !request.pluginDocumentType) {
        callback(createErrorResponse('Missing required fields: name, documentType, pluginId, pluginDocumentType'));
        return;
      }

      // Generate slug from name (simplified version)
      const generateSlug = (name: string): string => {
        return name.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single
          .trim();
      };

      const documentData = {
        name: request.name,
        documentType: request.documentType,
        pluginId: request.pluginId,
        pluginDocumentType: request.pluginDocumentType,
        pluginData: request.pluginData ?? {},
        userData: request.userData ?? {},
        ownerId: userId, // Set current user as owner
        // Add required fields with defaults
        slug: generateSlug(request.name),
        itemState: {},
        state: {
          turnState: undefined,
          sessionState: undefined,
          encounterState: undefined,
          persistentState: undefined
        }
      };

      const document = await DocumentService.create(documentData);

      if (!document) {
        callback(createErrorResponse('Failed to create document'));
        return;
      }

      // Broadcast document creation to other users
      broadcastDocumentChange('created', document);

      callback(createSuccessResponse(document));

      logger.info(`Document created successfully`, {
        documentId: document.id,
        documentName: document.name,
        documentType: document.documentType,
        userId
      });

    } catch (error) {
      logger.error('Error in document:create handler:', error);
      callback(createErrorResponse(error instanceof Error ? error.message : 'Failed to create document'));
    }
  });

  /**
   * Update a document
   */
  socket.on('document:update', async (request: DocumentUpdateRequest, callback: (response: DocumentUpdateResponse) => void) => {
    try {
      logger.debug(`Document update request from ${userId}`, request);

      if (!userId) {
        callback(createErrorResponse('Authentication required'));
        return;
      }

      if (!request.id) {
        callback(createErrorResponse('Document ID is required'));
        return;
      }

      // Get existing document to check permissions
      const existingDocument = await DocumentService.findById(request.id);
      if (!existingDocument) {
        callback(createErrorResponse('Document not found'));
        return;
      }

      // Check if user has permission to edit this document
      // For now, only the owner can edit, but this could be expanded
      if (existingDocument.ownerId !== userId) {
        callback(createErrorResponse('Permission denied'));
        return;
      }

      const updatedDocument = await DocumentService.updateById(request.id, request.data);

      if (!updatedDocument) {
        callback(createErrorResponse('Failed to update document'));
        return;
      }

      // Broadcast document update to other users
      broadcastDocumentChange('updated', updatedDocument);

      callback(createSuccessResponse(updatedDocument));

      logger.info(`Document updated successfully`, {
        documentId: request.id,
        documentName: updatedDocument.name,
        userId
      });

    } catch (error) {
      logger.error('Error in document:update handler:', error);
      callback(createErrorResponse(error instanceof Error ? error.message : 'Failed to update document'));
    }
  });

  /**
   * Delete a document
   */
  socket.on('document:delete', async (request: DocumentDeleteRequest, callback: (response: DocumentDeleteResponse) => void) => {
    try {
      logger.debug(`Document delete request from ${userId}`, request);

      if (!userId) {
        callback(createErrorResponse('Authentication required'));
        return;
      }

      if (!request.id) {
        callback(createErrorResponse('Document ID is required'));
        return;
      }

      // Get existing document to check permissions
      const existingDocument = await DocumentService.findById(request.id);
      if (!existingDocument) {
        callback(createErrorResponse('Document not found'));
        return;
      }

      // Check if user has permission to delete this document
      // For now, only the owner can delete, but this could be expanded
      if (existingDocument.ownerId !== userId) {
        callback(createErrorResponse('Permission denied'));
        return;
      }

      const success = await DocumentService.deleteById(request.id);

      if (!success) {
        callback(createErrorResponse('Failed to delete document'));
        return;
      }

      // Broadcast document deletion to other users
      broadcastDocumentChange('deleted', undefined, request.id);

      callback(createSuccessResponse(null));

      logger.info(`Document deleted successfully`, {
        documentId: request.id,
        documentName: existingDocument.name,
        userId
      });

    } catch (error) {
      logger.error('Error in document:delete handler:', error);
      callback(createErrorResponse(error instanceof Error ? error.message : 'Failed to delete document'));
    }
  });

  logger.debug(`Document socket handler registered for user ${userId}`);
}

// Self-register the handler
socketHandlerRegistry.register(documentSocketHandler);

export { documentSocketHandler };