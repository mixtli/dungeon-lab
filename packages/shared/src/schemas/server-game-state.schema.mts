import { z } from 'zod';
import { characterSchema } from './character.schema.mjs';
import { actorSchema } from './actor.schema.mjs';
import { itemSchema } from './item.schema.mjs';
import { encounterSchema } from './encounters.schema.mjs';

/**
 * Server-side game state schema
 * This represents the complete game state as stored on the server
 * and synchronized with clients during active game sessions
 */
export const serverGameStateSchema = z.object({
  // Game entities (all campaign-associated) - pure data, no metadata
  characters: z.array(characterSchema).default([]), // Player characters
  actors: z.array(actorSchema).default([]),          // NPCs, monsters, etc.
  items: z.array(itemSchema).default([]),            // All campaign items
  
  // Active encounter (fully populated with related data)
  currentEncounter: encounterSchema.nullable(),
  
  // Plugin-specific state
  pluginData: z.record(z.string(), z.unknown()).default({})
});

export type ServerGameState = z.infer<typeof serverGameStateSchema>;