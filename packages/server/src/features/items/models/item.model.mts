import mongoose from 'mongoose';
import { IItem, itemSchema } from '@dungeon-lab/shared/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base-schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';

/**
 * Item document interface extending the base Item interface
 */
//export interface ItemDocument extends Omit<IItem, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IItem>(itemSchema.merge(baseMongooseZodSchema));

/**
 * Item model
 */
export const ItemModel = mongoose.model<IItem>('Item', mongooseSchema); 