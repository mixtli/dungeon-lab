// Export basic types
export { characterSchema, type ICharacter } from './character.mjs';
export { weaponSchema, type IWeapon } from './weapon.mjs';
export { spellSchema, type ISpell } from './spell.mjs'; 
export { characterClassSchema, type ICharacterClass } from './character-class.mjs';

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
  backgroundSchema,
  speciesSchema,
  featSchema,
  vttDocumentDataSchema,
  vttDocumentTypes,
  type IBackground,
  type ISpecies,
  type IFeat,
  type IVTTDocumentData
} from './vttdocument.mjs';