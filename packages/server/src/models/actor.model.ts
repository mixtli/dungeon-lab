import mongoose, { Document, Schema } from 'mongoose';
import { Actor } from '@dungeon-lab/shared';

/**
 * Actor document interface
 */
export interface ActorDocument extends Omit<Actor, 'id'>, Document {
  id: string;
}

/**
 * Actor schema
 */
const actorSchema = new Schema(
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
 * Actor model
 */
export const ActorModel = mongoose.model<ActorDocument>('Actor', actorSchema); 