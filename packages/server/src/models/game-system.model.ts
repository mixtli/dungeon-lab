import mongoose, { Document, Schema } from 'mongoose';
import { GameSystem, GameSystemActorType, GameSystemItemType } from '@dungeon-lab/shared';

/**
 * Game System Actor Type document interface
 */
export interface GameSystemActorTypeDocument extends Omit<GameSystemActorType, 'id'>, Document {
  id: string;
}

/**
 * Game System Item Type document interface
 */
export interface GameSystemItemTypeDocument extends Omit<GameSystemItemType, 'id'>, Document {
  id: string;
}

/**
 * Game System document interface
 */
export interface GameSystemDocument extends Omit<GameSystem, 'id' | 'actorTypes' | 'itemTypes'>, Document {
  id: string;
  actorTypes: GameSystemActorTypeDocument[];
  itemTypes: GameSystemItemTypeDocument[];
}

/**
 * Game System Actor Type schema
 */
const gameSystemActorTypeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    dataSchema: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    uiComponent: {
      type: String,
      trim: true,
    },
  },
  {
    _id: true,
    id: true,
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
 * Game System Item Type schema
 */
const gameSystemItemTypeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    dataSchema: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    uiComponent: {
      type: String,
      trim: true,
    },
  },
  {
    _id: true,
    id: true,
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
 * Game System schema
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
    actorTypes: [gameSystemActorTypeSchema],
    itemTypes: [gameSystemItemTypeSchema],
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
 * Game System model
 */
export const GameSystemModel = mongoose.model<GameSystemDocument>('GameSystem', gameSystemSchema); 