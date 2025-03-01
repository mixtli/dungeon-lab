import mongoose, { Document, Schema } from 'mongoose';
import { GameSystem } from '@dungeon-lab/shared';

/**
 * GameSystem document interface
 */
export interface GameSystemDocument extends Omit<GameSystem, 'id'>, Document {
  id: string;
}

/**
 * GameSystem schema
 */
const gameSystemSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    version: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    author: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    actorTypes: [{
      type: String,
      trim: true,
    }],
    itemTypes: [{
      type: String,
      trim: true,
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * GameSystem model
 */
export const GameSystemModel = mongoose.model<GameSystemDocument>('GameSystem', gameSystemSchema); 