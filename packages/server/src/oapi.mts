import openapi from '@wesleytodd/openapi';
import { z } from './utils/zod.mjs';
import { createSchema } from 'zod-openapi';
import { RequestHandler } from 'express';

export const oapi = openapi(
  {
    openapi: '3.0.0',
    info: {
      title: 'Express Application',
      description: 'Generated docs from an Express api',
      version: '1.0.0'
    }
  },
  { htmlui: true }
);

// Standard response codes used across different endpoints
const standardResponses = {
  401: { description: 'Unauthorized' },
  403: { description: 'Forbidden' },
  404: { description: 'Not found' },
  422: { description: 'Validation error' },
  500: { description: 'Internal server error' }
};

/**
 * Create OpenAPI documentation middleware based on HTTP method
 * @param zodSchema The Zod schema to use for request/response
 * @param overrides Optional overrides for the generated OpenAPI documentation
 * @param method HTTP method (defaults to GET)
 * @param isSingleItem Whether this is for a single item endpoint (defaults to false)
 */
export function createOpenApiDocs(
  zodSchema: z.ZodType,
  overrides: Record<string, unknown> = {},
  method = 'GET',
  isSingleItem = false
): RequestHandler {
  // Define a more specific type for pathConfig
  interface PathConfig {
    responses: Record<string | number, unknown>;
    requestBody?: unknown;
    [key: string]: unknown;
  }

  const pathConfig: PathConfig = {
    responses: { ...standardResponses }
  };

  // Configure based on HTTP method
  switch (method) {
    case 'GET':
      if (isSingleItem) {
        // Single item endpoint
        pathConfig.responses[200] = {
          description: 'Success',
          content: {
            'application/json': createSchema(
              zodSchema.openapi({
                description: 'Single item'
              })
            )
          }
        };
      } else {
        // Collection endpoint
        pathConfig.responses[200] = {
          description: 'Success',
          content: {
            'application/json': createSchema(
              z.array(zodSchema).openapi({
                description: 'List of items'
              })
            )
          }
        };
      }
      break;

    case 'POST':
      // Create endpoint
      pathConfig.requestBody = {
        content: {
          'application/json': createSchema(
            zodSchema.openapi({
              description: 'Create new item'
            })
          )
        }
      };
      pathConfig.responses[201] = {
        description: 'Created',
        content: {
          'application/json': createSchema(
            zodSchema.openapi({
              description: 'Created item'
            })
          )
        }
      };
      break;

    case 'PUT':
    case 'PATCH':
      // Update endpoint
      pathConfig.requestBody = {
        content: {
          'application/json': createSchema(
            zodSchema.openapi({
              description: 'Update item'
            })
          )
        }
      };
      pathConfig.responses[200] = {
        description: 'Updated',
        content: {
          'application/json': createSchema(
            zodSchema.openapi({
              description: 'Updated item'
            })
          )
        }
      };
      break;

    case 'DELETE':
      // Delete endpoint
      pathConfig.responses[204] = {
        description: 'Deleted'
      };
      break;
  }

  // Merge with overrides
  const finalConfig = { ...pathConfig, ...overrides };
  console.log('--------------------------------');
  console.log(pathConfig);
  console.log(overrides);
  console.log(finalConfig);

  // Return the openapi middleware
  // @ts-expect-error for some reason the type inference is wrong
  return oapi.validPath(finalConfig);
}

// Convenience methods for specific HTTP verbs
export const openApiGet = (zodSchema: z.ZodType, overrides = {}) =>
  createOpenApiDocs(zodSchema, overrides, 'GET', false);

export const openApiGetOne = (zodSchema: z.ZodType, overrides = {}) =>
  createOpenApiDocs(zodSchema, overrides, 'GET', true);

export const openApiPost = (zodSchema: z.ZodType, overrides = {}) =>
  createOpenApiDocs(zodSchema, overrides, 'POST');

export const openApiPut = (zodSchema: z.ZodType, overrides = {}) =>
  createOpenApiDocs(zodSchema, overrides, 'PUT');

export const openApiPatch = (zodSchema: z.ZodType, overrides = {}) =>
  createOpenApiDocs(zodSchema, overrides, 'PATCH');

export const openApiDelete = (zodSchema: z.ZodType, overrides = {}) =>
  createOpenApiDocs(zodSchema, overrides, 'DELETE');
