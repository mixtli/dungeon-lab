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

import { assetSchema, assetCreateSchema, assetUpdateSchema } from '../schemas/asset.schema.mjs';

// Token schemas
import { 
  TokenSizeEnum,
  tokenSchema,
  createTokenSchema,
  updateTokenSchema,
  tokenStatsSchema,
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

// Asset Types
export type IAsset = z.infer<typeof assetSchema>;
export type IAssetCreateData = z.infer<typeof assetCreateSchema>;
export type IAssetUpdateData = z.infer<typeof assetUpdateSchema>;

// Token Types
export type IToken = z.infer<typeof tokenSchema>;
export type ITokenCreateData = z.infer<typeof createTokenSchema>;
export type ITokenUpdateData = z.infer<typeof updateTokenSchema>;
export type TokenSizeType = z.infer<typeof TokenSizeEnum>;
export type ITokenStats = z.infer<typeof tokenStatsSchema>;
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

// VTT Document Types
export type IVTTDocument = z.infer<typeof vttDocumentSchema>;
export type IVTTDocumentCreateData = z.infer<typeof vttDocumentCreateSchema>;
export type IVTTDocumentUpdateData = z.infer<typeof vttDocumentUpdateSchema>;

// Chatbot Types
export * from './chatbots.mjs';
export * from './chat.mjs';

// Token System Types
export * from './tokens.mjs';

// Encounter System Types
export * from './encounters.mjs';

// Socket Types
export * from './socket/index.mjs';
