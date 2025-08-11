import { Socket } from 'socket.io';
import { logger } from '../../utils/logger.mjs';
import { BotManager } from './bot-manager.mjs';
import { ChatbotService } from './service.mjs';
import { GameSessionModel } from '../campaigns/models/game-session.model.mjs';
import {
  ChatRequest,
  ChatbotConfig,
  ChatResponse,
  ChatErrorResponse
} from '@dungeon-lab/shared/types/chatbots.mjs';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ChatMetadata
} from '@dungeon-lab/shared/types/socket/index.mjs';

export class ChatbotChatHandler {
  private botManager: BotManager;
  private chatbotService: ChatbotService;

  constructor(botManager: BotManager) {
    this.botManager = botManager;
    this.chatbotService = botManager.getChatbotService();
  }

  /**
   * Handle incoming chat messages and process them for chatbot interactions
   */
  async handleMessage(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    metadata: ChatMetadata,
    message: string
  ): Promise<void> {
    try {
      // Get session context for campaign-specific bots
      const sessionId = socket.gameSessionId;
      if (!sessionId) {
        // No session context, skip chatbot processing
        return;
      }

      const session = await GameSessionModel.findById(sessionId).exec();
      if (!session) {
        logger.warn('Session not found for chatbot processing:', sessionId);
        return;
      }

      const campaignId = session.campaignId.toString();

      // Load campaign-specific bots
      const campaignBots = await this.botManager.loadBotsForCampaign(campaignId);
      if (campaignBots.length === 0) {
        // No bots configured for this campaign
        return;
      }

      // Check for direct messages to chatbots
      const directMessageBot = this.detectDirectMessage(metadata, campaignBots);
      if (directMessageBot) {
        await this.processBotMessage(socket, directMessageBot, message, metadata, 'direct');
        return;
      }

      // Check for mentions in group messages
      const mentionedBots = this.detectMentions(metadata.mentions, campaignBots);
      for (const bot of mentionedBots) {
        await this.processBotMessage(socket, bot, message, metadata, 'mention');
      }

    } catch (error) {
      logger.error('Error in chatbot message handling:', error);
      // Don't throw - we don't want to break the chat system
    }
  }

  /**
   * Detect if a message is a direct message to a chatbot
   */
  private detectDirectMessage(metadata: ChatMetadata, bots: ChatbotConfig[]): ChatbotConfig | null {
    const recipient = metadata.recipient;
    
    // Check if this is a direct message to a bot
    if (recipient.type === 'bot' && recipient.id) {
      // Look for a bot with matching ID or name
      return bots.find(bot => 
        bot.id === recipient.id || 
        bot.name.toLowerCase() === recipient.id!.toLowerCase()
      ) || null;
    }

    return null;
  }

  /**
   * Detect mentions of chatbots using structured mention data
   */
  private detectMentions(mentions: Array<{type: string; participantId: string; name: string}> | undefined, bots: ChatbotConfig[]): ChatbotConfig[] {
    if (!mentions || mentions.length === 0) {
      return [];
    }

    const mentionedBots: ChatbotConfig[] = [];
    
    for (const mention of mentions) {
      if (mention.type === 'bot') {
        // Find the bot by ID or name
        const bot = bots.find(b => 
          b.id === mention.participantId || 
          b.name.toLowerCase() === mention.name.toLowerCase()
        );
        
        if (bot && !mentionedBots.includes(bot)) {
          mentionedBots.push(bot);
        }
      }
    }
    
    return mentionedBots;
  }

