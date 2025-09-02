/**
 * Add Token Action Handler - Multi-Handler Architecture
 * 
 * Validates and executes token creation from documents using direct draft mutation.
 * Requires GM approval and validates grid position and document existence.
 */

import type { GameActionRequest, AddTokenParameters } from '@dungeon-lab/shared/types/index.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult, ActionValidationHandler, ActionExecutionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import { pluginDiscoveryService } from '../../plugin-discovery.service.mjs';
import { transformAssetUrl } from '../../../utils/asset-utils.mjs';

/**
 * Validate add token request
 */
const validateAddToken: ActionValidationHandler = async (
  request: GameActionRequest, 
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  const params = request.parameters as AddTokenParameters;

  console.log('[AddTokenHandler] Validating token addition:', {
    documentId: params.documentId,
    gridPosition: params.gridPosition,
    requestId: request.id
  });

  // Validate we have an active encounter
  if (!gameState.currentEncounter) {
    return {
      valid: false,
      error: {
        code: 'NO_ACTIVE_ENCOUNTER',
        message: 'No active encounter to add token to'
      }
    };
  }

  // Find the document in game state
  const document = gameState.documents[params.documentId];
  if (!document) {
    return {
      valid: false,
      error: {
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Document not found'
      }
    };
  }

  // Players can request token creation, GM will approve/deny through the action system

  // Validate grid position is non-negative
  if (params.gridPosition.x < 0 || params.gridPosition.y < 0) {
    return {
      valid: false,
      error: {
        code: 'INVALID_POSITION',
        message: 'Grid position must be non-negative'
      }
    };
  }

  // Optional: Validate grid position is within map bounds
  if (gameState.currentEncounter?.currentMap?.uvtt?.resolution?.map_size) {
    const mapData = gameState.currentEncounter.currentMap;
    
    // Basic bounds check if map dimensions are available
    if (mapData.uvtt?.resolution?.map_size?.x && mapData.uvtt?.resolution?.map_size?.y) {
      // map_size is already in grid units, not pixels
      const maxGridX = mapData.uvtt.resolution.map_size.x;
      const maxGridY = mapData.uvtt.resolution.map_size.y;
      
      console.log('[AddTokenHandler] Bounds check:', {
        requestedPosition: params.gridPosition,
        mapGridSize: { x: maxGridX, y: maxGridY },
        withinBounds: params.gridPosition.x < maxGridX && params.gridPosition.y < maxGridY
      });
      
      // Grid coordinates are 0-indexed, so valid range is 0 to maxGrid-1
      if (params.gridPosition.x >= maxGridX || params.gridPosition.y >= maxGridY) {
        return {
          valid: false,
          error: {
            code: 'POSITION_OUT_OF_BOUNDS',
            message: `Grid position (${params.gridPosition.x}, ${params.gridPosition.y}) is outside map boundaries (0-${maxGridX-1}, 0-${maxGridY-1})`
          }
        };
      }
    }
  }

  console.log('[AddTokenHandler] Validation passed for token addition:', {
    documentId: params.documentId,
    documentName: document.name,
    gridPosition: params.gridPosition,
    playerId: request.playerId
  });

  return { valid: true };
};

/**
 * Get token grid size from plugin
 */
async function getTokenGridSize(document: any): Promise<number> {
  try {
    // Get the plugin for this document's plugin ID
    const plugin = await pluginDiscoveryService.loadPluginModule(document.pluginId);
    
    if (plugin && typeof plugin.getTokenGridSize === 'function') {
      const gridSize = plugin.getTokenGridSize(document);
      
      // Validate the result
      if (typeof gridSize === 'number' && gridSize > 0) {
        return gridSize;
      }
      
      console.warn(`Invalid grid size returned by plugin ${document.pluginId}:`, gridSize);
    } else {
      console.warn(`Plugin ${document.pluginId} not found or doesn't support getTokenGridSize`);
    }
  } catch (error) {
    console.error('Error getting token grid size from plugin:', error);
  }
  
  // Default fallback to medium size (1x1)
  return 1;
}

/**
 * Create token bounds from grid position and size
 */
