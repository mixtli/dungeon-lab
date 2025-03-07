import mongoose from 'mongoose';
import { IEncounter, encounterSchema } from '@dungeon-lab/shared/src/schemas/encounter.schema.mjs';
import { BaseDocument, createBaseSchema } from './utils/base-schema.mjs';

/**
 * Encounter document interface extending the base Encounter interface
 */
export interface EncounterDocument extends Omit<IEncounter, 'id' | '_id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createBaseSchema(encounterSchema);

// Override the settings field to use Mixed type
mongooseSchema.path('settings', mongoose.Schema.Types.Mixed);

// Add indexes
mongooseSchema.index({ campaignId: 1 });
mongooseSchema.index({ mapId: 1 });
mongooseSchema.index({ status: 1 });

/**
 * Encounter model
 */
export const Encounter = mongoose.model<EncounterDocument>('Encounter', mongooseSchema); 