  /**
   * Process a message for a specific bot
   */
  private async processBotMessage(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    bot: ChatbotConfig,
    message: string,
    metadata: ChatMetadata,
    messageType: 'direct' | 'mention'
  ): Promise<void> {
    const sessionId = socket.gameSessionId;
    const userId = socket.userId;

    if (!sessionId || !userId) {
      logger.warn('Missing session or user context for bot message processing');
      return;
    }

    try {
      // Check if bot is healthy
      if (!this.botManager.isBotHealthy(bot.id)) {
        await this.sendErrorResponse(socket, bot, metadata, messageType, 
          "I'm currently unavailable. Please try again in a few moments.");
        return;
      }

      // Show typing indicator
      await this.showTypingIndicator(socket, bot, metadata, messageType);

      // Clean message for mentions (remove the @mention part)
      let cleanMessage = message;
      if (messageType === 'mention') {
        cleanMessage = this.cleanMentionFromMessage(message, bot);
      }

      // Prepare chat request
      const chatRequest: ChatRequest = {
        message: cleanMessage,
        sessionId: sessionId,
        userId: userId,
        context: {
          gameSessionId: sessionId,
          messageType: messageType,
          timestamp: new Date().toISOString()
        }
      };

      // Send message to bot
      const response = await this.chatbotService.sendMessage(bot, chatRequest);

      // Hide typing indicator
      await this.hideTypingIndicator(socket, bot, metadata, messageType);

      // Handle response
      if (response.success) {
        await this.sendBotResponse(socket, bot, response as ChatResponse, metadata, messageType);
      } else {
        await this.sendErrorResponse(socket, bot, metadata, messageType, 
          (response as ChatErrorResponse).error || 'Failed to process your request.');
      }

    } catch (error) {
      logger.error(`Error processing bot message for ${bot.name}:`, error);
      
      // Hide typing indicator on error
      await this.hideTypingIndicator(socket, bot, metadata, messageType);
      
      // Send error response
      await this.sendErrorResponse(socket, bot, metadata, messageType,
        'I encountered an error processing your request. Please try again.');
    }
  }

  /**
   * Clean @mention from message text
   */
  private cleanMentionFromMessage(message: string, bot: ChatbotConfig): string {
    const botNameLower = bot.name.toLowerCase();
    const mentionPatterns = [
      new RegExp(`@${botNameLower}\\s*`, 'gi'),
      new RegExp(`@${botNameLower.replace(/\s+/g, '')}\\s*`, 'gi'),
      new RegExp(`@${botNameLower.replace(/\s+/g, '-')}\\s*`, 'gi'),
      new RegExp(`@${botNameLower.replace(/\s+/g, '_')}\\s*`, 'gi'),
    ];

    let cleanMessage = message;
    for (const pattern of mentionPatterns) {
      cleanMessage = cleanMessage.replace(pattern, '');
    }

    return cleanMessage.trim();
  }

  /**
   * Show typing indicator for bot
   */
  private async showTypingIndicator(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    bot: ChatbotConfig,
    metadata: ChatMetadata,
    messageType: 'direct' | 'mention'
  ): Promise<void> {
    try {
      if (messageType === 'direct') {
        // For direct messages, send typing indicator to the sender
        socket.emit('chatbot:typing', { 
          botId: bot.id, 
          botName: bot.name,
          sessionId: socket.gameSessionId || ''
        });
      } else {
        // For mentions, send typing indicator to the room
        const roomName = `${metadata.recipient.type}:${metadata.recipient.id}`;
        socket.to(roomName).emit('chatbot:typing', { 
          botId: bot.id, 
          botName: bot.name,
          sessionId: socket.gameSessionId || ''
        });
        socket.emit('chatbot:typing', { 
          botId: bot.id, 
          botName: bot.name,
          sessionId: socket.gameSessionId || ''
        });
      }
    } catch (error) {
      logger.warn('Error showing typing indicator:', error);
    }
  }

