import { Router } from 'express';
import { PluginController } from '../controllers/plugin.controller.mjs';
import { z } from '../utils/zod.mjs';
import { createSchema } from 'zod-openapi';
import { openApiGet, openApiGetOne } from '../oapi.mjs';
import { baseAPIResponseSchema, pluginSchema } from '@dungeon-lab/shared/types/api/index.mjs';

// Create the plugin controller instance
const pluginController = new PluginController();

// Create the router
const router = Router();

// Define plugin routes - read only operations
router.get(
  '/',
  openApiGet(z.null(), {
    description: 'Get all available plugins',
    responses: {
      200: {
        description: 'Plugins retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: z.array(pluginSchema) }).openapi({
                description: 'Plugins response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  pluginController.getAllPlugins
);

router.get(
  '/:id',
  openApiGetOne(z.null(), {
    description: 'Get plugin by ID',
    responses: {
      200: {
        description: 'Plugin retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: pluginSchema }).openapi({
                description: 'Plugin response'
              })
            )
          }
        }
      },
      404: { description: 'Plugin not found' },
      500: { description: 'Server error' }
    }
  }),
  pluginController.getPlugin
);

router.get(
  '/:id/code/:file',
  openApiGetOne(z.null(), {
    description: 'Get plugin code for a specific file',
    responses: {
      200: {
        description: 'Plugin code retrieved successfully',
        content: {
          'application/json': {
            schema: createSchema(
              baseAPIResponseSchema.extend({ data: z.string() }).openapi({
                description: 'Plugin code response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid file path' },
      404: { description: 'Plugin file not found' },
      500: { description: 'Server error' }
    }
  }),
  pluginController.getPluginCode
);

// Export the router
export { router as pluginRoutes };
