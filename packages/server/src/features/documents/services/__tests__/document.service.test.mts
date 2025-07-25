import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentService } from '../document.service.mjs';
import { VTTDocumentModel } from '../../models/vtt-document.model.mjs';
import { Types } from 'mongoose';

vi.mock('../../models/vtt-document.model.mjs');
vi.mock('../../../../utils/logger.mjs');

describe('DocumentService', () => {
  let documentService: DocumentService;
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
    documentService = new DocumentService();
    vi.clearAllMocks();
  });

  describe('getDocumentById', () => {
    it('should return a document when found', async () => {
      vi.mocked(VTTDocumentModel.findById).mockResolvedValueOnce(mockDocument);

      const result = await documentService.getDocumentById('123');
      expect(result).toEqual(mockDocument);
      expect(VTTDocumentModel.findById).toHaveBeenCalledWith('123');
    });

    it('should throw error when document not found', async () => {
      vi.mocked(VTTDocumentModel.findById).mockResolvedValueOnce(null);

      await expect(documentService.getDocumentById('123')).rejects.toThrow('Document not found');
    });
  });

  describe('searchDocuments', () => {
    it('should search documents with case-insensitive string values', async () => {
      const query = { name: 'test', 'data.hitPoints.max': '10' };
      const expectedMongoQuery = {
        name: /test/i,
        'data.hitPoints.max': '10'
      };

      vi.mocked(VTTDocumentModel.find).mockResolvedValueOnce([mockDocument]);

      const result = await documentService.searchDocuments(query);
      expect(result).toEqual([mockDocument]);
      expect(VTTDocumentModel.find).toHaveBeenCalledWith(expectedMongoQuery);
    });

    it('should handle non-string query values', async () => {
      const query = { 'data.hitPoints.max': 10 };
      
      vi.mocked(VTTDocumentModel.find).mockResolvedValueOnce([mockDocument]);

      const result = await documentService.searchDocuments(query);
      expect(result).toEqual([mockDocument]);
      expect(VTTDocumentModel.find).toHaveBeenCalledWith(query);
    });
  });
}); 