import { z } from 'zod';
import { characterDataSchema } from './character.mjs';
import { monsterSchema } from './monster.mjs';
import { npcSchema } from './npc.mjs';

// Re-export individual schemas for direct use
export { monsterSchema, npcSchema };

// Export const for each actor type for validation functions
export const actorTypes = {
  character: characterDataSchema,
  monster: monsterSchema,
  npc: npcSchema
};

// Create the discriminated union for ActorData
export const actorDataSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('character'), data: characterDataSchema }),
  z.object({ type: z.literal('monster'), data: monsterSchema }),
  z.object({ type: z.literal('npc'), data: npcSchema })
]);

export type IActorData = z.infer<typeof actorDataSchema>;
