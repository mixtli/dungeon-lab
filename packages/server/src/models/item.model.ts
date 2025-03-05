import mongoose from 'mongoose';
import { zodSchemaRaw } from '@zodyac/zod-mongoose';
import { Item, itemSchema } from '@dungeon-lab/shared';

/**
 * Item document interface extending the base Item interface
 */
export interface ItemDocument extends Omit<Item, 'id'>, mongoose.Document {
  id: string;
}

/**
 * Convert Zod schema to raw Mongoose schema definition
 */
const schemaDefinition = zodSchemaRaw(itemSchema);

/**
 * Create Mongoose schema with the raw definition
 */
const mongooseSchema = new mongoose.Schema(schemaDefinition, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
});

/**
 * Item model
 */
export const ItemModel = mongoose.model<ItemDocument>('Item', mongooseSchema); 