/**
 * Generic Document State Management Composable
 * 
 * Provides reactive document state management for admin/standalone editing:
 * - Fetches document by ID
 * - Tracks changes and provides save/reset functionality
 * - Works with any document type (character, actor, etc.)
 * - NO WebSocket integration (use useGameDocumentState for game mode)
 */

import { ref, onMounted, type Ref } from 'vue';
import type { BaseDocument, IItem } from '@dungeon-lab/shared/types/index.mjs';
import type { CreateDocumentData } from '@dungeon-lab/shared/schemas/document.schema.mjs';
import { DocumentsClient } from '@dungeon-lab/client/index.mjs';

export interface DocumentStateOptions {
  /** Whether this is readonly mode */
  readonly?: boolean;
}

/**
 * Strip populated and database-specific fields from a document to create a valid PutDocumentRequest
 * This removes fields that are added by the server/database but shouldn't be included in create/update requests
 */
function stripPopulatedFields(document: BaseDocument): CreateDocumentData {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, createdBy, updatedBy, ...coreFields } = document;
  
  // Remove any additional populated fields that might exist
  delete (coreFields as Record<string, unknown>).avatar;
  delete (coreFields as Record<string, unknown>).tokenImage;
  
  return coreFields as CreateDocumentData;
}

export interface DocumentStateReturn {
  /** Reactive document data */
  document: Ref<BaseDocument | null>;
  /** Reactive document items */
  items: Ref<IItem[]>;
  /** Whether the document is being loaded */
  isLoading: Ref<boolean>;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: Ref<boolean>;
  /** Whether a save operation is in progress */
  isSaving: Ref<boolean>;
  /** Manually save document changes */
  save: () => Promise<void>;
  /** Reset document to original state (cancel changes) */
  reset: () => void;
  /** Load document items from server */
  loadItems: () => Promise<void>;
  /** Mark document as having unsaved changes */
  markAsChanged: () => void;
}

export function useDocumentState(
  documentId: string,
  documentType: 'character' | 'actor',
  options: DocumentStateOptions = {}
): DocumentStateReturn {
  const { readonly = false } = options;

  // Reactive state
  const document = ref<BaseDocument | null>(null);
  const items = ref<IItem[]>([]);
  const originalDocument = ref<BaseDocument | null>(null);
  const isLoading = ref(true);
  const hasUnsavedChanges = ref(false);
  const isSaving = ref(false);

  // API client
  const documentsClient = new DocumentsClient();

  // Initialize document from server
  const initializeDocument = async () => {
    try {
      isLoading.value = true;
      console.log(`[useDocumentState] Fetching ${documentType} document:`, documentId);
      
      const fetchedDocument = await documentsClient.getDocument(documentId) as BaseDocument;
      
      // Use JSON clone to avoid reactivity issues with complex objects
      document.value = JSON.parse(JSON.stringify(fetchedDocument));
      originalDocument.value = JSON.parse(JSON.stringify(fetchedDocument));
      
      console.log(`[useDocumentState] ${documentType} document loaded:`, {
        id: fetchedDocument.id,
        name: fetchedDocument.name,
        documentType: fetchedDocument.documentType
      });
      
      // Load associated items
      await loadItems();
      
    } catch (error) {
      console.error(`[useDocumentState] Failed to fetch ${documentType} document:`, error);
      throw error;
    } finally {
      isLoading.value = false;
    }
  };

  // Manual change tracking - will need to be triggered explicitly
  const markAsChanged = () => {
    hasUnsavedChanges.value = true;
  };

  // Load document items (generic for any document that can carry items)
  const loadItems = async () => {
    if (!document.value) return;
    
    try {
      const documentItems = await documentsClient.searchDocuments({
        documentType: 'item',
        carrierId: document.value.id
      }) as IItem[];
      
      items.value = documentItems;
      console.log(`[useDocumentState] Loaded ${documentType} items:`, documentItems.length);
    } catch (error) {
      console.error(`[useDocumentState] Failed to load ${documentType} items:`, error);
      items.value = [];
    }
  };

  // Manual save function - uses PUT to replace entire document
  const save = async () => {
    if (isSaving.value || readonly || !document.value) {
      return;
    }

    try {
      isSaving.value = true;
      
      console.log(`[useDocumentState] === SAVE START (${documentType}) ===`);
      console.log(`[useDocumentState] BEFORE SAVE - document:`, {
        id: document.value.id,
        name: document.value.name,
        documentType: document.value.documentType,
        fullData: document.value
      });
      
      // Strip populated fields to create valid PutDocumentRequest
      const documentData = stripPopulatedFields(document.value);
      console.log(`[useDocumentState] Sending to server:`, documentData);
      
      // Save document using putDocument (PUT) to replace entire document
      const updatedDocument = await documentsClient.putDocument(
        document.value.id,
        documentData
      ) as BaseDocument;
      
      console.log(`[useDocumentState] Received from server:`, {
        id: updatedDocument.id,
        name: updatedDocument.name,
        documentType: updatedDocument.documentType,
        fullData: updatedDocument
      });
      
      // Update state with server response
      document.value = updatedDocument;
      originalDocument.value = JSON.parse(JSON.stringify(updatedDocument));
      hasUnsavedChanges.value = false;
      
      console.log(`[useDocumentState] AFTER UPDATE - document:`, {
        id: document.value.id,
        name: document.value.name,
        documentType: document.value.documentType,
        reactiveRef: document
      });
      console.log(`[useDocumentState] === SAVE COMPLETE (${documentType}) ===`);
      
    } catch (error) {
      console.error(`[useDocumentState] Failed to save ${documentType}:`, error);
      throw error;
    } finally {
      isSaving.value = false;
    }
  };

  // Reset to original state
  const reset = () => {
    if (!originalDocument.value) return;
    
    document.value = JSON.parse(JSON.stringify(originalDocument.value));
    hasUnsavedChanges.value = false;
    
    console.log(`[useDocumentState] ${documentType} reset to original state`);
  };

  // Initialize on mount
  onMounted(async () => {
    await initializeDocument();
  });

  return {
    document,
    items,
    isLoading,
    hasUnsavedChanges,
    isSaving,
    save,
    reset,
    loadItems,
    markAsChanged
  };
}