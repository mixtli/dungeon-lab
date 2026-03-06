import { z } from 'zod';

/**
 * Base socket callback response schema
 * All socket callbacks should extend this pattern for consistency
 */
export const baseSocketCallbackSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional()
});

/**
 * Socket callback with typed data
 * Use this when the callback needs to return specific data on success
 */
export const socketCallbackWithDataSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  baseSocketCallbackSchema.extend({
    data: dataSchema.optional()
  });

/**
 * Socket callback with direct success fields
 * Use this when success data should be at the top level (not nested in 'data')
 */
export const socketCallbackWithFieldsSchema = <T extends z.ZodRawShape>(successFields: T) =>
  baseSocketCallbackSchema.extend(successFields);

// Export types for use in TypeScript
export type BaseSocketCallback = z.infer<typeof baseSocketCallbackSchema>;
export type SocketCallbackWithData<T> = T extends z.ZodTypeAny 
  ? z.infer<ReturnType<typeof socketCallbackWithDataSchema<T>>>
  : never;
export type SocketCallbackWithFields<T> = T extends z.ZodRawShape
  ? z.infer<ReturnType<typeof socketCallbackWithFieldsSchema<T>>>
  : never;