import mongoose from 'mongoose';
import { IItem, itemSchema } from '@dungeon-lab/shared/index.mjs';
import { zId } from '@zodyac/zod-mongoose';
import { baseMongooseZodSchema } from '../../../models/base-schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';

/**
 * Item document interface extending the base Item interface
 */
//export interface ItemDocument extends Omit<IItem, 'id'>, BaseDocument {}

/**
 * Create a server-specific schema that overrides string IDs with ObjectIds
 */
const serverItemSchema = itemSchema.extend({
  // Convert string IDs to ObjectIds for asset references
  imageId: zId('Asset').optional()
});

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IItem>(serverItemSchema.merge(baseMongooseZodSchema));

// Add virtual property for image
mongooseSchema.virtual('image', {
  ref: 'Asset',
  localField: 'imageId',
  foreignField: '_id',
  justOne: true
});

/**
 * Item model
 */
export const ItemModel = mongoose.model<IItem>('Item', mongooseSchema);
