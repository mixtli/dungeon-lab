import { z } from 'zod';
/**
 * API Response interface
 * This interface defines the structure of an API response
 */
export const baseAPIResponseSchema = z.object({
  success: z.boolean().default(true),
  data: z.any().optional(),
  error: z.string().optional()
});

export type BaseAPIResponseZod = z.infer<typeof baseAPIResponseSchema>;

export type BaseAPIResponse<T> = BaseAPIResponseZod & { data: T | null };

export const deleteAPIResponseSchema = baseAPIResponseSchema.omit({ data: true });
export type DeleteAPIResponse = z.infer<typeof deleteAPIResponseSchema>;
