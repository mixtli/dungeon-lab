import { ApiClient } from './api.client.mjs';
import type {
  ChatbotConfig,
  BotRegistration,
  BotUpdateData,
  BotTestResult,
  BotCapabilities,
  ChatRequest,
  ChatResponse
} from '@dungeon-lab/shared/types/chatbots.mjs';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';

export class ChatbotsClient extends ApiClient {
  /**
   * Get all bots for a specific campaign
   */
  async getCampaignBots(campaignId: string): Promise<ChatbotConfig[]> {
    const response = await this.api.get<ChatbotConfig[]>(
      `/api/bots?campaignId=${encodeURIComponent(campaignId)}`
    );
    return response.data;
  }

  /**
   * Create a new bot
   */
  async createBot(botData: BotRegistration): Promise<ChatbotConfig> {
    const response = await this.api.post<ChatbotConfig>(
      `/api/bots`,
      botData
    );
    return response.data;
  }

  /**
   * Delete a bot
   */
  async deleteBot(botId: string): Promise<void> {
    await this.api.delete(`/api/bots/${botId}`);
  }

  /**
   * Get a specific bot by ID
   */
  async getBot(botId: string): Promise<ChatbotConfig> {
    const response = await this.api.get<BaseAPIResponse<ChatbotConfig>>(`/api/bots/${botId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get bot');
    }
    if (!response.data.data) {
      throw new Error('Bot not found');
    }
    return response.data.data;
  }

  /**
   * Update a bot configuration
   */
  async updateBot(botId: string, updateData: BotUpdateData): Promise<ChatbotConfig> {
    const response = await this.api.put<BaseAPIResponse<ChatbotConfig>>(
      `/api/bots/${botId}`,
      updateData
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update bot');
    }
    if (!response.data.data) {
      throw new Error('Failed to update bot');
    }
    return response.data.data;
  }

  /**
   * Send a message to a bot
   */
  async sendMessage(botId: string, request: ChatRequest): Promise<ChatResponse> {
    const response = await this.api.post<BaseAPIResponse<ChatResponse>>(
      `/api/bots/${botId}/chat`,
      request
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to send message to bot');
    }
    if (!response.data.data) {
      throw new Error('Failed to send message to bot');
    }
    return response.data.data;
  }

  /**
   * Clear a bot's session memory
   */
  async clearBotSession(botId: string, sessionId: string): Promise<void> {
    const response = await this.api.post<BaseAPIResponse<{ success: boolean }>>(
      `/api/bots/${botId}/sessions/${sessionId}/clear`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to clear bot session');
    }
  }

  /**
   * Get bot health status
   */
  async getBotHealth(botId: string): Promise<{
    healthy: boolean;
    timestamp: Date;
    responseTime: number;
    error?: string;
  }> {
    const response = await this.api.get<BaseAPIResponse<{
      healthy: boolean;
      timestamp: Date;
      responseTime: number;
      error?: string;
    }>>(`/api/bots/${botId}/health`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get bot health');
    }
    if (!response.data.data) {
      throw new Error('Failed to get bot health');
    }
    return response.data.data;
  }

  /**
   * Get bot capabilities
   */
  async getBotCapabilities(botId: string): Promise<BotCapabilities> {
    const response = await this.api.get<BaseAPIResponse<BotCapabilities>>(
      `/api/bots/${botId}/capabilities`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get bot capabilities');
    }
    if (!response.data.data) {
      throw new Error('Failed to get bot capabilities');
    }
    return response.data.data;
  }

  /**
   * Test a bot connection
   */
  async testBot(botConfig: {
    name: string;
    description: string;
    endpointUrl: string;
    apiKey?: string;
    gameSystem: string;
    enabled: boolean;
    healthStatus: 'healthy' | 'unhealthy' | 'unknown';
    createdBy: string;
  }): Promise<BotTestResult> {
    const response = await this.api.post<BaseAPIResponse<BotTestResult>>(
      '/api/bots/test',
      botConfig
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to test bot');
    }
    if (!response.data.data) {
      throw new Error('Failed to test bot');
    }
    return response.data.data;
  }

  /**
   * Get all bots (admin only)
   */
  async getAllBots(): Promise<ChatbotConfig[]> {
    const response = await this.api.get<BaseAPIResponse<ChatbotConfig[]>>('/api/bots');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get all bots');
    }
    return response.data.data;
  }
} 