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
    gameSystemId: z.string()
  }).optional() // filters object is optional for backward compatibility
]);

// Get single actor by ID
export const actorGetArgsSchema = z.tuple([
  z.string() // actorId
]);

// Create new actor
export const actorCreateArgsSchema = z.tuple([
  z.object({
    name: z.string(),
    type: z.string(),
    gameSystemId: z.string(),
    userData: z.record(z.any()).optional(),
    description: z.string().optional(),
    data: z.record(z.string(), z.any()).optional(),
    token: z.instanceof(File).optional(),
    avatar: z.instanceof(File).optional()
  })
]);

// Update existing actor
export const actorUpdateArgsSchema = z.tuple([
  z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    userData: z.record(z.any()).optional(),
    description: z.string().optional(),
    gameSystemId: z.string().optional(),
    data: z.record(z.string(), z.any()).optional(),
    token: z.instanceof(File).optional(),
    avatar: z.instanceof(File).optional()
  })
]);

// Delete actor
export const actorDeleteArgsSchema = z.tuple([
  z.string() // actorId
]);

// ============================================================================
// SERVER-TO-CLIENT BROADCAST EVENT SCHEMAS
// ============================================================================

// Actor created broadcast
export const actorCreatedSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  gameSystemId: z.string(),
  createdBy: z.string(),
  updatedBy: z.string().optional(),
  userData: z.record(z.any()).optional(),
  avatarId: z.string().optional(),
  defaultTokenImageId: z.string().optional(),
  description: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
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
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Actor updated broadcast
export const actorUpdatedSchema = actorCreatedSchema;

// Actor deleted broadcast
export const actorDeletedSchema = z.string(); // Just the actor ID