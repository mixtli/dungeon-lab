/**
 * Document Image Utilities
 * 
 * Shared utilities for handling document image display across all document types.
 * All documents (characters, actors, items, etc.) have the same image field structure.
 */

import { transformAssetUrl } from './asset-utils.mjs';
import type { ICharacter, IActor } from '@dungeon-lab/shared/types/index.mjs';
import { assetSchema } from '@dungeon-lab/shared/schemas/asset.schema.mjs';
import type { z } from 'zod';

// Union type for any document that has image fields
type DocumentWithImages = ICharacter | IActor | {
  avatar?: z.infer<typeof assetSchema> | null;
  tokenImage?: z.infer<typeof assetSchema> | null;
};

/**
 * Get the display image URL for any document
 * @param document - Any document with avatar/tokenImage virtual relationships
 * @returns Transformed asset URL or null if no image available
 */
export function getDocumentImageUrl(document: DocumentWithImages): string | null {
  // For characters, prefer avatar; for other documents, use tokenImage
  if ('documentType' in document && document.documentType === 'character') {
    // This is a character - check for avatar first
    const character = document as ICharacter;
    if (character.avatar?.url) {
      return transformAssetUrl(character.avatar.url);
    }
  }
  
  // For all documents (including characters if no avatar), try tokenImage
  if (document.tokenImage?.url) {
    return transformAssetUrl(document.tokenImage.url);
  }
  
  return null;
}