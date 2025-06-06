// Export basic types
export { characterDataSchema as characterSchema, type ICharacterData as ICharacter } from './character.mjs';
export { weaponSchema, type IWeapon } from './weapon.mjs';
export { spellSchema, type ISpell } from './spell.mjs'; 
export { type ICharacterClassData as ICharacterClass } from './character-class.mjs';

// Export actor types and discriminated union
export {
  monsterSchema,
  npcSchema,
  actorDataSchema,
  actorTypes,
  type IMonster,
  type INPC,
  type IActorData
} from './actor.mjs';

// Export item types and discriminated union
export {
  armorSchema,
  toolSchema,
  gearSchema,
  consumableSchema,
  itemDataSchema,
  itemTypes,
  type IArmor,
  type ITool,
  type IGear,
  type IConsumable,
  type IItemData
} from './item.mjs';

// Export VTT document types and discriminated union
export {
  backgroundDataSchema as backgroundSchema,
  speciesDocumentSchema as speciesSchema,
  featDocumentSchema as featSchema,
  vttDocumentDataTypes,
  type IBackgroundData as IBackground,
  type ISpeciesData as ISpecies,
  type IFeatData as IFeat,
} from './vttdocument.mjs';