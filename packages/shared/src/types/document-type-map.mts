import type { IActor, ICharacter, IItem, IVTTDocument } from './index.mjs';

/**
 * Maps document type strings to their corresponding TypeScript interfaces
 * Used for generic typing in DocumentsClient methods
 */
export interface DocumentTypeMap {
  'character': ICharacter;
  'actor': IActor;
  'item': IItem;
  'vtt-document': IVTTDocument;
}

/**
 * Union type of all valid document type strings
 */
export type DocumentType = keyof DocumentTypeMap;