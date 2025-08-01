import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/base.mjs';

// Define FilesData type
export type FilesData = { [fieldName: string]: File[] };

// Add assets field to Express Request interface using module augmentation
declare module 'express' {
  interface Request {
    assets?: FilesData;
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Larger upload limits for ZIP files
const uploadZip = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit for ZIP files
  },
  fileFilter: (_req, file, cb) => {
    // Only allow ZIP files
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  }
});

export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response<BaseAPIResponse<unknown>>, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.body);
      req.body = validatedData;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.locals.validationErrors = err.errors;
        console.log('Validation errors', err.errors, err.message);
        res.status(422).json({
          success: false,
          error: 'Validation error' + err.message,
          error_details: err.issues
        });
      } else {
        res.locals.error = err;
        res.status(400).json({
          success: false,
          error: err instanceof Error ? err.message : 'Invalid request data'
        });
      }
    }
  };
}

/**
 * Middleware to validate multipart form data with file uploads
 *
 * @param schema - The Zod schema to validate against
 * @param fileFields - Array of file field names or a single field name (defaults to 'image')
 */
export function validateMultipartRequest(
  schema: z.ZodSchema,
  fileFields: string | string[] = 'image'
) {
  // Convert to array for consistent handling
  const fieldsArray = Array.isArray(fileFields) ? fileFields : [fileFields];
  console.log('fieldsArray', fieldsArray);

  // Always use fields for consistency, even for a single file
  const multerMiddleware = upload.fields(
    fieldsArray.map((field) => ({ name: field, maxCount: 1 }))
  );

  return [
    multerMiddleware,
    async (req: Request, res: Response<BaseAPIResponse<unknown>>, next: NextFunction) => {
      if(req.is('application/uvtt')) {
        next();
        return;
      }
      try {
        // Normalize file structure to a consistent format for easier processing
        const normalizedFiles = new Map<string, Express.Multer.File>();

        // Process multiple file uploads from req.files (we don't need to handle req.file anymore)
        const files = req.files as Record<string, Express.Multer.File[]> | undefined;

        if (files) {
          Object.entries(files).forEach(([fieldName, fieldFiles]) => {
            if (Array.isArray(fieldFiles) && fieldFiles.length > 0) {
              normalizedFiles.set(fieldName, fieldFiles[0]);
            }
          });
        }

        // Build the schema extension for file fields
        const schemaExtension: Record<string, z.ZodType<unknown>> = {};
        // Check if the schema is a ZodObject to access shape property
        if (schema instanceof z.ZodObject) {
          // Get shape of the schema to check if fields are optional
          const shape = schema._def.shape();

          // Add all of the file fields to the schema
          fieldsArray.forEach((field) => {
            // Check if the field exists in the schema and if it's optional
            const isFieldOptional =
              field in shape &&
              (shape[field] instanceof z.ZodOptional ||
                shape[field] instanceof z.ZodNullable ||
                (shape[field] instanceof z.ZodUnion &&
                  shape[field]._def.options.some(
                    (opt: z.ZodType<unknown>) =>
                      opt instanceof z.ZodLiteral && opt._def.value === ''
                  )));
            console.log('isFieldOptional', field, isFieldOptional);

            // Make file field optional if it's optional in the original schema
            schemaExtension[field] = isFieldOptional
              ? z.instanceof(File).optional()
              : z.instanceof(File);
          });
        } else {
          // Default behavior if schema is not a ZodObject
          fieldsArray.forEach((field) => {
            schemaExtension[field] = z.instanceof(File);
          });
        }

        // Create a modified schema that accepts multer files
        const modifiedSchema =
          schema instanceof z.ZodObject ? schema.extend(schemaExtension) : schema;
        // Build validated data object - start with parsed body form fields
        const bodyData: Record<string, unknown> = { ...req.body };

        // Add all files from our normalized map
        const filesData: FilesData = {};
        normalizedFiles.forEach((file, fieldName) => {
          const f = new File([file.buffer], file.originalname, { type: file.mimetype });
          bodyData[fieldName] = f;
          filesData[fieldName] = [f];
        });

        // Store in both places for backward compatibility
        req.assets = filesData; // New property with correct typing

        // Parse the 'data' field if it's a JSON string
        if (typeof bodyData.data === 'string') {
          try {
            bodyData.data = JSON.parse(bodyData.data);
          } catch (e) {
            // If parsing fails, keep the original string
            console.warn('Failed to parse JSON data field:', e);
          }
        }
        if (typeof bodyData.userData === 'string') {
          try {
            bodyData.userData = JSON.parse(bodyData.userData);
          } catch (e) {
            // If parsing fails, keep the original string
            console.warn('Failed to parse JSON userData field:', e);
          }
        }
        //console.log('bodyData', bodyData);

        const validatedData = await modifiedSchema.parseAsync(bodyData);
        req.body = validatedData;
        next();
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.locals.validationErrors = err.errors;
          console.log('Multipart Validation errors', err.errors, err.message);
          res.status(422).json({
            success: false,
            error: 'Multipart Validation error' + err.message,
            error_details: err.issues
          });
        } else {
          res.locals.error = err;
          res.status(400).json({
            success: false,
            error: err instanceof Error ? err.message : 'Invalid request data'
          });
        }
      }
    }
  ];
}

/**
 * Middleware specifically for ZIP file uploads (compendium imports)
 * Uses larger file size limits and ZIP-specific validation
 */
export function validateZipUpload(
  schema: z.ZodSchema,
  fileField: string = 'zipFile'
) {
  const multerMiddleware = uploadZip.single(fileField);

  return [
    multerMiddleware,
    async (req: Request, res: Response<BaseAPIResponse<unknown>>, next: NextFunction) => {
      try {
        // Build validated data object
        const bodyData: Record<string, unknown> = { ...req.body };

        // Add the ZIP file if present
        if (req.file) {
          const file = new File([req.file.buffer], req.file.originalname, { 
            type: req.file.mimetype 
          });
          bodyData[fileField] = file;
        }

        // Parse JSON fields if they exist
        Object.keys(bodyData).forEach(key => {
          if (typeof bodyData[key] === 'string' && key !== fileField) {
            try {
              bodyData[key] = JSON.parse(bodyData[key] as string);
            } catch {
              // Keep as string if not valid JSON
            }
          }
        });

        // Validate against schema
        const validatedData = await schema.parseAsync(bodyData);
        req.body = validatedData;
        next();
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.locals.validationErrors = err.errors;
          console.log('ZIP Upload Validation errors', err.errors, err.message);
          res.status(422).json({
            success: false,
            error: 'ZIP Upload Validation error: ' + err.message,
            error_details: err.issues
          });
        } else {
          res.locals.error = err;
          res.status(400).json({
            success: false,
            error: err instanceof Error ? err.message : 'Invalid ZIP upload data'
          });
        }
      }
    }
  ];
}
