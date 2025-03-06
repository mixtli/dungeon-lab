import mongoose from 'mongoose';
import { IMap, mapSchema } from '@dungeon-lab/shared';
import { BaseDocument, createBaseSchema } from './utils/base-schema.js';

/**
 * Map document interface extending the base Map interface
 */
export interface MapDocument extends Omit<IMap, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createBaseSchema(mapSchema);

/**
 * Map model
 */
export const MapModel = mongoose.model<MapDocument>('Map', mongooseSchema); 