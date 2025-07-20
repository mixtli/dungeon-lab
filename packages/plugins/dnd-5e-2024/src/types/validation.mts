import { z } from 'zod';

// Import all our schemas
import { characterDataSchema, npcDataSchema } from './actors/index.mjs';
import { 
  weaponDataSchema, 
  equipmentDataSchema, 
  consumableDataSchema, 
  toolDataSchema, 
  lootDataSchema, 
  containerDataSchema 
} from './items/index.mjs';
import {
  spellDataSchema,
  classDataSchema,
  backgroundDataSchema,
  raceDataSchema,
  featDataSchema,
  subclassDataSchema
} from './documents/index.mjs';

/**
 * Type discriminated unions for each content category
 */

// Actor Data Union
export type ActorData = 
  | { type: 'character'; data: z.infer<typeof characterDataSchema> }
  | { type: 'npc'; data: z.infer<typeof npcDataSchema> };

// Item Data Union  
export type ItemData =
  | { type: 'weapon'; data: z.infer<typeof weaponDataSchema> }
  | { type: 'equipment'; data: z.infer<typeof equipmentDataSchema> }
  | { type: 'consumable'; data: z.infer<typeof consumableDataSchema> }
  | { type: 'tool'; data: z.infer<typeof toolDataSchema> }
  | { type: 'loot'; data: z.infer<typeof lootDataSchema> }
  | { type: 'container'; data: z.infer<typeof containerDataSchema> };

// Document Data Union
export type DocumentData =
  | { documentType: 'spell'; data: z.infer<typeof spellDataSchema> }
  | { documentType: 'class'; data: z.infer<typeof classDataSchema> }
  | { documentType: 'background'; data: z.infer<typeof backgroundDataSchema> }
  | { documentType: 'race'; data: z.infer<typeof raceDataSchema> }
  | { documentType: 'feat'; data: z.infer<typeof featDataSchema> }
  | { documentType: 'subclass'; data: z.infer<typeof subclassDataSchema> };

/**
 * Validation result type
 */
export type ValidationResult<T = unknown> = {
  success: true;
  data: T;
} | {
  success: false;
  error: Error;
};

/**
 * Actor validation function
 */
export function validateActorData(type: string, data: unknown): ValidationResult {
  try {
    switch (type) {
      case 'character':
        const characterResult = characterDataSchema.safeParse(data);
        if (characterResult.success) {
          return { success: true, data: characterResult.data };
        } else {
          return { success: false, error: new Error(`Character validation failed: ${characterResult.error.message}`) };
        }
      
      case 'npc':
        const npcResult = npcDataSchema.safeParse(data);
        if (npcResult.success) {
          return { success: true, data: npcResult.data };
        } else {
          return { success: false, error: new Error(`NPC validation failed: ${npcResult.error.message}`) };
        }
      
      default:
        return { success: false, error: new Error(`Unknown actor type: ${type}`) };
    }
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Item validation function
 */
export function validateItemData(type: string, data: unknown): ValidationResult {
  try {
    switch (type) {
      case 'weapon':
        const weaponResult = weaponDataSchema.safeParse(data);
        if (weaponResult.success) {
          return { success: true, data: weaponResult.data };
        } else {
          return { success: false, error: new Error(`Weapon validation failed: ${weaponResult.error.message}`) };
        }
      
      case 'equipment':
        const equipmentResult = equipmentDataSchema.safeParse(data);
        if (equipmentResult.success) {
          return { success: true, data: equipmentResult.data };
        } else {
          return { success: false, error: new Error(`Equipment validation failed: ${equipmentResult.error.message}`) };
        }
      
      case 'consumable':
        const consumableResult = consumableDataSchema.safeParse(data);
        if (consumableResult.success) {
          return { success: true, data: consumableResult.data };
        } else {
          return { success: false, error: new Error(`Consumable validation failed: ${consumableResult.error.message}`) };
        }
      
      case 'tool':
        const toolResult = toolDataSchema.safeParse(data);
        if (toolResult.success) {
          return { success: true, data: toolResult.data };
        } else {
          return { success: false, error: new Error(`Tool validation failed: ${toolResult.error.message}`) };
        }
      
      case 'loot':
        const lootResult = lootDataSchema.safeParse(data);
        if (lootResult.success) {
          return { success: true, data: lootResult.data };
        } else {
          return { success: false, error: new Error(`Loot validation failed: ${lootResult.error.message}`) };
        }
      
      case 'container':
        const containerResult = containerDataSchema.safeParse(data);
        if (containerResult.success) {
          return { success: true, data: containerResult.data };
        } else {
          return { success: false, error: new Error(`Container validation failed: ${containerResult.error.message}`) };
        }
      
      default:
        return { success: false, error: new Error(`Unknown item type: ${type}`) };
    }
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Document validation function
 */
export function validateDocumentData(documentType: string, data: unknown): ValidationResult {
  try {
    switch (documentType) {
      case 'spell':
        const spellResult = spellDataSchema.safeParse(data);
        if (spellResult.success) {
          return { success: true, data: spellResult.data };
        } else {
          return { success: false, error: new Error(`Spell validation failed: ${spellResult.error.message}`) };
        }
      
      case 'class':
        const classResult = classDataSchema.safeParse(data);
        if (classResult.success) {
          return { success: true, data: classResult.data };
        } else {
          return { success: false, error: new Error(`Class validation failed: ${classResult.error.message}`) };
        }
      
      case 'background':
        const backgroundResult = backgroundDataSchema.safeParse(data);
        if (backgroundResult.success) {
          return { success: true, data: backgroundResult.data };
        } else {
          return { success: false, error: new Error(`Background validation failed: ${backgroundResult.error.message}`) };
        }
      
      case 'race':
        const raceResult = raceDataSchema.safeParse(data);
        if (raceResult.success) {
          return { success: true, data: raceResult.data };
        } else {
          return { success: false, error: new Error(`Race validation failed: ${raceResult.error.message}`) };
        }
      
      case 'feat':
        const featResult = featDataSchema.safeParse(data);
        if (featResult.success) {
          return { success: true, data: featResult.data };
        } else {
          return { success: false, error: new Error(`Feat validation failed: ${featResult.error.message}`) };
        }
      
      case 'subclass':
        const subclassResult = subclassDataSchema.safeParse(data);
        if (subclassResult.success) {
          return { success: true, data: subclassResult.data };
        } else {
          return { success: false, error: new Error(`Subclass validation failed: ${subclassResult.error.message}`) };
        }
      
      default:
        return { success: false, error: new Error(`Unknown document type: ${documentType}`) };
    }
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Get schema by type for external use
 */
export function getActorSchema(type: string): z.ZodSchema | null {
  switch (type) {
    case 'character': return characterDataSchema;
    case 'npc': return npcDataSchema;
    default: return null;
  }
}

export function getItemSchema(type: string): z.ZodSchema | null {
  switch (type) {
    case 'weapon': return weaponDataSchema;
    case 'equipment': return equipmentDataSchema;
    case 'consumable': return consumableDataSchema;
    case 'tool': return toolDataSchema;
    case 'loot': return lootDataSchema;
    case 'container': return containerDataSchema;
    default: return null;
  }
}

export function getDocumentSchema(documentType: string): z.ZodSchema | null {
  switch (documentType) {
    case 'spell': return spellDataSchema;
    case 'class': return classDataSchema;
    case 'background': return backgroundDataSchema;
    case 'race': return raceDataSchema;
    case 'feat': return featDataSchema;
    case 'subclass': return subclassDataSchema;
    default: return null;
  }
}