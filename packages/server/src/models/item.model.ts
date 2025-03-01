import mongoose, { Document, Schema } from 'mongoose';
import { Item } from '@dungeon-lab/shared';

/**
 * Item document interface
 */
export interface ItemDocument extends Omit<Item, 'id'>, Document {
  id: string;
}

/**
 * Item schema
 */
const itemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    img: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    gameSystemId: {
      type: Schema.Types.ObjectId,
      ref: 'GameSystem',
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
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
  }
);

/**
 * Item model
 */
export const ItemModel = mongoose.model<ItemDocument>('Item', itemSchema); 