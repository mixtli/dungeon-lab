import mongoose from 'mongoose';
import { IEncounter, encounterSchema } from '@dungeon-lab/shared/src/schemas/encounter.schema.mjs';
import { BaseDocument, createBaseSchema } from '../../../models/base-schema.mjs';
import { logger } from '../../../utils/logger.mjs';

/**
 * Encounter document interface extending the base Encounter interface
 */
export interface EncounterDocument extends Omit<IEncounter, 'id' | '_id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createBaseSchema(encounterSchema);

// Log the schema paths to debug
logger.debug('Encounter schema paths:', Object.keys(mongooseSchema.paths));

// Add indexes for common queries
mongooseSchema.index({ campaignId: 1 });
mongooseSchema.index({ gameSessionId: 1 });

/**
 * Encounter model
 */
export const EncounterModel = mongoose.model<EncounterDocument>('Encounter', mongooseSchema); 