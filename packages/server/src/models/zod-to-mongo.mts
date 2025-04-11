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
export function createMongoSchema(
  schema: z.ZodObject<any, any, any>,
  transform?: (doc: any, ret: any) => any
): mongoose.Schema {


  const myZodSchema = zodSchemaRaw(schema.omit({id: true}));
  
  const baseMongoSchema= new mongoose.Schema(myZodSchema, {
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
    return this._id.toString();
  })
  baseMongoSchema.virtual('id').set(function(v: string) {
    this._id = new ObjectId(v);
  })
  baseMongoSchema.path('createdBy').get(function(value: any) {
    return value?.toString();
  })
  baseMongoSchema.path('updatedBy').get(function(value: any) {
    return value?.toString();
  })

  return baseMongoSchema;
}
