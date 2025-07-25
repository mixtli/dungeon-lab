import { z } from 'zod';

// ============================================================================
// ACTOR SOCKET EVENT SCHEMAS
// ============================================================================

// Standard callback response schema used for all actor operations
export const actorCallbackSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional()
});

// ============================================================================
// CLIENT-TO-SERVER EVENT SCHEMAS (with callbacks)
// ============================================================================

// Get list of user's actors with filters
export const actorListArgsSchema = z.tuple([
  z.object({
    pluginId: z.string()
  }).optional(), // filters object is optional for backward compatibility
  z.function().args(actorCallbackSchema) // callback function is required for data retrieval
]);

// Get single actor by ID
export const actorGetArgsSchema = z.tuple([
  z.string(), // actorId
  z.function().args(actorCallbackSchema) // callback function is required for data retrieval
]);


// Update existing actor
export const actorUpdateArgsSchema = z.tuple([
  z.object({
    id: z.string(),
    name: z.string().optional(),
    pluginDocumentType: z.string().optional(),
    userData: z.record(z.any()).optional(),
    description: z.string().optional(),
    pluginId: z.string().optional(),
    pluginData: z.record(z.string(), z.unknown()).optional(),
    token: z.instanceof(File).optional(),
    avatar: z.instanceof(File).optional()
  }),
  z.function().args(actorCallbackSchema) // callback function is required for error handling
]);

// Delete actor
export const actorDeleteArgsSchema = z.tuple([
  z.string(), // actorId
  z.function().args(actorCallbackSchema) // callback function is required for error handling
]);

// ============================================================================
// SERVER-TO-CLIENT BROADCAST EVENT SCHEMAS
// ============================================================================

// Actor created broadcast
export const actorCreatedSchema = z.object({
  id: z.string(),
  name: z.string(),
  documentType: z.literal('actor'),
  pluginDocumentType: z.string(),
  pluginId: z.string(),
  campaignId: z.string(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  userData: z.record(z.any()).optional(),
  pluginData: z.record(z.string(), z.unknown()).optional(),
  avatarId: z.string().optional(),
  defaultTokenImageId: z.string().optional(),
  description: z.string().optional(),
  compendiumId: z.string().optional(),
  imageId: z.string().optional(),
  thumbnailId: z.string().optional(),
  token: z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    name: z.string().optional(),
    path: z.string(),
    url: z.string(),
    size: z.number().optional(),
    metadata: z.record(z.any()).optional(),
    parentId: z.string().optional(),
    parentType: z.string().optional(),
    fieldName: z.string().optional(),
    createdBy: z.string(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional()
  }).optional(),
  avatar: z.object({
    id: z.string().optional(),
    type: z.string().optional(),
    name: z.string().optional(),
    path: z.string(),
    url: z.string(),
    size: z.number().optional(),
    metadata: z.record(z.any()).optional(),
    parentId: z.string().optional(),
    parentType: z.string().optional(),
    fieldName: z.string().optional(),
    createdBy: z.string(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional()
  }).optional()
});

// Actor updated broadcast
export const actorUpdatedSchema = actorCreatedSchema;

// Actor deleted broadcast
export const actorDeletedSchema = z.string(); // Just the actor ID