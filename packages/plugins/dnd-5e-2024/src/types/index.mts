// Export basic types
export { characterDataSchema as characterSchema, type ICharacterData as ICharacter } from './character.mjs';
export { weaponSchema, type IWeapon } from './weapon.mjs';
export { spellSchema, type ISpell } from './spell.mjs'; 
export { type ICharacterClassData as ICharacterClass } from './character-class.mjs';

// Export shared stat block types
export {
  statBlockSchema,
  creatureSizeSchema,
  creatureTypeSchema,
  alignment2024Schema,
  skill2024Schema,
  sensesSchema,
  speedSchema,
  armorClassSchema,
  hitPointsSchema,
  abilitiesSchema,
  savingThrowsSchema,
  actionSchema,
  traitSchema,
  legendaryActionSchema,
  habitatSchema,
  treasureThemeSchema,
  createStatBlockSchema,
  updateStatBlockSchema,
  type IStatBlock,
  type CreatureSize,
  type CreatureType,
  type Alignment2024,
  type Skill2024,
  type Habitat,
  type TreasureTheme,
  type IStatBlockCreateData,
  type IStatBlockUpdateData
} from './stat-block.mjs';

// Export monster types
export {
  monsterSchema,
  monsterSpecificSchema,
  createMonsterSchema,
  updateMonsterSchema,
  type IMonster,
  type IMonsterCreateData,
  type IMonsterUpdateData
} from './monster.mjs';

// Export NPC types
export {
  npcSchema,
  npcSpecificSchema,
  createNPCSchema,
  updateNPCSchema,
  type INPC,
  type INPCCreateData,
  type INPCUpdateData
} from './npc.mjs';

// Export actor types and discriminated union
export {
  actorDataSchema,
  actorTypes,
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

// Export updated common types
export {
  ABILITIES,
  SKILLS_2024,
  LEGACY_SKILLS,
  LANGUAGES_2024,
  ALIGNMENTS_2024,
  CONDITIONS_2024,
  DAMAGE_TYPES_2024,
  abilitySchema,
  skillSchema,
  legacySkillSchema,
  languageSchema,
  alignmentSchema,
  conditionSchema,
  damageTypeSchema,
  spellcastingSchema,
  type Ability,
  type Skill,
  type LegacySkill,
  type Language,
  type Alignment,
  type Condition,
  type DamageType,
  type Spellcasting
} from './common.mjs';