import express from 'express';
import { CompendiumController } from '../controllers/compendium.controller.mjs';
import { importController } from '../controllers/import.controller.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { createPathSchema, oapi } from '../../../oapi.mjs';
import { z } from '../../../utils/zod.mjs';
import { 
  compendiumSchema, 
  compendiumEntrySchema 
} from '@dungeon-lab/shared/schemas/index.mjs';
import { 
  importZipSchema, 
  validateZipSchema, 
  importProgressSchema 
} from '@dungeon-lab/shared/schemas/import.schema.mjs';
import { baseAPIResponseSchema } from '@dungeon-lab/shared/types/api/base.mjs';

/**
 * Compendiums routes
 */
const router = express.Router();
const compendiumController = new CompendiumController();
router.use(authenticate);

// Create response schemas using baseAPIResponseSchema
const getCompendiumsResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(compendiumSchema)
});

const getCompendiumResponseSchema = baseAPIResponseSchema.extend({
  data: compendiumSchema.optional()
});

const compendiumResponseSchema = baseAPIResponseSchema.extend({
  data: compendiumSchema.optional()
});

const getEntriesResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(compendiumEntrySchema)
});

const getEntryResponseSchema = baseAPIResponseSchema.extend({
  data: compendiumEntrySchema.optional()
});

const entryResponseSchema = baseAPIResponseSchema.extend({
  data: compendiumEntrySchema.optional()
});

const deleteResponseSchema = baseAPIResponseSchema.extend({
  data: z.undefined()
});

const statsResponseSchema = baseAPIResponseSchema.extend({
  data: z.object({
    totalEntries: z.number(),
    entriesByType: z.record(z.string(), z.number()),
    entriesByCategory: z.record(z.string(), z.number())
  })
});

// Query schemas
const getCompendiumsQuerySchema = z.object({
  gameSystemId: z.string().optional(),
  pluginId: z.string().optional(),
  status: z.string().optional(),
  isPublic: z.string().optional()
});

const getEntriesQuerySchema = z.object({
  contentType: z.string().optional(),
  isActive: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional()
});

// Request body schemas
const createCompendiumBodySchema = compendiumSchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true,
  totalEntries: true,
  entriesByType: true
});

const updateCompendiumBodySchema = compendiumSchema.partial().omit({
  id: true,
  createdBy: true,
  importedAt: true,
  importedBy: true
});

const createEntryBodySchema = compendiumEntrySchema.omit({
  id: true,
  compendiumId: true,
  createdBy: true,
  updatedBy: true
});

const updateEntryBodySchema = compendiumEntrySchema.partial().omit({
  id: true,
  createdBy: true,
  compendiumId: true,
  contentType: true,
  contentId: true
});

const linkContentBodySchema = z.object({
  contentType: z.enum(['Actor', 'Item', 'VTTDocument']),
  contentId: z.string(),
  name: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sortOrder: z.number().optional()
});

// Routes

// Get all compendiums
router.get(
  '/',
  oapi.validPath(
    createPathSchema({
      description: 'Get all compendiums with optional filtering',
      requestParams: {
        query: getCompendiumsQuerySchema
      },
      responses: {
        200: getCompendiumsResponseSchema
      }
    })
  ),
  compendiumController.getCompendiums
);

// Get compendium by slug
router.get(
  '/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Get a specific compendium by slug',
      requestParams: {
        path: z.object({
          id: z.string().describe('Compendium slug')
        })
      },
      responses: {
        200: getCompendiumResponseSchema,
        404: baseAPIResponseSchema
      }
    })
  ),
  compendiumController.getCompendium
);

// Create new compendium
router.post(
  '/',
  oapi.validPath(
    createPathSchema({
      description: 'Create a new compendium',
      requestBody: {
        content: {
          'application/json': {
            schema: createCompendiumBodySchema.openapi({
              description: 'Compendium data'
            })
          }
        }
      },
      responses: {
        201: compendiumResponseSchema,
        400: baseAPIResponseSchema,
        401: baseAPIResponseSchema
      }
    })
  ),
  compendiumController.createCompendium
);

// Update compendium
router.put(
  '/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Update a compendium',
      requestParams: {
        path: z.object({
          id: z.string().describe('Compendium slug')
        })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: updateCompendiumBodySchema.openapi({
              description: 'Updated compendium data'
            })
          }
        }
      },
      responses: {
        200: compendiumResponseSchema,
        401: baseAPIResponseSchema,
        404: baseAPIResponseSchema
      }
    })
  ),
  compendiumController.updateCompendium
);

// Delete compendium
router.delete(
  '/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Delete a compendium and all its entries',
      requestParams: {
        path: z.object({
          id: z.string().describe('Compendium slug')
        })
      },
      responses: {
        200: baseAPIResponseSchema.extend({
          data: z.object({
            message: z.string()
          })
        }),
        401: baseAPIResponseSchema,
        404: baseAPIResponseSchema,
        500: baseAPIResponseSchema
      }
    })
  ),
  importController.deleteCompendium
);

// Get compendium entries
router.get(
  '/:id/entries',
  oapi.validPath(
    createPathSchema({
      description: 'Get all entries for a compendium',
      requestParams: {
        path: z.object({
          id: z.string().describe('Compendium slug')
        }),
        query: getEntriesQuerySchema
      },
      responses: {
        200: getEntriesResponseSchema
      }
    })
  ),
  compendiumController.getCompendiumEntries
);

