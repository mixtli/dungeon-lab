import { z } from 'zod';
import {
  userSchema,
  userCreateSchema,
  userUpdateSchema,
  UserTheme,
  userPreferencesSchema
} from '../schemas/user.schema.mjs';

import {
  campaignCreateSchema,
  campaignPatchSchema,
  campaignWithVirtualsSchema
} from '../schemas/campaign.schema.mjs';

import {
  actorSchema,
  actorCreateSchema,
  actorPatchSchema,
  actorSchemaWithVirtuals
} from '../schemas/actor.schema.mjs';

import {
  characterSchema,
  characterCreateSchema,
  characterPatchSchema,  
  characterSchemaWithVirtuals
} from '../schemas/character.schema.mjs';

import { assetSchema, assetCreateSchema, assetUpdateSchema } from '../schemas/asset.schema.mjs';

// Token schemas
import { 
  TokenSizeEnum,
  tokenSchema,
  createTokenSchema,
  updateTokenSchema,
  tokenConditionSchema
} from '../schemas/tokens.schema.mjs';

// Encounter schemas
import { 
  encounterSchema, 
  EncounterStatusEnum,
  initiativeEntrySchema,
  initiativeTrackerSchema,
  combatActionSchema,
  actionResultSchema,
  ActionTypeEnum,
  ActionCategoryEnum,
  effectSchema,
  EffectTypeEnum,
  encounterSettingsSchema,
  createEncounterSchema,
  updateEncounterSchema,
  encounterPermissionsSchema,
  validationResultSchema,
  actionValidationSchema,
  movementValidationSchema,
} from '../schemas/encounters.schema.mjs';

import {
  gameSessionCreateSchema,
  gameSessionPatchSchema,
  GameSessionStatus,
  gameSessionWithVirtualsSchema
} from '../schemas/game-session.schema.mjs';

import { inviteSchema, inviteStatusSchema } from '../schemas/invite.schema.mjs';

import { itemSchema, itemCreateSchema } from '../schemas/item.schema.mjs';

import { 
  mapSchema, 
  mapCreateSchema, 
  mapImportUVTTSchema,
  uvttSchema
} from '../schemas/map.schema.mjs';

import {
  vttDocumentSchema,
  vttDocumentCreateSchema,
  vttDocumentUpdateSchema
} from '../schemas/vtt-document.schema.mjs';

import {
  baseDocumentSchema,
  createDocumentSchema,
  updateDocumentSchema,
  documentSchemaWithVirtuals,
  documentTypeSchema
} from '../schemas/document.schema.mjs';

import {
  compendiumSchema,
  compendiumCreateSchema,
  compendiumUpdateSchema,
  compendiumEntrySchema,
  compendiumEntryCreateSchema,
  compendiumEntryUpdateSchema,
  embeddedContentSchema,
  contentFileWrapperSchema
} from '../schemas/compendium.schema.mjs';

import {
  documentReferenceSchema,
  referenceObjectSchema,
  referenceOrObjectIdSchema,
  DocumentReference,
  ReferenceObject,
  ReferenceOrObjectId
} from './reference.mjs';

// General Types
export type QueryValue = string | number | boolean | RegExp | Date | object;

// User Types
export type IUser = z.infer<typeof userSchema>;
export type IUserCreateData = z.infer<typeof userCreateSchema>;
export type IUserUpdateData = z.infer<typeof userUpdateSchema>;
export type IUserPreferences = z.infer<typeof userPreferencesSchema>;
export type UserThemeType = z.infer<typeof UserTheme>;

// Campaign Types
export type ICampaign = z.infer<typeof campaignWithVirtualsSchema>;
export type ICampaignCreateData = z.infer<typeof campaignCreateSchema>;
export type ICampaignPatchData = z.infer<typeof campaignPatchSchema>;

// Actor Types
export type IActor = z.infer<typeof actorSchemaWithVirtuals>;
export type IActorCreateData = z.infer<typeof actorCreateSchema>;
export type IActorBaseData = z.infer<typeof actorSchema>;
export type IActorPatchData = z.infer<typeof actorPatchSchema>;

// Character Types
export type ICharacter = z.infer<typeof characterSchemaWithVirtuals>;
export type ICharacterCreateData = z.infer<typeof characterCreateSchema>;
export type ICharacterBaseData = z.infer<typeof characterSchema>;
export type ICharacterPatchData = z.infer<typeof characterPatchSchema>;

// Asset Types
export type IAsset = z.infer<typeof assetSchema>;
export type IAssetCreateData = z.infer<typeof assetCreateSchema>;
export type IAssetUpdateData = z.infer<typeof assetUpdateSchema>;

// Token Types
export type IToken = z.infer<typeof tokenSchema>;
export type ITokenCreateData = z.infer<typeof createTokenSchema>;
export type ITokenUpdateData = z.infer<typeof updateTokenSchema>;
export type TokenSizeType = z.infer<typeof TokenSizeEnum>;
export type ITokenCondition = z.infer<typeof tokenConditionSchema>;

// Encounter Types
export type IEncounter = z.infer<typeof encounterSchema>;
export type IEncounterCreateData = z.infer<typeof createEncounterSchema>;
export type IEncounterUpdateData = z.infer<typeof updateEncounterSchema>;
export type EncounterStatusType = z.infer<typeof EncounterStatusEnum>;
export type IEncounterSettings = z.infer<typeof encounterSettingsSchema>;
export type IEncounterPermissions = z.infer<typeof encounterPermissionsSchema>;

