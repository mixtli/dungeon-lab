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
