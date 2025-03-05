import mongoose from 'mongoose';
import { zodSchemaRaw } from '@zodyac/zod-mongoose';
import { Actor, actorSchema } from '@dungeon-lab/shared';

/**
 * Actor document interface extending the base Actor interface
 */
export interface ActorDocument extends Omit<Actor, 'id'>, mongoose.Document {
  id: string;
}

/**
 * Convert Zod schema to raw Mongoose schema definition
 */
const schemaDefinition = zodSchemaRaw(actorSchema);

/**
 * Create Mongoose schema with the raw definition
 */
const mongooseSchema = new mongoose.Schema(schemaDefinition, {
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
});

/**
 * Actor model
 */
export const ActorModel = mongoose.model<ActorDocument>('Actor', mongooseSchema); 