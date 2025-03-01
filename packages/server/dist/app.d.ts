/**
 * Creates and configures an Express application.
 *
 * This function extracts the Express app creation logic from index.ts,
 * allowing it to be used in both the main application and tests.
 */
export declare function createApp(): Promise<import("express-serve-static-core").Express>;
