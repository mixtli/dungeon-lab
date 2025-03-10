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
        res.status(400).json({
          message: 'Validation error',
          errors: err.errors,
        });
      } else {
        res.locals.error = err;
        next(err);
      }
    }
  };
}

export function validateMultipartRequest(schema: z.ZodSchema) {
  return [
    upload.single('image'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          const error = new Error('Image file is required');
          res.locals.error = error;
          res.status(400).json({
            message: error.message
          });
          return;
        }

        // Create a modified schema that accepts multer files
        const serverSchema = z.instanceof(File).transform(() => true).or(z.custom(isMulterFile));
        const modifiedSchema = schema instanceof z.ZodObject 
          ? schema.extend({ image: serverSchema })
          : schema;

        const validatedData = await modifiedSchema.parseAsync({
          ...req.body,
          gridColumns: parseInt(req.body.gridColumns, 10),
          image: req.file,
        });

        req.body = validatedData;
        next();
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.locals.validationErrors = err.errors;
          res.status(400).json({
            message: 'Validation error',
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