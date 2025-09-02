import { z } from 'zod';
export const baseSchema = z.object({
  id: z.string(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});
