import { z } from 'zod';

// Types for GET /campaigns/search (Search campaigns)
export const searchCampaignsQuerySchema = z
  .object({
    name: z.string().optional(),
    status: z.string().optional(),
    pluginId: z.string().optional()
  })
  .passthrough(); // Allow additional query parameters

export type SearchCampaignsQuery = z.infer<typeof searchCampaignsQuerySchema>;
