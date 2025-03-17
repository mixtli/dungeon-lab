import mongoose from 'mongoose';
import { IItem, itemSchema } from '@dungeon-lab/shared/index.mjs';
import { BaseDocument, createBaseSchema } from '../../../models/base-schema.mjs';

/**
 * Item document interface extending the base Item interface
 */
export interface ItemDocument extends Omit<IItem, 'id'>, BaseDocument {}

/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createBaseSchema(itemSchema);

/**
 * Item model
 */
export const ItemModel = mongoose.model<ItemDocument>('Item', mongooseSchema); 