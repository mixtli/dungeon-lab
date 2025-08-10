/**
 * Document Image Utilities
 * 
 * Shared utilities for handling document image display across all document types.
 * All documents (characters, actors, items, etc.) have the same image field structure.
 */

import { transformAssetUrl } from './asset-utils.mjs';
import type { ICharacter, IActor } from '@dungeon-lab/shared/types/index.mjs';

// Union type for any document that has image fields
type DocumentWithImages = ICharacter | IActor | {
  avatar?: { url: string };
  tokenImage?: { url: string };
};

/**
 * Get the display image URL for any document
 * @param document - Any document with avatar/tokenImage virtual relationships
 * @returns Transformed asset URL or null if no image available
 */
export function getDocumentImageUrl(document: DocumentWithImages): string | null {
  // First try avatar, then tokenImage (via tokenImageId), both properly transformed
  if (document.avatar?.url) {
    return transformAssetUrl(document.avatar.url);
  } else if (document.tokenImage?.url) {
    return transformAssetUrl(document.tokenImage.url);
  }
  return null;
}