import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { DocumentController } from '../document.controller.mjs';
import { DocumentService } from '../../services/document.service.mjs';
import { Types } from 'mongoose';

vi.mock('../../services/document.service.mjs');
vi.mock('../../../../utils/logger.mjs');

describe('DocumentController', () => {
  let documentController: DocumentController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  const mockDocument = {
    _id: '123',
    name: 'Test Document',
    pluginId: 'test-plugin',
    documentType: 'character',
    createdBy: new Types.ObjectId(),
    updatedBy: new Types.ObjectId(),
    data: { hitPoints: { max: 10 } }
  };

  beforeEach(() => {
    documentController = new DocumentController();
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis()
    };
    vi.clearAllMocks();
  });

  describe('getDocument', () => {
    beforeEach(() => {
      mockReq = {
        params: { id: '123' }
      };
    });

    it('should return a document when found', async () => {
      vi.mocked(DocumentService.prototype.getDocumentById).mockResolvedValueOnce(mockDocument);

      await documentController.getDocument(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockDocument);
    });

    it('should return 404 when document not found', async () => {
      vi.mocked(DocumentService.prototype.getDocumentById).mockRejectedValueOnce(new Error('Document not found'));

      await documentController.getDocument(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Document not found' });
    });
  });

  describe('searchDocuments', () => {
    it('should search documents with flat query', async () => {
      mockReq = {
        query: { name: 'test' }
      };

      vi.mocked(DocumentService.prototype.searchDocuments).mockResolvedValueOnce([mockDocument]);

      await documentController.searchDocuments(mockReq as Request, mockRes as Response);

      expect(DocumentService.prototype.searchDocuments).toHaveBeenCalledWith({ name: 'test' });
      expect(mockRes.json).toHaveBeenCalledWith([mockDocument]);
    });

    it('should handle nested query parameters', async () => {
      mockReq = {
        query: { 'data.hitPoints.max': '10' }
      };

      vi.mocked(DocumentService.prototype.searchDocuments).mockResolvedValueOnce([mockDocument]);

      await documentController.searchDocuments(mockReq as Request, mockRes as Response);

      expect(DocumentService.prototype.searchDocuments).toHaveBeenCalledWith({
        data: { hitPoints: { max: '10' } }
      });
      expect(mockRes.json).toHaveBeenCalledWith([mockDocument]);
    });

    it('should return 500 on error', async () => {
      mockReq = {
        query: { name: 'test' }
      };

      vi.mocked(DocumentService.prototype.searchDocuments).mockRejectedValueOnce(new Error('Database error'));

      await documentController.searchDocuments(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to search documents' });
    });
  });
}); 