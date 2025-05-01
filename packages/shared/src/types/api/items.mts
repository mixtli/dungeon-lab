import { z } from 'zod';
import { itemSchema, itemCreateSchema } from '../../schemas/item.schema.mjs';
import { baseAPIResponseSchema } from './base.mjs';

// Types for GET /items (Get all items)
export const getItemsResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(itemSchema)
});

export type GetItemsResponse = z.infer<typeof getItemsResponseSchema>;

// Types for GET /items/:id (Get one item)
export const getItemResponseSchema = baseAPIResponseSchema.extend({
  data: itemSchema.optional()
});

export type GetItemResponse = z.infer<typeof getItemResponseSchema>;

// Types for POST /items (Create item)
export type CreateItemRequest = z.infer<typeof itemCreateSchema>;

export const createItemResponseSchema = baseAPIResponseSchema.extend({
  data: itemSchema.optional()
});

export type CreateItemResponse = z.infer<typeof createItemResponseSchema>;

// Types for PUT /items/:id (Replace item)
export const putItemRequestSchema = itemCreateSchema;
export type PutItemRequest = z.infer<typeof putItemRequestSchema>;

export const putItemResponseSchema = baseAPIResponseSchema.extend({
  data: itemSchema.optional()
});

export type PutItemResponse = z.infer<typeof putItemResponseSchema>;

// Types for PATCH /items/:id (Update item partially)
export const patchItemRequestSchema = itemCreateSchema.deepPartial();
export type PatchItemRequest = z.infer<typeof patchItemRequestSchema>;

export const patchItemResponseSchema = putItemResponseSchema;
export type PatchItemResponse = z.infer<typeof patchItemResponseSchema>;

// Types for DELETE /items/:id (Delete item)
export const deleteItemResponseSchema = z.object({
  success: z.boolean().default(true),
  error: z.string().optional()
});

export type DeleteItemResponse = z.infer<typeof deleteItemResponseSchema>;

// Types for PUT /items/:id/image (Upload item image)
export const uploadItemImageResponseSchema = baseAPIResponseSchema.extend({
  data: itemSchema.optional()
});

export type UploadItemImageResponse = z.infer<typeof uploadItemImageResponseSchema>;

// Types for GET /items/search (Search items)
export const searchItemsQuerySchema = z
  .object({
    name: z.string().optional(),
    type: z.string().optional(),
    pluginId: z.string().optional(),
    gameSystemId: z.string().optional()
  })
  .passthrough(); // Allow additional query parameters

export type SearchItemsQuery = z.infer<typeof searchItemsQuerySchema>;

export const searchItemsResponseSchema = getItemsResponseSchema;
export type SearchItemsResponse = z.infer<typeof searchItemsResponseSchema>;

// Types for GET /campaigns/:campaignId/items
export const getCampaignItemsResponseSchema = getItemsResponseSchema;
export type GetCampaignItemsResponse = z.infer<typeof getCampaignItemsResponseSchema>;

// Types for GET /actors/:actorId/items
export const getActorItemsResponseSchema = getItemsResponseSchema;
export type GetActorItemsResponse = z.infer<typeof getActorItemsResponseSchema>;
