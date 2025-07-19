import { AssetsClient } from '@dungeon-lab/client/assets.client.mjs';

const assetsClient = new AssetsClient();

export async function getAssetUrl(assetId: string): Promise<string> {
  const asset = await assetsClient.getAsset(assetId);
  return transformAssetUrl(asset.url);
}

/**
 * Transform asset URLs to work correctly across different network environments
 * 
 * This function addresses a development/deployment issue where asset URLs are stored
 * in the database with localhost:9000 (MinIO), but when accessing the app from a
 * different device on the same network (e.g., iPhone accessing 10.0.0.84:8080),
 * those localhost URLs won't work.
 * 
 * @param url - Original asset URL from database (may contain localhost:9000)
 * @returns Transformed URL using current hostname for network accessibility
 */
export function transformAssetUrl(url: string): string {
  // If the URL is empty or not a string, return as-is
  if (!url || typeof url !== 'string') {
    return url;
  }

  // Only transform localhost MinIO URLs
  if (url.startsWith('http://localhost:9000') || url.startsWith('http://127.0.0.1:9000')) {
    const { hostname } = window.location;
    
    // If we're already on localhost, keep localhost URL
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return url;
    }
    
    // Replace localhost with current hostname for LAN access
    return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):9000/, `http://${hostname}:9000`);
  }

  // Return URL unchanged if it's not a localhost MinIO URL
  return url;
}