// Actor schemas
export {
  actorSchema,
  actorCreateSchema,
  actorPatchSchema,
  actorSchemaWithVirtuals
} from './actor.schema.js';

// Character schemas
export {
  characterSchema,
  characterCreateSchema,
  characterPatchSchema,
  characterSchemaWithVirtuals
} from './character.schema.js';

// Asset schemas
export {
  assetSchema,
  assetCreateSchema,
  assetUpdateSchema,
  assetHelpers
} from './asset.schema.js';

// Base schemas
export * from './base.schema.js';

// Document schemas
export {
  documentTypeSchema,
  baseDocumentSchema,
  createDocumentSchema,
  updateDocumentSchema,
  documentSchemaWithVirtuals
} from './document.schema.js';

// Campaign schemas
export {
  campaignSchema,
  campaignCreateSchema,
  campaignPatchSchema,
  campaignWithVirtualsSchema,
  campaignStatusSchema
} from './campaign.schema.js';

// Chatbots schemas
export * from './chatbots.schema.js';

// Compendium schemas
export {
  compendiumSchema,
  compendiumCreateSchema,
  compendiumUpdateSchema,
  compendiumEntrySchema,
  compendiumEntryCreateSchema,
  compendiumEntryUpdateSchema,
  compendiumStatusSchema,
  importSourceSchema,
  embeddedContentTypeSchema,
  embeddedContentSchema,
  contentFileWrapperSchema
} from './compendium.schema.js';

// Encounter schemas
export {
  encounterSchema,
  encounterSettingsSchema,
  createEncounterSchema,
  updateEncounterSchema,
  encounterEventSchema,
  encounterPermissionsSchema,
  validationResultSchema,
  actionValidationSchema,
  movementValidationSchema
} from './encounters.schema.js';

// Game session schemas
export {
  GameSessionStatus,
  gameSessionSchema,
  gameSessionCreateSchema,
  gameSessionPatchSchema,
  gameSessionWithVirtualsSchema,
  gameSessionResponseSchema
} from './game-session.schema.js';

// Invite schemas
export {
  inviteSchema,
  inviteStatusSchema
} from './invite.schema.js';

// Item schemas
export {
  itemSchema,
  itemCreateSchema,
  itemPatchSchema,
  itemSchemaWithVirtuals
} from './item.schema.js';

// Map schemas
export {
  coordinateSchema,
  mapSchema,
  mapSchemaWithVirtuals,
  mapCreateSchema,
  internalMapDataSchema
} from './map.schema.js';

// UVTT import/export schemas
export {
  uvttSchema,
  uvttPortalSchema,
  uvttLightSchema,
  mapImportUVTTSchema,
  uvttExportRequestSchema,
  type UVTTData
} from './uvtt-import-export.schema.js';

// Position schemas
export {
  positionSchema,
  gridPositionSchema,
  movementConstraintsSchema
} from './position.schema.js';

// Token schemas
export {
  tokenSchema,
  createTokenSchema,
  tokenConditionSchema,
  gridBoundsSchema
} from './tokens.schema.js';

// Turn Manager schemas
export {
  turnParticipantSchema,
  turnManagerSchema
} from './turn-manager.schema.js';

// User schemas
export {
  userSchema,
  userCreateSchema,
  userUpdateSchema,
  userPreferencesSchema,
  UserTheme
} from './user.schema.js';

// VTT Document schemas
export {
  vttDocumentSchema
} from './vtt-document.schema.js';

// VTT Document create/update schemas are part of the general discriminated union
export {
  createDocumentSchema as vttDocumentCreateSchema,
  updateDocumentSchema as vttDocumentUpdateSchema
} from './document.schema.js';

// Socket schemas
export * from './socket/index.js';

// Game system schemas
export * from './game-system-schemas.js';

// Plugin manifest schema
export {
  pluginManifestSchema,
  validatePluginManifest,
  safeValidatePluginManifest
} from './plugin-manifest.schema.js'; 