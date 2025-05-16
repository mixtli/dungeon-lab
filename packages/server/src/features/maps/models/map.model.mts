import mongoose, { ObjectId } from 'mongoose';
import { mapSchema } from '@dungeon-lab/shared/index.mjs';
import { zId, zodSchemaRaw } from '@zodyac/zod-mongoose';
import { IMap } from '@dungeon-lab/shared/types/index.mjs';
import { baseMongooseZodSchema } from '../../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../../models/zod-to-mongo.mjs';
import { portalSchema } from '@dungeon-lab/shared/index.mjs';
type IPortal = z.infer<typeof portalSchema>;
import { z } from '../../../utils/zod.mjs';

/**
 * Map document interface extending the base Map interface
 */
///export interface MapDocument extends Omit<IMap, 'id'>, BaseDocument {}

/**
 * Create a server-specific schema that overrides string IDs with ObjectIds
 */
const serverMapSchema = mapSchema.extend({
  // Convert string IDs to ObjectIds for asset references
  thumbnailId: zId('Asset').optional(),
  imageId: zId('Asset').optional()
});

// serverMapSchema.extend({
//   line_of_sight: z.array(z.array(z.object({x: z.number(), y: z.number()}))).optional()
// });

// const schema = zodSchemaRaw(serverMapSchema);
// schema.uvtt.line_of_sight._id = false;
// schema.uvtt.line_of_sight._id = false;
// schema.uvtt.line_of_sight.type[0].type[0].index = false;


/**
 * Create Mongoose schema with base configuration
 */
const mongooseSchema = createMongoSchema<IMap>(serverMapSchema.merge(baseMongooseZodSchema));

mongooseSchema.path('uvtt.line_of_sight').get(function (value: {x: number, y: number}[][]) {
  if (!value) return undefined;
  return value.map((wall) => wall.map((point) => ({x: point.x, y: point.y})))
});

mongooseSchema.path('uvtt.line_of_sight').set(function (value: {x: number, y: number}[][]) {
  const result = value.map((wall) => wall.map((point) => ({x: point.x, y: point.y})));
  console.log(result);
  return result;
});

mongooseSchema.path('uvtt.objects_line_of_sight').get(function (value: {x: number, y: number}[][]) {
  if (!value) return undefined;
  return value.map((wall) => wall.map((point) => ({x: point.x, y: point.y})))
});

mongooseSchema.path('uvtt.objects_line_of_sight').set(function (value: {x: number, y: number}[][]) {
  const result = value.map((wall) => wall.map((point) => ({x: point.x, y: point.y})));
  console.log(result);
  return result;
});
mongooseSchema.path('uvtt.portals').get(function (value: IPortal[]) {
  if (!value) return undefined;
  return value.map((portal) => {
    const { _id, ...portalWithoutId } = portal;
    if (portalWithoutId.bounds) {
      portalWithoutId.bounds = portalWithoutId.bounds.map((bound: {x: number, y: number}) => ({x: bound.x, y: bound.y}));
    }
    return portalWithoutId;
  });
  
});

mongooseSchema.path('uvtt.portals').set(function (value: IPortal[]) {
  const result = value.map((portal) => {
    const { _id, ...portalWithoutId } = portal;
    portalWithoutId.bounds = portalWithoutId.bounds.map((bound: {x: number, y: number}) => ({x: bound.x, y: bound.y}));
    return portalWithoutId;
  });
  return result;
});

// Fix line 31 - properly disable _id for nested array elements
// if (mongooseSchema.paths.uvtt && mongooseSchema.paths.uvtt.schema) {
//   const uvttSchema = mongooseSchema.paths.uvtt.schema;
//   const lineOfSightSchema = uvttSchema.paths.line_of_sight.schema;
  
//   // First level array schema (array of walls)
//   if (lineOfSightSchema.paths[0] && lineOfSightSchema.paths[0].schema) {
//     const wallsSchema = lineOfSightSchema.paths[0].schema;
    
//     // Second level array schema (array of points)
//     if (wallsSchema.paths[0] && wallsSchema.paths[0].schema) {
//       // Set _id: false for the point schema
//       wallsSchema.paths[0].schema.remove('_id');
//     }
//   }
// }


// Override the data field to use Mixed type
mongooseSchema.path('userData', mongoose.Schema.Types.Mixed);

mongooseSchema.path('imageId').get(function (value: ObjectId | undefined) {
  return value?.toString();
});
mongooseSchema.path('thumbnailId').get(function (value: ObjectId | undefined) {
  return value?.toString();
});

// Add virtual properties for image and thumbnail
mongooseSchema.virtual('image', {
  ref: 'Asset',
  localField: 'imageId',
  foreignField: '_id',
  justOne: true
});

mongooseSchema.virtual('thumbnail', {
  ref: 'Asset',
  localField: 'thumbnailId',
  foreignField: '_id',
  justOne: true
});

// Configure schema to include virtuals when converting to JSON
// mongooseSchema.set('toJSON', { virtuals: true });

// Also set toObject options to make sure virtuals work consistently
// mongooseSchema.set('toObject', { virtuals: true });

/**
 * Map model
 */
export const MapModel = mongoose.model<IMap>('Map', mongooseSchema);