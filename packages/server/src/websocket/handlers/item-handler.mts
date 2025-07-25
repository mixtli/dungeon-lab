import '../../types/socket-io.d.ts';
import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../handler-registry.mjs';
import { ItemService, QueryValue } from '../../features/items/services/item.service.mjs';
import { GameSessionModel } from '../../features/campaigns/models/game-session.model.mjs';
import type { ClientToServerEvents, ServerToClientEvents } from '@dungeon-lab/shared/types/socket/index.mjs';

/**
 * Socket handler for item operations
 * @param socket The client socket connection
 */
function itemHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  const itemService = new ItemService();

  console.log('[Item Handler] Registering item socket handlers for socket:', socket.id);

  // Get list of items filtered by game system and user permissions
  socket.on('item:list', async (filters, callback) => {
    try {
      console.log('[Item Handler] item:list request from user:', socket.userId, 'filters:', filters);
      
      if (!socket.userId) {
        callback({ success: false, error: 'User not authenticated' });
        return;
      }

      const pluginId = filters?.pluginId;
      if (!pluginId) {
        callback({ success: false, error: 'Plugin ID is required' });
        return;
      }

      // Check if user is GM for current session
      let isGM = false;
      if (socket.gameSessionId) {
        const gameSession = await GameSessionModel.findById(socket.gameSessionId);
        isGM = gameSession?.gameMasterId?.toString() === socket.userId;
      }

      // Build search query
      const searchQuery: Record<string, QueryValue> = {
        pluginId: pluginId
      };

      if (isGM) {
        // GM gets all items for the plugin
        console.log(`[Item Handler] User ${socket.userId} is GM, fetching all items for plugin ${pluginId}`);
      } else {
        // Regular users only get items they created
        searchQuery.createdBy = socket.userId;
        console.log(`[Item Handler] User ${socket.userId} is not GM, fetching only their items for plugin ${pluginId}`);
      }

      const items = await itemService.searchItems(searchQuery);
      console.log(`[Item Handler] Found ${items.length} items for user ${socket.userId}`);
      
      callback({ success: true, data: items });
    } catch (error) {
      console.error('[Item Handler] Error in item:list:', error);
      callback({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch items' 
      });
    }
  });

  // Get single item
  socket.on('item:get', async (itemId, callback) => {
    try {
      console.log('[Item Handler] item:get request for item:', itemId, 'from user:', socket.userId);
      
      if (!socket.userId) {
        callback({ success: false, error: 'User not authenticated' });
        return;
      }

      const item = await itemService.getItemById(itemId);
      
      // Check permissions
      const hasPermission = await itemService.checkUserPermission(itemId, socket.userId, false);
      if (!hasPermission) {
        callback({ success: false, error: 'Permission denied' });
        return;
      }
      
      callback({ success: true, data: item });
    } catch (error) {
      console.error('[Item Handler] Error in item:get:', error);
      callback({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch item' 
      });
    }
  });

  // Create new item
  socket.on('item:create', async (itemData, callback) => {
    try {
      console.log('[Item Handler] item:create request from user:', socket.userId, 'data:', itemData);
      
      if (!socket.userId) {
        callback({ success: false, error: 'User not authenticated' });
        return;
      }

      // Ensure required fields are present
      const completeItemData = {
        ...itemData,
        documentType: 'item' as const,
        userData: (itemData as Record<string, unknown>).userData as Record<string, unknown> || {},
        pluginData: (itemData as Record<string, unknown>).pluginData as Record<string, unknown> || {}
      };
      const item = await itemService.createItem(completeItemData, socket.userId);
      console.log('[Item Handler] Created item:', item.id);
      
      // Broadcast to other users who can see this item
      // For now, broadcast to all users in the same campaigns
      socket.broadcast.emit('item:created', item);
      
      callback({ success: true, data: item });
    } catch (error) {
      console.error('[Item Handler] Error in item:create:', error);
      callback({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create item' 
      });
    }
  });

  // Update existing item
  socket.on('item:update', async (updateData, callback) => {
    try {
      console.log('[Item Handler] item:update request from user:', socket.userId, 'data:', updateData);
      
      if (!socket.userId) {
        callback({ success: false, error: 'User not authenticated' });
        return;
      }

      const { id, ...patchData } = updateData;

      const item = await itemService.patchItem(id, patchData, socket.userId);
      console.log('[Item Handler] Updated item:', item.id);
      
      // Broadcast update to other users
      socket.broadcast.emit('item:updated', item);
      
      callback({ success: true, data: item });
    } catch (error) {
      console.error('[Item Handler] Error in item:update:', error);
      callback({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update item' 
      });
    }
  });

  // Delete item
  socket.on('item:delete', async (itemId, callback) => {
    try {
      console.log('[Item Handler] item:delete request for item:', itemId, 'from user:', socket.userId);
      
      if (!socket.userId) {
        callback({ success: false, error: 'User not authenticated' });
        return;
      }

      await itemService.deleteItem(itemId);
      console.log('[Item Handler] Deleted item:', itemId);
      
      // Broadcast deletion to other users
      socket.broadcast.emit('item:deleted', itemId);
      
      callback({ success: true });
    } catch (error) {
      console.error('[Item Handler] Error in item:delete:', error);
      callback({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete item' 
      });
    }
  });

  console.log('[Item Handler] Item socket handlers registered successfully');
}

// Register the socket handler
socketHandlerRegistry.register(itemHandler);

export default itemHandler;