// Create compendium entry
router.post(
  '/:id/entries',
  oapi.validPath(
    createPathSchema({
      description: 'Create a new entry in a compendium',
      requestParams: {
        path: z.object({
          id: z.string().describe('Compendium slug')
        })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: createEntryBodySchema.openapi({
              description: 'Entry data'
            })
          }
        }
      },
      responses: {
        201: entryResponseSchema,
        401: baseAPIResponseSchema
      }
    })
  ),
  compendiumController.createCompendiumEntry
);

// Link existing content to compendium
router.post(
  '/:id/link',
  oapi.validPath(
    createPathSchema({
      description: 'Link existing content to a compendium',
      requestParams: {
        path: z.object({
          id: z.string().describe('Compendium slug')
        })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: linkContentBodySchema.openapi({
              description: 'Content link data'
            })
          }
        }
      },
      responses: {
        201: entryResponseSchema,
        401: baseAPIResponseSchema,
        404: baseAPIResponseSchema
      }
    })
  ),
  compendiumController.linkContent
);

// Get compendium statistics
router.get(
  '/:id/stats',
  oapi.validPath(
    createPathSchema({
      description: 'Get statistics for a compendium',
      requestParams: {
        path: z.object({
          id: z.string().describe('Compendium slug')
        })
      },
      responses: {
        200: statsResponseSchema
      }
    })
  ),
  compendiumController.getCompendiumStats
);

// Get compendium entry by ID
router.get(
  '/entries/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Get a specific compendium entry by ID',
      requestParams: {
        path: z.object({
          id: z.string().describe('Entry ID')
        })
      },
      responses: {
        200: getEntryResponseSchema,
        404: baseAPIResponseSchema
      }
    })
  ),
  compendiumController.getCompendiumEntry
);

// Update compendium entry
router.put(
  '/entries/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Update a compendium entry',
      requestParams: {
        path: z.object({
          id: z.string().describe('Entry ID')
        })
      },
      requestBody: {
        content: {
          'application/json': {
            schema: updateEntryBodySchema.openapi({
              description: 'Updated entry data'
            })
          }
        }
      },
      responses: {
        200: entryResponseSchema,
        401: baseAPIResponseSchema,
        404: baseAPIResponseSchema
      }
    })
  ),
  compendiumController.updateCompendiumEntry
);

// Delete compendium entry
router.delete(
  '/entries/:id',
  oapi.validPath(
    createPathSchema({
      description: 'Delete a compendium entry',
      requestParams: {
        path: z.object({
          id: z.string().describe('Entry ID')
        })
      },
      responses: {
        200: deleteResponseSchema,
        404: baseAPIResponseSchema
      }
    })
  ),
  compendiumController.deleteCompendiumEntry
);

// Unlink content from compendium
router.delete(
  '/entries/:id/unlink',
  oapi.validPath(
    createPathSchema({
      description: 'Unlink content from compendium (removes entry and clears compendiumId)',
      requestParams: {
        path: z.object({
          id: z.string().describe('Entry ID')
        })
      },
      responses: {
        200: deleteResponseSchema,
        404: baseAPIResponseSchema
      }
    })
  ),
  compendiumController.unlinkContent
);

// Import-related routes

// Import response schemas
const importResponseSchema = baseAPIResponseSchema.extend({
  data: z.object({
    jobId: z.string(),
    message: z.string()
  })
});

const importStatusResponseSchema = baseAPIResponseSchema.extend({
  data: z.object({
    jobId: z.string(),
    status: z.string(),
    progress: importProgressSchema,
    compendiumId: z.string().optional(),
    error: z.string().optional()
  })
});

const validateZipResponseSchema = baseAPIResponseSchema.extend({
  data: z.object({
    valid: z.boolean(),
    manifest: z.any().optional(),
    validation: z.any().optional(),
    error: z.string().optional()
  })
});

const userJobsResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(z.object({
    jobId: z.string(),
    status: z.string(),
    progress: importProgressSchema,
    compendiumId: z.string().optional(),
    error: z.string().optional()
  }))
});

// Middleware to parse raw binary data for ZIP uploads
const parseRawZip = express.raw({ 
  type: 'application/zip',
  limit: '500mb' 
});

// Import compendium from ZIP
router.post(
  '/import',
  parseRawZip,
  importController.importZip
);

// Get import job status
router.get(
  '/import/:jobId/status',
  oapi.validPath(
    createPathSchema({
      description: 'Get the status of an import job',
      requestParams: {
        path: z.object({
          jobId: z.string().describe('Import job ID')
        })
      },
      responses: {
        200: importStatusResponseSchema,
        401: baseAPIResponseSchema,
        403: baseAPIResponseSchema,
        404: baseAPIResponseSchema,
        500: baseAPIResponseSchema
      }
    })
  ),
  importController.getImportStatus
);

// Validate ZIP file
router.post(
  '/validate',
  parseRawZip,
  importController.validateZip
);

// Cancel import job
router.delete(
  '/import/:jobId',
  oapi.validPath(
    createPathSchema({
      description: 'Cancel a pending import job',
      requestParams: {
        path: z.object({
          jobId: z.string().describe('Import job ID')
        })
      },
      responses: {
        200: baseAPIResponseSchema.extend({
          data: z.object({
            message: z.string()
          })
        }),
        400: baseAPIResponseSchema,
        401: baseAPIResponseSchema,
        403: baseAPIResponseSchema,
        404: baseAPIResponseSchema,
        500: baseAPIResponseSchema
      }
    })
  ),
  importController.cancelImport
);

// Get user's import jobs
router.get(
  '/import/jobs',
  oapi.validPath(
    createPathSchema({
      description: 'Get all import jobs for the current user',
      responses: {
        200: userJobsResponseSchema,
        401: baseAPIResponseSchema,
        500: baseAPIResponseSchema
      }
    })
  ),
  importController.getUserImportJobs
);

export default router;