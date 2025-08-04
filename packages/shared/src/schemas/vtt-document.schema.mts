import { vttDocumentSchema as baseVttDocumentSchema } from './document.schema.mjs';
// VTT Document schema - uses vtt document schema (no additional fields needed currently)
export const vttDocumentSchema = baseVttDocumentSchema;

// Note: All fields come from vttDocumentBaseSchema:
// - name, description, slug, pluginId, campaignId, compendiumId, imageId, thumbnailId
// - pluginData (replaces 'data'), userData, itemState

// Create schema is imported from document.schema.mjs as part of discriminated union
// Update schema uses the general updateDocumentSchema from document.schema.mjs