function createTokenBounds(
  gridPosition: { x: number; y: number },
  gridSizeMultiplier: number,
  elevation: number = 0
) {
  // Convert grid size multiplier to actual grid cell count
  const gridCells = Math.max(1, Math.round(gridSizeMultiplier));
  
  // Token bounds are based on top-left position
  const bounds = {
    topLeft: {
      x: gridPosition.x,
      y: gridPosition.y
    },
    bottomRight: {
      x: gridPosition.x + gridCells - 1,
      y: gridPosition.y + gridCells - 1
    },
    elevation
  };
  
  console.log('[AddTokenHandler] Created token bounds:', {
    gridPosition,
    gridSizeMultiplier,
    gridCells,
    bounds
  });
  
  return bounds;
}

/**
 * Get token image URL from document
 */
function getTokenImageUrl(document: any): string | undefined {
  // Documents with virtuals include tokenImage, avatar, and image asset objects
  const documentWithAssets = document as {
    tokenImage?: { url: string };
    avatar?: { url: string };
    image?: { url: string };
  };
  
  if (documentWithAssets.tokenImage?.url) {
    return transformAssetUrl(documentWithAssets.tokenImage.url);
  } else if (documentWithAssets.avatar?.url) {
    return transformAssetUrl(documentWithAssets.avatar.url);
  } else if (documentWithAssets.image?.url) {
    return transformAssetUrl(documentWithAssets.image.url);
  }
  
  return undefined;
}

/**
 * Execute token addition using direct draft mutation
 */
const executeAddToken: ActionExecutionHandler = async (
  request: GameActionRequest, 
  draft: ServerGameStateWithVirtuals,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: AsyncActionContext
): Promise<void> => {
  const params = request.parameters as AddTokenParameters;

  console.log('[AddTokenHandler] Executing token addition with direct draft mutation:', {
    documentId: params.documentId,
    gridPosition: params.gridPosition,
    requestId: request.id
  });

  // Get the document - validation ensures it exists
  const document = draft.documents[params.documentId]!;

  // Get token grid size from plugin
  const tokenGridSize = await getTokenGridSize(document);

  // Get token image URL
  const tokenImage = getTokenImageUrl(document);
  if (!tokenImage) {
    throw new Error('Document must have a token image URL (tokenImage.url, avatar.url, or image.url)');
  }

  // Generate unique token ID
  const tokenId = `token_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // Create token bounds
  const bounds = createTokenBounds(
    params.gridPosition,
    tokenGridSize,
    params.elevation || 0
  );

  // Create token data
  const tokenData = {
    id: tokenId,
    name: document.name,
    imageUrl: tokenImage,
    encounterId: draft.currentEncounter!.id,
    bounds,
    documentId: document.id,
    documentType: document.documentType,
    notes: '',
    isVisible: true,
    isPlayerControlled: document.documentType === 'character',
    data: document.pluginData || {},
    conditions: [],
    version: 1,
    createdBy: request.playerId,
    updatedBy: request.playerId,
    ownerId: document.ownerId || request.playerId
  };

  // Add token to encounter tokens - direct draft mutation
  if (!draft.currentEncounter!.tokens) {
    draft.currentEncounter!.tokens = {};
  }
  draft.currentEncounter!.tokens[tokenId] = tokenData;

  // Add document to encounter participants if not already present
  if (!draft.currentEncounter!.participants) {
    draft.currentEncounter!.participants = [];
  }
  
  const isAlreadyParticipant = draft.currentEncounter!.participants.includes(document.id);
  if (!isAlreadyParticipant) {
    draft.currentEncounter!.participants.push(document.id);
    console.log(`Adding document to encounter participants: ${document.name}`);
  }

  console.log('[AddTokenHandler] Token addition executed with direct draft mutation:', {
    tokenId,
    tokenName: tokenData.name,
    bounds: tokenData.bounds,
    gridPosition: params.gridPosition,
    requestId: request.id
  });
};

/**
 * Core add-token action handler
 */
export const addTokenActionHandler: Omit<ActionHandler, 'pluginId'> = {
  priority: 0, // Core handler runs first
  requiresManualApproval: true, // All token creation requires GM approval
  validate: validateAddToken,
  execute: executeAddToken,
  approvalMessage: async (request) => {
    const params = request.parameters as AddTokenParameters;
    // We need to get the document name for the approval message
    // This is called during validation so we can safely access game state
    return `wants to add a token at grid position (${params.gridPosition.x}, ${params.gridPosition.y})`;
  }
};