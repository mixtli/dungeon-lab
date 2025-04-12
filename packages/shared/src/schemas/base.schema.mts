import { z } from 'zod';
export const baseSchema = z.object({
    id: z.string().optional(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
})