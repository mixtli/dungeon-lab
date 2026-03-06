import { z } from 'zod';
import { baseDocumentSchema, documentSchemaWithVirtuals } from './document.schema.js';
import { encounterSchema } from './encounters.schema.js';
import { campaignSchema, campaignWithVirtualsSchema } from './campaign.schema.js';
import { turnManagerSchema } from './turn-manager.schema.js';

/**
 * Server-side game state schema (without populated assets)
 * This represents the complete game state as stored on the server
 * and synchronized with clients during active game sessions
 */
export const serverGameStateSchema = z.object({
  // GameState document ID for direct reference
  id: z.string(),
  
  // Campaign context (read-only reference for session convenience)
  campaign: campaignSchema.nullable().default(null),
  
  // Game entities (all campaign-associated) - unified documents by ID
  documents: z.record(z.string(), baseDocumentSchema).default({}), // All documents: characters, actors, items, etc.
  
  // Active encounter (fully populated with related data)
  currentEncounter: encounterSchema.nullable().default(null),
  
  // Turn management
  turnManager: turnManagerSchema.nullable().default(null),
  
  // Plugin-specific state
  pluginData: z.record(z.string(), z.unknown()).default({})
});

/**
 * Server-side game state schema with populated assets/virtuals
 * This represents the game state with all assets populated, ready for clients
 * This is what should be stored in the GameState.state field and sent to clients
 */
export const serverGameStateWithVirtualsSchema = z.object({
  // Campaign context with populated assets (read-only reference for session convenience)
  campaign: campaignWithVirtualsSchema.nullable().default(null),
  
  // Game entities with populated assets - unified documents by ID, client-ready data
  documents: z.record(z.string(), documentSchemaWithVirtuals).default({}), // All documents with populated assets
  
  // Active encounter (fully populated with related data including map assets)
  currentEncounter: encounterSchema.nullable().default(null),
  
  // Turn management
  turnManager: turnManagerSchema.nullable().default(null),
  
  // Plugin-specific state
  pluginData: z.record(z.string(), z.unknown()).default({})
});

export type ServerGameState = z.infer<typeof serverGameStateSchema>;
export type ServerGameStateWithVirtuals = z.infer<typeof serverGameStateWithVirtualsSchema>;