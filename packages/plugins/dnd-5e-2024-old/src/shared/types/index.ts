// Export basic types
export { characterDataSchema as characterSchema, type ICharacterData as ICharacter } from './character.js';
export { weaponSchema, type IWeapon } from './weapon.js';
export { spellSchema, type ISpell } from './spell.js'; 
export { type ICharacterClassData as ICharacterClass } from './character-class.js';

// Export actor types and discriminated union
export {
  monsterSchema,
  npcSchema,
  actorDataSchema,
  actorTypes,
  type IMonster,
  type INPC,
  type IActorData
} from './actor.js';

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
} from './item.js';

// Export VTT document types and discriminated union
export {
  backgroundDataSchema as backgroundSchema,
  speciesDocumentSchema as speciesSchema,
  featDocumentSchema as featSchema,
  vttDocumentDataTypes,
  type IBackgroundData as IBackground,
  type ISpeciesData as ISpecies,
  type IFeatData as IFeat,
} from './vttdocument.js';