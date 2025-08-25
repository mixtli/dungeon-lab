export declare function getAssetUrl(assetId: string): Promise<string>;
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
export declare function transformAssetUrl(url: string): string;
//# sourceMappingURL=asset-utils.d.mts.map