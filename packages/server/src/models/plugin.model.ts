import mongoose, { Document, Schema } from 'mongoose';
import { Plugin } from '@dungeon-lab/shared';

/**
 * Plugin document interface
 */
export interface PluginDocument extends Omit<Plugin, 'id'>, Document {
  id: string;
}

/**
 * Plugin schema
 */
const pluginSchema = new Schema(
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
    type: {
      type: String,
      enum: ['gameSystem', 'extension'],
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    gameSystemId: {
      type: Schema.Types.ObjectId,
      ref: 'GameSystem',
      required: function(this: PluginDocument) {
        return this.type === 'gameSystem';
      },
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
 * Plugin model
 */
export const PluginModel = mongoose.model<PluginDocument>('Plugin', pluginSchema); 