import { type UVTTData } from '../schemas/uvtt-import-export.schema.mjs';
import type { DungeonMapData } from '../types/maps.mjs';

/**
 * Convert internal DungeonMapData to UVTT format for export
 *
 * TODO: Re-implement for 3D element-based schema
 */
export function convertMapDataToUVTT(_mapData: DungeonMapData, _imageBase64?: string): UVTTData {
  throw new Error('UVTT export is not yet implemented for the 3D map format');
}

/**
 * Convert UVTT data to DungeonMapData format for import
 *
 * TODO: Re-implement for 3D element-based schema
 */
export function convertUVTTToMapData(_uvttData: UVTTData): DungeonMapData {
  throw new Error('UVTT import is not yet implemented for the 3D map format');
}

/**
 * Helper function to convert a base64 data URL to just the base64 content
 */
export function cleanBase64Image(base64DataUrl: string): string {
  if (base64DataUrl.startsWith('data:')) {
    const commaIndex = base64DataUrl.indexOf(',');
    return commaIndex !== -1 ? base64DataUrl.substring(commaIndex + 1) : base64DataUrl;
  }
  return base64DataUrl;
}