// Initiative Types
export type IInitiativeEntry = z.infer<typeof initiativeEntrySchema>;
export type IInitiativeTracker = z.infer<typeof initiativeTrackerSchema>;

// Combat Action Types
export type ICombatAction = z.infer<typeof combatActionSchema>;
export type IActionResult = z.infer<typeof actionResultSchema>;
export type ActionTypeType = z.infer<typeof ActionTypeEnum>;
export type ActionCategoryType = z.infer<typeof ActionCategoryEnum>;

// Effect Types
export type IEffect = z.infer<typeof effectSchema>;
export type EffectTypeType = z.infer<typeof EffectTypeEnum>;

// Position Types

// Validation Types
export type IValidationResult = z.infer<typeof validationResultSchema>;
export type IActionValidation = z.infer<typeof actionValidationSchema>;
export type IMovementValidation = z.infer<typeof movementValidationSchema>;

// Game Session Types
export type IGameSession = z.infer<typeof gameSessionWithVirtualsSchema>;
export type ICreateGameSession = z.infer<typeof gameSessionCreateSchema>;
export type GameSessionStatusType = z.infer<typeof GameSessionStatus>;
export type IGameSessionPatchData = z.infer<typeof gameSessionPatchSchema>;

// Invite Types
export type IInvite = z.infer<typeof inviteSchema>;
export type InviteStatusType = z.infer<typeof inviteStatusSchema>;

// Item Types
export type IItem = z.infer<typeof itemSchema>;
export type IItemCreateData = z.infer<typeof itemCreateSchema>;

export const mapUpdateSchema = mapCreateSchema.deepPartial();
// Map Types
export type IMap = z.infer<typeof mapSchema>;
export type IMapCreateData = z.infer<typeof mapCreateSchema>;
export type IMapUpdateData = z.infer<typeof mapUpdateSchema>;
export type IMapImportUVTTData = z.infer<typeof mapImportUVTTSchema>;
export type IUVTT = z.infer<typeof uvttSchema>;

// Document Types (Unified)
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type BaseDocument = z.infer<typeof baseDocumentSchema>;
export type CreateDocumentData = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentData = z.infer<typeof updateDocumentSchema>;
export type DocumentWithVirtuals = z.infer<typeof documentSchemaWithVirtuals>;

// VTT Document Types
export type IVTTDocument = z.infer<typeof vttDocumentSchema>;
export type IVTTDocumentCreateData = z.infer<typeof vttDocumentCreateSchema>;
export type IVTTDocumentUpdateData = z.infer<typeof vttDocumentUpdateSchema>;

// Compendium Types
export type ICompendium = z.infer<typeof compendiumSchema>;
export type ICompendiumCreateData = z.infer<typeof compendiumCreateSchema>;
export type ICompendiumUpdateData = z.infer<typeof compendiumUpdateSchema>;
export type ICompendiumEntry = z.infer<typeof compendiumEntrySchema>;
export type ICompendiumEntryCreateData = z.infer<typeof compendiumEntryCreateSchema>;
export type ICompendiumEntryUpdateData = z.infer<typeof compendiumEntryUpdateSchema>;
export type IEmbeddedContent = z.infer<typeof embeddedContentSchema>;
export type IContentFileWrapper = z.infer<typeof contentFileWrapperSchema>;

// Utility types for extracting specific embedded content types
export type IEmbeddedActorContent = Extract<IEmbeddedContent, { type: 'actor' }>;
export type IEmbeddedItemContent = Extract<IEmbeddedContent, { type: 'item' }>;
export type IEmbeddedVTTDocumentContent = Extract<IEmbeddedContent, { type: 'vtt-document' }>;

// Reference Types
export type { DocumentReference, ReferenceObject, ReferenceOrObjectId };
export { documentReferenceSchema, referenceObjectSchema, referenceOrObjectIdSchema };

// Chatbot Types
export * from './chatbots.mjs';
export * from './chat.mjs';

// Token System Types
export {
  type Token,
  type CreateTokenData,
  type UpdateTokenData,
  type TokenCondition,
  type TokenSize
} from './tokens.mjs';

// Encounter System Types
export * from './encounters.mjs';

// Socket Types
export * from './socket/index.mjs';

// Map Editor types
export * from './mapEditor.mjs';

// New Plugin Architecture
export * from './plugin.mjs';  // Main plugin interface
export * from './plugin-context.mjs';  // Plugin context types
export * from './plugin-contracts.mjs';
export * from './component-registry.mjs';  // @deprecated - will be removed
export * from './mechanics-registry.mjs';  // @deprecated - will be removed

// Game Data Structures (selective exports to avoid conflicts)
export type { 
  BaseGameEntity,
  AbilityScores,
  SkillSystem,
  Skill,
  InventorySystem,
  InventoryItem,
  EncumbranceLevel,
  Item,
  ItemProperty,
  ItemRequirement,
  ItemEffect,
  SpellSystem,
  SpellSlot,
  Spell,
  SpellEffect,
  CombatSystem,
  SavingThrow,
  CombatAction,
  FeatureSystem,
  Feature,
  FeatureEffect,
  CharacterData,
  CharacterClass,
  ClassResource,
  CharacterRace,
  CharacterBackground,
  CharacterBiography,
  CharacterAppearance,
  CampaignData,
  CampaignParticipant,
  CampaignSession,
  CampaignRules,
  CampaignResource
} from './game-data.mjs';