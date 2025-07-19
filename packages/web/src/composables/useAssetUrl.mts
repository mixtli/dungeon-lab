import { getAssetUrl, transformAssetUrl } from '@/utils/asset-utils.mjs';

/**
 * Vue composable for transforming asset URLs
 * Provides reactive asset URL transformation for components
 */
export function useAssetUrl() {
  /**
   * Transform asset URL for current network environment
   * @param url - Original asset URL from database
   * @returns Transformed URL that works on current hostname
   */

  return {
    transformAssetUrl,
    getAssetUrl
  };
}