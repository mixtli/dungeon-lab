import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Custom refinement for multer files
const isMulterFile = (value: any) => {
  return value 
    && typeof value === 'object'
    && 'buffer' in value 
    && 'mimetype' in value 
    && 'originalname' in value;
};

export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.body);
      req.body = validatedData;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.locals.validationErrors = err.errors;
        console.log("Validation errors", err.errors, err.message);
        res.status(400).json({
          message: 'Validation error' + err.message,
          errors: err.errors,
        });
      } else {
        res.locals.error = err;
        next(err);
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
export function validateMultipartRequest(schema: z.ZodSchema, fileFields: string | string[] = 'image') {
  // Convert to array for consistent handling
  const fieldsArray = Array.isArray(fileFields) ? fileFields : [fileFields];
  
  // Always use fields for consistency, even for a single file
  const multerMiddleware = upload.fields(
    fieldsArray.map(field => ({ name: field, maxCount: 1 }))
  );
  
  return [
    multerMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
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
        
        // Check if we have all required files
        // const missingFields = fieldsArray.filter(field => !normalizedFiles.has(field));
        // if (missingFields.length > 0) {
        //   const error = new Error(`Missing required file field(s): ${missingFields.join(', ')}`);
        //   res.locals.error = error;
        //   res.status(400).json({ message: error.message });
        //   return;
        // }
        
        // Create a multer file schema that uses the isMulterFile check
        const multerFileSchema = z.custom(isMulterFile);
        
        // Build the schema extension for file fields
        const schemaExtension: Record<string, z.ZodType<any>> = {};
        // Check if the schema is a ZodObject to access shape property
        if (schema instanceof z.ZodObject) {
          // Get shape of the schema to check if fields are optional
          const shape = schema._def.shape();

          fieldsArray.forEach(field => {
            // Check if the field exists in the schema and if it's optional
            const isFieldOptional = field in shape &&
              (shape[field] instanceof z.ZodOptional ||
                shape[field] instanceof z.ZodNullable ||
                shape[field] instanceof z.ZodUnion &&
                shape[field]._def.options.some((opt: any) =>
                  opt instanceof z.ZodLiteral && opt._def.value === ''));
            console.log("isFieldOptional", field, isFieldOptional);

            // Make file field optional if it's optional in the original schema
            schemaExtension[field] = isFieldOptional
              ? multerFileSchema.optional()
              : multerFileSchema;
          });
        } else {
          // Default behavior if schema is not a ZodObject
          fieldsArray.forEach(field => {
            schemaExtension[field] = multerFileSchema;
          });
        }


        // Create a modified schema that accepts multer files
        const modifiedSchema = schema instanceof z.ZodObject 
          ? schema.extend(schemaExtension)
          : schema;
        
        // Build validated data object - start with parsed body form fields
        let bodyData: Record<string, any> = { ...req.body };
        
        // Parse numeric fields and JSON strings
        // TODO:  Do we still need this?
        // Object.entries(bodyData).forEach(([key, value]) => {
        //   if (typeof value === 'string') {
        //     // Try to parse JSON strings
        //     try {
        //       const parsed = JSON.parse(value);
        //       bodyData[key] = parsed;
        //     } catch (e) {
        //       // If it's not valid JSON, keep the original string
        //       // Only parse numeric fields if not JSON
        //       if (key === 'gridColumns') {
        //         bodyData[key] = parseInt(value, 10);
        //       }
        //     }
        //   }
        // });
        
        // Add all files from our normalized map
        normalizedFiles.forEach((file, fieldName) => {
          bodyData[fieldName] = file;
        });

        const validatedData = await modifiedSchema.parseAsync(bodyData);
        req.body = validatedData;
        next();
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.locals.validationErrors = err.errors;
          console.log("Validation errors", err.errors, err.message);
          res.status(400).json({
            message: 'Validation error' + err.message,
            errors: err.errors,
          });
        } else {
          res.locals.error = err;
          res.status(400).json({
            message: err instanceof Error ? err.message : 'Invalid request data',
          });
        }
      }
    },
  ];
} 