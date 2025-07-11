import { z } from 'zod';
import {
  mapSchema,
  mapSchemaWithVirtuals,
  mapCreateSchema,
  mapImportUVTTSchema,
  uvttSchema,
  portalSchema,
  // coordinateSchema, // not needed for now
  // Import lightSchema for direct type inference
  // Note: lightSchema is not exported by default, so export it from map.schema.mts if needed
  // For now, let's assume we can import it
  lightSchema,
} from '../schemas/map.schema.mjs';

// Inferred types from Zod schemas

export type Map = z.infer<typeof mapSchema>;
export type MapWithVirtuals = z.infer<typeof mapSchemaWithVirtuals>;
export type MapCreate = z.infer<typeof mapCreateSchema>;
export type MapImportUVTT = z.infer<typeof mapImportUVTTSchema>;
export type UVTT = z.infer<typeof uvttSchema>;

// Infer subtypes from directly imported schemas
export type UVTTLight = z.infer<typeof lightSchema>;
export type UVTTPortal = z.infer<typeof portalSchema>; 