import { getAssetUrl } from '@/utils/getAssetUrl.mjs';

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
  const transformAssetUrl = (url: string | undefined | null): string => {
    if (!url) return '';
    return getAssetUrl(url);
  };

  return {
    transformAssetUrl
  };
}