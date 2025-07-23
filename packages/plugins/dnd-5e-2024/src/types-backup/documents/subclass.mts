import { z } from 'zod';
import { sourceSchema, descriptionSchema } from '../common/index.mjs';

/**
 * D&D 5e Subclass data schema
 * Based on Foundry VTT subclass structure
 */
export const subclassDataSchema = z.object({
  // Basic subclass info
  identifier: z.string(), // unique subclass identifier
  classIdentifier: z.string(), // parent class identifier
  description: descriptionSchema,
  source: sourceSchema,
  
  // Subclass advancement
  advancement: z.array(z.record(z.unknown())).default([]),
  
  // Spellcasting (if subclass grants it)
  spellcasting: z.object({
    progression: z.enum(['none', 'full', 'half', 'third', 'pact', 'artificer']).default('none'),
    ability: z.union([
      z.enum(['int', 'wis', 'cha']), // Valid spellcasting abilities
      z.literal('') // Allow empty string for non-spellcasting subclasses
    ]).optional(),
    ritual: z.boolean().default(false),
    focus: z.boolean().default(false)
  }).optional(),
  
  // Subclass features by level
  features: z.array(z.object({
    level: z.number().min(1).max(20),
    name: z.string(),
    description: z.string(),
    optional: z.boolean().default(false)
  })).default([])
});

/**
 * Subclass identifiers by class
 */
export const subclassIdentifiers = {
  barbarian: ['berserker', 'totem-warrior', 'ancestral-guardian', 'storm-herald', 'zealot', 'wild-magic'],
  bard: ['lore', 'valor', 'glamour', 'swords', 'whispers', 'eloquence', 'creation', 'spirits'],
  cleric: ['knowledge', 'life', 'light', 'nature', 'tempest', 'trickery', 'war', 'death', 'forge', 'grave', 'order', 'peace', 'twilight'],
  druid: ['land', 'moon', 'dreams', 'shepherd', 'spores', 'stars', 'wildfire'],
  fighter: ['champion', 'battle-master', 'eldritch-knight', 'arcane-archer', 'cavalier', 'samurai', 'echo-knight', 'psi-warrior', 'rune-knight'],
  monk: ['open-hand', 'shadow', 'four-elements', 'kensei', 'sun-soul', 'drunken-master', 'long-death', 'mercy', 'astral-self', 'ascendant-dragon'],
  paladin: ['devotion', 'ancients', 'vengeance', 'crown', 'redemption', 'glory', 'watchers', 'conquest', 'oathbreaker'],
  ranger: ['hunter', 'beast-master', 'gloom-stalker', 'horizon-walker', 'monster-slayer', 'fey-wanderer', 'swarmkeeper', 'drakewarden'],
  rogue: ['thief', 'assassin', 'arcane-trickster', 'mastermind', 'swashbuckler', 'inquisitive', 'scout', 'phantom', 'soulknife'],
  sorcerer: ['draconic', 'wild-magic', 'divine-soul', 'shadow', 'storm', 'aberrant-mind', 'clockwork-soul'],
  warlock: ['archfey', 'fiend', 'great-old-one', 'celestial', 'hexblade', 'fathomless', 'genie', 'undead', 'undying'],
  wizard: ['abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation', 'bladesinger', 'order-of-scribes']
} as const;

/**
 * Subclass feature levels (when features are typically gained)
 */
export const subclassFeatureLevels = {
  primary: [3, 6, 10, 14], // Most subclasses
  half_caster: [3, 7, 15, 20], // Paladin, Ranger
  third_caster: [3, 6, 10, 14, 18], // Eldritch Knight, Arcane Trickster
  warlock: [1, 6, 10, 14] // Warlock patrons
} as const;

export type SubclassData = z.infer<typeof subclassDataSchema>;
export type SubclassIdentifiers = typeof subclassIdentifiers;