import { z } from '../utils/zod.mjs';
import mongoose  from 'mongoose';
import { zodSchemaRaw } from '@zodyac/zod-mongoose';
import { ObjectId } from 'mongodb';

/*
 * Creates a base mongoose schema with common configuration
 * @param zodSchema The Zod object schema to convert
 * @param transform A function to transform the document before saving it to the database
 * @returns Configured mongoose schema
 */
export function createMongoSchema<T>(
  schema: z.ZodObject<z.ZodRawShape>,
  transform?: (doc: Record<string, unknown>, ret: Record<string, unknown>) => Record<string, unknown>
): mongoose.Schema {

  const myZodSchema = zodSchemaRaw(schema.omit({id: true}));
  
  const baseMongoSchema= new mongoose.Schema<T>(myZodSchema, {
    timestamps: true,
    toObject: {
      virtuals: true,
      getters: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        if (transform) {
          transform(doc, ret);
        }
        return ret;
      },
    },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        if (transform) {
          transform(doc, ret);
        }
        return ret;
      },
    },
  });
  baseMongoSchema.virtual('id').get(function() {
    return this._id?.toString();
  })
  baseMongoSchema.virtual('id').set(function(v: string) {
    this._id = new ObjectId(v);
  })
  baseMongoSchema.path('createdBy').get(function(value: ObjectId | undefined) {
    return value?.toString();
  })
  baseMongoSchema.path('updatedBy').get(function(value: ObjectId | undefined) {
    return value?.toString();
  })

  return baseMongoSchema;
}
