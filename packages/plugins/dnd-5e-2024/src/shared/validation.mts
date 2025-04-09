import { z } from 'zod';
import { 
  actorTypes, 
  itemTypes,
} from './types/index.mjs';
import { vttDocumentDataTypes } from './types/vttdocument.mjs';

/**
 * Validates actor data for a specific actor type
 * 
 * @param actorType - The type of actor (character, monster, npc)
 * @param data - The data to validate
 * @returns A SafeParseReturn object with the validation result
 */
export function validateActorData(actorType: string, data: unknown): z.SafeParseReturnType<unknown, unknown> {
  const schema = actorTypes[actorType as keyof typeof actorTypes];
  
  if (schema) {
    return schema.safeParse(data);
  } else {
    return { 
      success: false, 
      error: new z.ZodError([{
        code: z.ZodIssueCode.custom,
        path: [],
        message: `Unknown actor type: ${actorType}`
      }])
    };
  }
}

/**
 * Validates item data for a specific item type
 * 
 * @param itemType - The type of item (weapon, spell, armor, tool, gear, consumable)
 * @param data - The data to validate
 * @returns A SafeParseReturn object with the validation result
 */
export function validateItemData(itemType: string, data: unknown): z.SafeParseReturnType<unknown, unknown> {
  const schema = itemTypes[itemType as keyof typeof itemTypes];
  
  if (schema) {
    return schema.safeParse(data);
  } else {
    return { 
      success: false, 
      error: new z.ZodError([{
        code: z.ZodIssueCode.custom,
        path: [],
        message: `Unknown item type: ${itemType}`
      }])
    };
  }
}

/**
 * Validates VTT document data for a specific document type
 * 
 * @param documentType - The type of document (characterClass, background, species, feat)
 * @param data - The data to validate
 * @returns A SafeParseReturn object with the validation result
 */
export function validateVTTDocumentData(documentType: string, data: unknown): z.SafeParseReturnType<unknown, unknown> {
  console.log('validateVTTDocumentData', documentType)
  const schema = vttDocumentDataTypes[documentType as keyof typeof vttDocumentDataTypes];
  
  if (schema) {
    return schema.safeParse(data);
  } else {
    return { 
      success: false, 
      error: new z.ZodError([{
        code: z.ZodIssueCode.custom,
        path: [],
        message: `Unknown document type: ${documentType}`
      }])
    };
  }
} 