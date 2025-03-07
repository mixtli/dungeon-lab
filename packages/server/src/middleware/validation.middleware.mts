import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.body);
      req.body = validatedData;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: 'Validation error',
          errors: err.errors,
        });
      } else {
        next(err);
      }
    }
  };
} 