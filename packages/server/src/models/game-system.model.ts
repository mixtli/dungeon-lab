import mongoose from 'mongoose';
import { zodSchemaRaw } from '@zodyac/zod-mongoose';
import { GameSystem, gameSystemSchema } from '@dungeon-lab/shared';

/**
 * GameSystem document interface extending the base GameSystem interface
 */
export interface GameSystemDocument extends Omit<GameSystem, 'id'>, mongoose.Document {
  id: string;
}

/**
 * Convert Zod schema to raw Mongoose schema definition
 */
const schemaDefinition = zodSchemaRaw(gameSystemSchema);

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
 * GameSystem model
 */
export const GameSystemModel = mongoose.model<GameSystemDocument>('GameSystem', mongooseSchema); 