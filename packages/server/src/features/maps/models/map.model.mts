import mongoose, { ObjectId } from 'mongoose';
import { mapSchema } from '@dungeon-lab/shared/schemas/index.mjs';
import { zId } from '@zodyac/zod-mongoose';
import { IMap } from '@dungeon-lab/shared/types/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';

/**
 * Create a server-specific schema that overrides string IDs with ObjectIds
 */
const serverMapSchema = mapSchema.extend({
  thumbnailId: zId('Asset').optional(),
  imageId: zId('Asset').optional(),
  ownerId: zId('User').optional()
});

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IMap>(serverMapSchema.merge(baseMongooseZodSchema));
mongooseSchema.set('minimize', false);

// Override mapData to use Mixed type for flexible JSON storage
mongooseSchema.path('mapData', mongoose.Schema.Types.Mixed);

mongooseSchema.path('imageId').get(function (value: ObjectId | undefined) {
  return value?.toString();
});
mongooseSchema.path('thumbnailId').get(function (value: ObjectId | undefined) {
  return value?.toString();
});
mongooseSchema.path('ownerId').get(function (value: ObjectId | undefined) {
  return value?.toString();
});

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

/**
 * Map model
 */
export const MapModel = mongoose.model<IMap>('Map', mongooseSchema);
