/**
 * Common fields added by the API for all MongoDB resources
 * These fields are not defined in the Zod schemas but are present
 * in the API responses after transformation from MongoDB documents.
 * 
 * Note: The id field is optional because new records don't have an id yet.
 * Timestamp fields are handled by the server and aren't needed in the client.
 */
export interface ApiFields {
  id?: string;
} 