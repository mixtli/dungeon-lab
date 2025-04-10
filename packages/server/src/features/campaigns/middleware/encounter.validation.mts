import { Request, Response, NextFunction } from 'express';
import { encounterCreateSchema, encounterUpdateSchema } from '@dungeon-lab/shared/src/schemas/encounter.schema.mjs';
import { logger } from '../../../utils/logger.mjs';

/**
 * Validates the request body for creating a new encounter
 */
export function validateCreateEncounter(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = encounterCreateSchema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    logger.error('Encounter creation validation error:', error);
    res.status(400).json({ error: 'Invalid encounter data' });
  }
}

/**
 * Validates the request body for updating an encounter
 */
export function validateUpdateEncounter(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = encounterUpdateSchema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    logger.error('Encounter update validation error:', error);
    res.status(400).json({ error: 'Invalid encounter data' });
  }
} 