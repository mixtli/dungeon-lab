import { z } from 'zod';

// ============================================================================
// ITEM SOCKET EVENT SCHEMAS
// ============================================================================

// Standard callback response schema used for all item operations
export const itemCallbackSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional()
});

// ============================================================================
// CLIENT-TO-SERVER EVENT SCHEMAS (with callbacks)
// ============================================================================

// Get list of user's items with filters
export const itemListArgsSchema = z.tuple([
  z.object({
    gameSystemId: z.string()
  }).optional(), // filters object is optional for backward compatibility
  z.function().args(itemCallbackSchema) // callback function is required for data retrieval
]);

// Get single item by ID
export const itemGetArgsSchema = z.tuple([
  z.string(), // itemId
  z.function().args(itemCallbackSchema) // callback function is required for data retrieval
]);

// Create new item
export const itemCreateArgsSchema = z.tuple([
  z.object({
    name: z.string(),
    type: z.string(),
    imageId: z.string().optional(),
    description: z.string().optional(),
    gameSystemId: z.string(),
    pluginId: z.string(),
    weight: z.number().optional(),
    cost: z.number().optional(),
    data: z.any(),
    image: z.instanceof(File).optional()
  }),
  z.function().args(itemCallbackSchema) // callback function is required for error handling
]);

// Update existing item
export const itemUpdateArgsSchema = z.tuple([
  z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    imageId: z.string().optional(),
    description: z.string().optional(),
    gameSystemId: z.string().optional(),
    pluginId: z.string().optional(),
    weight: z.number().optional(),
    cost: z.number().optional(),
    data: z.any().optional(),
    image: z.instanceof(File).optional()
  }),
  z.function().args(itemCallbackSchema) // callback function is required for error handling
]);

// Delete item
export const itemDeleteArgsSchema = z.tuple([
  z.string(), // itemId
  z.function().args(itemCallbackSchema) // callback function is required for error handling
]);

// ============================================================================
// SERVER-TO-CLIENT BROADCAST EVENT SCHEMAS
// ============================================================================

// Item created broadcast
export const itemCreatedSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  imageId: z.string().optional(),
  description: z.string().optional(),
  gameSystemId: z.string(),
  pluginId: z.string(),
  weight: z.number().optional(),
  cost: z.number().optional(),
  data: z.any()
});

// Item updated broadcast
export const itemUpdatedSchema = itemCreatedSchema;

// Item deleted broadcast
export const itemDeletedSchema = z.string(); // Just the item ID