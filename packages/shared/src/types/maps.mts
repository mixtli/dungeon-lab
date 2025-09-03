import { z } from 'zod';
import {
  mapSchema,
  mapSchemaWithVirtuals,
  mapCreateSchema,
  internalMapDataSchema,
} from '../schemas/map.schema.mjs';
import {
  mapImportUVTTSchema,
  uvttSchema,
  uvttPortalSchema as portalSchema,
  uvttLightSchema as lightSchema,
} from '../schemas/uvtt-import-export.schema.mjs';

// Inferred types from Zod schemas

export type Map = z.infer<typeof mapSchema>;
export type MapWithVirtuals = z.infer<typeof mapSchemaWithVirtuals>;
export type MapCreate = z.infer<typeof mapCreateSchema>;
export type InternalMapData = z.infer<typeof internalMapDataSchema>;
export type MapImportUVTT = z.infer<typeof mapImportUVTTSchema>;
export type UVTT = z.infer<typeof uvttSchema>;

// Infer subtypes from directly imported schemas
export type UVTTLight = z.infer<typeof lightSchema>;
export type UVTTPortal = z.infer<typeof portalSchema>; 