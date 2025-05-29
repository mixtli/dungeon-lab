import mongoose from 'mongoose';
import { encounterSchema } from '@dungeon-lab/shared/schemas/encounters.schema.mjs';
import { IEncounter } from '@dungeon-lab/shared/types/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { logger } from '../../../utils/logger.mjs';

/**
 * Encounter document interface extending the base Encounter interface
 */
//export interface EncounterDocument extends Omit<IEncounter, 'id' | '_id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IEncounter>(encounterSchema.merge(baseMongooseZodSchema));

// Log the schema paths to debug
logger.debug('Encounter schema paths:', Object.keys(mongooseSchema.paths));

// Add indexes for common queries
mongooseSchema.index({ campaignId: 1 });
mongooseSchema.index({ gameSessionId: 1 });

/**
 * Encounter model
 */
export const EncounterModel = mongoose.model<IEncounter>('Encounter', mongooseSchema);