  /**
   * Hide typing indicator for bot
   */
  private async hideTypingIndicator(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    bot: ChatbotConfig,
    metadata: ChatMetadata,
    messageType: 'direct' | 'mention'
  ): Promise<void> {
    try {
      if (messageType === 'direct') {
        // For direct messages, send stop typing to the sender
        socket.emit('chatbot:typing-stop', { 
          botId: bot.id, 
          sessionId: socket.gameSessionId || ''
        });
      } else {
        // For mentions, send stop typing to the room
        const roomName = `${metadata.recipient.type}:${metadata.recipient.id || ''}`;
        socket.to(roomName).emit('chatbot:typing-stop', { 
          botId: bot.id, 
          sessionId: socket.gameSessionId || ''
        });
        socket.emit('chatbot:typing-stop', { 
          botId: bot.id, 
          sessionId: socket.gameSessionId || ''
        });
      }
    } catch (error) {
      logger.warn('Error hiding typing indicator:', error);
    }
  }

  /**
   * Send bot response to appropriate recipients
   */
  private async sendBotResponse(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    bot: ChatbotConfig,
    response: ChatResponse,
    originalMetadata: ChatMetadata,
    messageType: 'direct' | 'mention'
  ): Promise<void> {
    try {
      // Create response metadata
      const responseMetadata: ChatMetadata = {
        sender: {
          id: bot.id,
          type: 'bot'
        },
        recipient: messageType === 'direct' ? 
          originalMetadata.sender : // Reply to sender for direct messages
          originalMetadata.recipient, // Reply to room for mentions
        timestamp: new Date().toISOString()
      };

      if (messageType === 'direct') {
        // For direct messages, send response back to the sender privately
        socket.emit('chat', responseMetadata, response.response);
      } else {
        // For mentions, send response to the room
        const roomName = `${originalMetadata.recipient.type}:${originalMetadata.recipient.id}`;
        socket.to(roomName).emit('chat', responseMetadata, response.response);
        socket.emit('chat', responseMetadata, response.response);
      }

      // Emit bot response event with additional metadata
      const botResponseData = {
        botId: bot.id,
        botName: bot.name,
        response: response.response,
        processingTime: response.processingTime,
        sources: response.sources,
        sessionId: response.sessionId || socket.gameSessionId,
        messageType
      };

      if (messageType === 'direct') {
        socket.emit('chatbot:response', botResponseData);
      } else {
        const roomName = `${originalMetadata.recipient.type}:${originalMetadata.recipient.id}`;
        socket.to(roomName).emit('chatbot:response', botResponseData);
        socket.emit('chatbot:response', botResponseData);
      }

    } catch (error) {
      logger.error('Error sending bot response:', error);
    }
  }

  /**
   * Send error response when bot processing fails
   */
  private async sendErrorResponse(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    bot: ChatbotConfig,
    originalMetadata: ChatMetadata,
    messageType: 'direct' | 'mention',
    errorMessage: string
  ): Promise<void> {
    try {
      // Create error response metadata
      const responseMetadata: ChatMetadata = {
        sender: {
          id: bot.id,
          type: 'bot'
        },
        recipient: messageType === 'direct' ? 
          originalMetadata.sender : // Reply to sender for direct messages
          originalMetadata.recipient, // Reply to room for mentions
        timestamp: new Date().toISOString()
      };

      const errorResponseText = `⚠️ ${errorMessage}`;

      if (messageType === 'direct') {
        // For direct messages, send error back to the sender privately
        socket.emit('chat', responseMetadata, errorResponseText);
      } else {
        // For mentions, send error to the room
        const roomName = `${originalMetadata.recipient.type}:${originalMetadata.recipient.id}`;
        socket.to(roomName).emit('chat', responseMetadata, errorResponseText);
        socket.emit('chat', responseMetadata, errorResponseText);
      }

      // Emit error event
      const errorData = {
        botId: bot.id,
        botName: bot.name,
        error: errorMessage,
        sessionId: socket.gameSessionId,
        messageType
      };

      if (messageType === 'direct') {
        socket.emit('chatbot:error', errorData);
      } else {
        const roomName = `${originalMetadata.recipient.type}:${originalMetadata.recipient.id}`;
        socket.to(roomName).emit('chatbot:error', errorData);
        socket.emit('chatbot:error', errorData);
      }

    } catch (error) {
      logger.error('Error sending bot error response:', error);
    }
  }
} 