import { z } from 'zod';

// Search actors query params
export const searchActorsQuerySchema = z.object({
  type: z.string().optional(),
  name: z.string().optional(),
  gameSystemId: z.string().optional(),
  'data.race': z.string().optional(),
  'data.class': z.string().optional(),
  campaignId: z.string().optional(),
  userCharactersOnly: z.string().optional() // 'true' to get only current user's characters
});

export type SearchActorsQuery = z.infer<typeof searchActorsQuerySchema>;
