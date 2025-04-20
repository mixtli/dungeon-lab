import mongoose from 'mongoose';
import { IMap, mapSchema } from '@dungeon-lab/shared/index.mjs';
import { zId } from '@zodyac/zod-mongoose';

import { baseMongooseZodSchema } from '../../../models/base-schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';

/**
 * Map document interface extending the base Map interface
 */
///export interface MapDocument extends Omit<IMap, 'id'>, BaseDocument {}

/**
 * Create a server-specific schema that overrides string IDs with ObjectIds
 */
const serverMapSchema = mapSchema.extend({
  // Convert string IDs to ObjectIds for asset references
  thumbnailId: zId('Asset').optional(),
  imageId: zId('Asset').optional(),
});

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IMap>(serverMapSchema.merge(baseMongooseZodSchema));

/**
 * Map model
 */
export const MapModel = mongoose.model<IMap>('Map', mongooseSchema); 