import { z } from 'zod';
import { campaignSchema } from '../../schemas/campaign.schema.mjs';

// Types for GET /campaigns (Get all campaigns)
export const getCampaignsResponseSchema = z.object({
  success: z.boolean().default(true),
  data: z.array(campaignSchema),
  error: z.string().optional()
});

export type GetCampaignsResponse = z.infer<typeof getCampaignsResponseSchema>;

// Types for GET /campaigns/:id (Get one campaign)
export const getCampaignResponseSchema = z.object({
  success: z.boolean().default(true),
  data: campaignSchema.optional(),
  error: z.string().optional()
});

export type GetCampaignResponse = z.infer<typeof getCampaignResponseSchema>;

// Types for POST /campaigns (Create campaign)
// For create we can use the main schema but omit id
export const createCampaignRequestSchema = campaignSchema.omit({ id: true });

export type CreateCampaignRequest = z.infer<typeof createCampaignRequestSchema>;

export const createCampaignResponseSchema = z.object({
  success: z.boolean().default(true),
  data: campaignSchema.optional(),
  error: z.string().optional()
});

export type CreateCampaignResponse = z.infer<typeof createCampaignResponseSchema>;

// Types for PUT /campaigns/:id (Replace campaign)
export const putCampaignRequestSchema = createCampaignRequestSchema;
export type PutCampaignRequest = z.infer<typeof putCampaignRequestSchema>;

export const putCampaignResponseSchema = z.object({
  success: z.boolean().default(true),
  data: campaignSchema.optional(),
  error: z.string().optional()
});

export type PutCampaignResponse = z.infer<typeof putCampaignResponseSchema>;

// Types for PATCH /campaigns/:id (Update campaign partially)
export const patchCampaignRequestSchema = createCampaignRequestSchema.partial();
export type PatchCampaignRequest = z.infer<typeof patchCampaignRequestSchema>;

export const patchCampaignResponseSchema = putCampaignResponseSchema;
export type PatchCampaignResponse = z.infer<typeof patchCampaignResponseSchema>;

// Types for DELETE /campaigns/:id (Delete campaign)
export const deleteCampaignResponseSchema = z.object({
  success: z.boolean().default(true),
  error: z.string().optional()
});

export type DeleteCampaignResponse = z.infer<typeof deleteCampaignResponseSchema>;

// Types for GET /campaigns/search (Search campaigns)
export const searchCampaignsQuerySchema = z
  .object({
    name: z.string().optional(),
    status: z.string().optional(),
    gameSystemId: z.string().optional()
  })
  .passthrough(); // Allow additional query parameters

export type SearchCampaignsQuery = z.infer<typeof searchCampaignsQuerySchema>;

export const searchCampaignsResponseSchema = getCampaignsResponseSchema;
export type SearchCampaignsResponse = z.infer<typeof searchCampaignsResponseSchema>;
