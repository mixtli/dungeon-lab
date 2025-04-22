import mongoose, { ObjectId } from 'mongoose';
import { IActor, actorSchema } from '@dungeon-lab/shared/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base-schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';

const actorSchemaMongoose = actorSchema.merge(baseMongooseZodSchema).extend({
  avatarId: zId('Asset').optional(),
  tokenId: zId('Asset').optional()
});

/**
 * Actor document interface extending the base Actor interface
 */
// export interface ActorDocument extends Omit<IActor, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IActor>(actorSchemaMongoose);

mongooseSchema.path('tokenId').get(function (value: ObjectId | undefined) {
  return value?.toString();
});
mongooseSchema.path('avatarId').get(function (value: ObjectId | undefined) {
  return value?.toString();
});

// Override the data field to use Mixed type
mongooseSchema.path('data', mongoose.Schema.Types.Mixed);

// Add virtual properties for avatar and token
mongooseSchema.virtual('avatar', {
  ref: 'Asset',
  localField: 'avatarId',
  foreignField: '_id',
  justOne: true
});

mongooseSchema.virtual('token', {
  ref: 'Asset',
  localField: 'tokenId',
  foreignField: '_id',
  justOne: true
});

/**
 * Actor model
 */
export const ActorModel = mongoose.model<IActor>('Actor', mongooseSchema);
