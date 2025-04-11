import mongoose from 'mongoose';
import { zodSchemaRaw } from '@zodyac/zod-mongoose';
import { z } from 'zod';
import { zId } from '@zodyac/zod-mongoose';

/**
 * Options for creating a base schema
 */
interface BaseSchemaOptions {
  /**
   * Whether to add timestamps (createdAt, updatedAt)
   * @default true
   */
  timestamps?: boolean;

  /**
   * Whether to add virtuals to JSON output
   * @default true
   */
  virtuals?: boolean;

  /**
   * Custom transform function for toJSON
   * Will be called after the default transform
   */
  transform?: (doc: any, ret: any) => any;
}

/**
 * Creates a base mongoose schema with common configuration
 * @param zodSchema The Zod object schema to convert
 * @param options Schema configuration options
 * @returns Configured mongoose schema
 */
export function createBaseSchema(
  zodSchema: z.ZodObject<any, any, any>,
  options: BaseSchemaOptions = {}
): mongoose.Schema {
  const {
    timestamps = true,
    virtuals = true,
    transform,
  } = options;

  const newSchema = zodSchema.extend({
    createdBy: zId('User'),
    updatedBy: zId('User'),
  })

  const schemaDefinition = zodSchemaRaw(newSchema);
  
  return new mongoose.Schema(schemaDefinition, {
    timestamps,
    toObject: {
      virtuals,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        // ret.createdBy = ret.createdBy.toString();
        // ret.updatedBy = ret.createdBy.toString();

        //delete ret._id;
        //delete ret.__v;

        // Apply custom transform if provided
        if (transform) {
          return transform(_doc, ret);
        }

      },
    },
    toJSON: {
      virtuals,
      transform: (_doc, ret) => {
        // Default transform
        ret.id = ret._id.toString();
        // ret.createdBy = ret.createdBy.toString(),
        // ret.updatedBy = ret.createdBy.toString(),
        delete ret._id;
        delete ret.__v;

        // Apply custom transform if provided
        if (transform) {
          return transform(_doc, ret);
        }

        return ret;
      },
    },
  });
}

/**
 * Base document interface that all models should extend
 */
export interface BaseDocument extends mongoose.Document {
  id: string;
  createdAt: Date;
  updatedAt: Date;

} 