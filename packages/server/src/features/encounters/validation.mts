import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.mjs';
import { Types } from 'mongoose';
import {
  createEncounterSchema,
  updateEncounterSchema,
  EncounterStatusEnum
} from '@dungeon-lab/shared/schemas/encounters.schema.mjs';
import {
  createTokenSchema,
  updateTokenSchema
} from '@dungeon-lab/shared/schemas/tokens.schema.mjs';

/**
 * Validates the request body for creating a new encounter
 */
export function validateCreateEncounter(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = createEncounterSchema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    logger.error('Encounter creation validation error:', error);
    return res.status(400).json({
      success: false,
      error: 'Invalid encounter data',
      data: null
    });
  }
}

/**
 * Validates the request body for updating an encounter
 */
export function validateUpdateEncounter(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = updateEncounterSchema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    logger.error('Encounter update validation error:', error);
    return res.status(400).json({
      success: false,
      error: 'Invalid encounter update data',
      data: null
    });
  }
}

/**
 * Validates the request body for creating a new token
 */
export function validateCreateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = createTokenSchema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    logger.error('Token creation validation error:', error);
    return res.status(400).json({
      success: false,
      error: 'Invalid token data',
      data: null
    });
  }
}

/**
 * Validates the request body for updating a token
 */
export function validateUpdateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = updateTokenSchema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    logger.error('Token update validation error:', error);
    return res.status(400).json({
      success: false,
      error: 'Invalid token update data',
      data: null
    });
  }
}

/**
 * Validates encounter status update
 */
export function validateEncounterStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
        data: null
      });
    }

    const validStatuses = EncounterStatusEnum.options;
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        data: null
      });
    }

    next();
  } catch (error) {
    logger.error('Encounter status validation error:', error);
    return res.status(400).json({
      success: false,
      error: 'Invalid status data',
      data: null
    });
  }
}

/**
 * Validates that the provided ID is a valid MongoDB ObjectId
 */
export function validateObjectId(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: `${paramName} is required`,
        data: null
      });
    }

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format`,
        data: null
      });
    }

    next();
  };
}

/**
 * Validates encounter ID parameter
 */
export const validateEncounterId = validateObjectId('id');

/**
 * Validates token ID parameter
 */
export const validateTokenId = validateObjectId('tokenId');

/**
 * Validates encounter ID parameter for token routes
 */
export const validateEncounterIdForTokens = validateObjectId('encounterId');

/**
 * Validates position data for token placement
 */
export function validateTokenPosition(req: Request, res: Response, next: NextFunction) {
  try {
    const { position } = req.body;
    
    if (!position) {
      return next(); // Position might be optional for updates
    }

    if (typeof position.x !== 'number' || typeof position.y !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Position must have numeric x and y coordinates',
        data: null
      });
    }

    if (position.x < 0 || position.y < 0) {
      return res.status(400).json({
        success: false,
        error: 'Position coordinates must be non-negative',
        data: null
      });
    }

    // Optional elevation validation
    if (position.elevation !== undefined && typeof position.elevation !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Position elevation must be a number',
        data: null
      });
    }

    next();
  } catch (error) {
    logger.error('Token position validation error:', error);
    return res.status(400).json({
      success: false,
      error: 'Invalid position data',
      data: null
    });
  }
}

/**
 * Validates campaign access for encounter operations
 */
export function validateCampaignAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const { campaignId } = req.body;
    
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Campaign ID is required',
        data: null
      });
    }

    if (!Types.ObjectId.isValid(campaignId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campaign ID format',
        data: null
      });
    }

    next();
  } catch (error) {
    logger.error('Campaign access validation error:', error);
    return res.status(400).json({
      success: false,
      error: 'Invalid campaign access data',
      data: null
    });
  }
}

/**
 * Validates map access for encounter operations
 */
export function validateMapAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const { mapId } = req.body;
    
    if (!mapId) {
      return res.status(400).json({
        success: false,
        error: 'Map ID is required',
        data: null
      });
    }

    if (!Types.ObjectId.isValid(mapId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid map ID format',
        data: null
      });
    }

    next();
  } catch (error) {
    logger.error('Map access validation error:', error);
    return res.status(400).json({
      success: false,
      error: 'Invalid map access data',
      data: null
    });
  }
}

/**
 * Validates encounter settings
 */
export function validateEncounterSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const { settings } = req.body;
    
    if (!settings) {
      return next(); // Settings are optional
    }

    // Validate turn timer duration if provided
    if (settings.turnTimerDuration !== undefined) {
      if (typeof settings.turnTimerDuration !== 'number' || 
          settings.turnTimerDuration < 10 || 
          settings.turnTimerDuration > 600) {
        return res.status(400).json({
          success: false,
          error: 'Turn timer duration must be between 10 and 600 seconds',
          data: null
        });
      }
    }

    // Validate grid size if provided
    if (settings.gridSize !== undefined) {
      if (typeof settings.gridSize !== 'number' || settings.gridSize <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Grid size must be a positive number',
          data: null
        });
      }
    }

    // Validate grid type if provided
    if (settings.gridType !== undefined) {
      const validGridTypes = ['square', 'hex'];
      if (!validGridTypes.includes(settings.gridType)) {
        return res.status(400).json({
          success: false,
          error: `Grid type must be one of: ${validGridTypes.join(', ')}`,
          data: null
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Encounter settings validation error:', error);
    return res.status(400).json({
      success: false,
      error: 'Invalid encounter settings',
      data: null
    });
  }
} 