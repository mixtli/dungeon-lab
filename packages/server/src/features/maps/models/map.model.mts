import mongoose from 'mongoose';
import { IMap, mapSchema } from '@dungeon-lab/shared/index.mjs';
import { zId } from '@zodyac/zod-mongoose';

import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
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
  imageId: zId('Asset').optional()
});

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IMap>(serverMapSchema.merge(baseMongooseZodSchema));

// Add virtual properties for image and thumbnail
mongooseSchema.virtual('image', {
  ref: 'Asset',
  localField: 'imageId',
  foreignField: '_id',
  justOne: true
});

mongooseSchema.virtual('thumbnail', {
  ref: 'Asset',
  localField: 'thumbnailId',
  foreignField: '_id',
  justOne: true
});

// Configure schema to include virtuals when converting to JSON
// mongooseSchema.set('toJSON', { virtuals: true });

// Also set toObject options to make sure virtuals work consistently
// mongooseSchema.set('toObject', { virtuals: true });

/**
 * Map model
 */
export const MapModel = mongoose.model<IMap>('Map', mongooseSchema);
