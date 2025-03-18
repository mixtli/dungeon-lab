import { z } from 'zod';
import { dnd5e2024GameSystem } from './game-system.mjs';
import { characterSchema } from './types/character.mjs';

export function validateActorData(actorType: string, data: unknown): z.SafeParseReturnType<unknown, unknown> {
  if (actorType === 'character') {
    // Use the simpler schema with defaults for character creation
    return characterSchema.safeParse(data);
  } else {
    throw new Error(`Unknown actor type: ${actorType}`);
  }
}

export function validateItemData(itemType: string, data: unknown): z.SafeParseReturnType<unknown, unknown> {
  const itemTypeDefinition = dnd5e2024GameSystem.itemTypes.find(type => type.name === itemType);
  if (itemTypeDefinition) {
    return itemTypeDefinition.dataSchema.safeParse(data);
  }
  return { success: false, error: new z.ZodError([{
    code: z.ZodIssueCode.custom,
    path: [],
    message: `Unknown item type: ${itemType}`
  }]) };
} 