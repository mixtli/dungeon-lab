import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../utils/logger.mjs';
import {
  ChatbotConfig,
  ChatRequest,
  ChatResponse,
  ChatErrorResponse,
  HealthStatus,
  ServiceStatus,
  BotCapabilities,
  BotTestResult,
  chatRequestSchema,
  chatResponseSchema,
  botCapabilitiesSchema
} from '@dungeon-lab/shared/types/chatbots.mjs';

export interface ChatbotServiceConfig {
  defaultTimeout: number;
  maxRetries: number;
  retryDelay: number;
  maxConcurrentRequests: number;
}

export class ChatbotService {
  private httpClients: Map<string, AxiosInstance> = new Map();
  private activeRequests: Map<string, number> = new Map();
  private config: ChatbotServiceConfig;

  constructor(config: ChatbotServiceConfig) {
    this.config = config;
  }

  /**
   * Get or create HTTP client for a chatbot
   */
  private getHttpClient(botConfig: ChatbotConfig): AxiosInstance {
    const clientKey = `${botConfig.id}-${botConfig.endpointUrl}`;
    
    if (!this.httpClients.has(clientKey)) {
      const client = axios.create({
        baseURL: botConfig.endpointUrl,
        timeout: this.config.defaultTimeout,
        headers: {
          'Content-Type': 'application/json',
          ...(botConfig.apiKey && { 'Authorization': `Bearer ${botConfig.apiKey}` })
        }
      });

      // Add request interceptor for logging
      client.interceptors.request.use(
        (config) => {
          logger.debug(`Chatbot request: ${config.method?.toUpperCase()} ${config.url}`);
          return config;
        },
        (error) => {
          logger.error('Chatbot request error:', error);
          return Promise.reject(error);
        }
      );

      // Add response interceptor for logging
      client.interceptors.response.use(
        (response) => {
          logger.debug(`Chatbot response: ${response.status} ${response.config.url}`);
          return response;
        },
        (error) => {
          logger.error('Chatbot response error:', error.response?.status, error.message);
          return Promise.reject(error);
        }
      );

      this.httpClients.set(clientKey, client);
    }

    return this.httpClients.get(clientKey)!;
  }

  /**
   * Check if bot has reached concurrent request limit
   */
  private canMakeRequest(botId: string): boolean {
    const activeCount = this.activeRequests.get(botId) || 0;
    return activeCount < this.config.maxConcurrentRequests;
  }

  /**
   * Track active request
   */
  private trackRequest(botId: string): void {
    const current = this.activeRequests.get(botId) || 0;
    this.activeRequests.set(botId, current + 1);
  }

  /**
   * Release active request
   */
  private releaseRequest(botId: string): void {
    const current = this.activeRequests.get(botId) || 0;
    this.activeRequests.set(botId, Math.max(0, current - 1));
  }

  /**
   * Send a chat message to a chatbot with retry logic
   */
  async sendMessage(
    botConfig: ChatbotConfig,
    request: ChatRequest
  ): Promise<ChatResponse | ChatErrorResponse> {
    if (!this.canMakeRequest(botConfig.id)) {
      return {
        success: false,
        error: 'Too many concurrent requests',
        errorCode: 'RATE_LIMITED',
        retryAfter: 30
      };
    }

    // Validate request
    const validationResult = chatRequestSchema.safeParse(request);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid request format',
        errorCode: 'INVALID_REQUEST'
      };
    }

    this.trackRequest(botConfig.id);
    const startTime = Date.now();

    try {
      const client = this.getHttpClient(botConfig);
      const endpoint = request.sessionId ? `/chat/session/${request.sessionId}` : '/chat';
      
      const response = await this.executeWithRetry(async () => {
        return await client.post(endpoint, request);
      });

      const processingTime = Date.now() - startTime;

      // Transform and validate response
      const transformedResponse = {
        response: response.data.response || response.data.message || '',
        success: response.data.success !== false, // Default to true unless explicitly false
        processingTime: response.data.processingTime || processingTime,
        sources: response.data.sources || undefined, // Convert null to undefined
        sessionId: response.data.sessionId || request.sessionId
      };

      // Validate the transformed response
      const responseValidation = chatResponseSchema.safeParse(transformedResponse);
      if (!responseValidation.success) {
        logger.warn('Invalid chatbot response format after transformation:', responseValidation.error);
        logger.debug('Original response data:', response.data);
        logger.debug('Transformed response:', transformedResponse);
        return {
          success: false,
          error: 'Invalid response format from chatbot',
          errorCode: 'INVALID_RESPONSE'
        };
      }

      return transformedResponse;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`Chatbot request failed for bot ${botConfig.id}:`, error);
      
      return this.handleError(error, processingTime);
    } finally {
      this.releaseRequest(botConfig.id);
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.config.maxRetries) {
          throw lastError;
        }

        // Don't retry on client errors (4xx)
        if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
          throw error;
        }

        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        logger.debug(`Retrying chatbot request in ${delay}ms (attempt ${attempt}/${this.config.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Handle errors and convert to standardized error response
   */
  private handleError(error: unknown, _processingTime: number): ChatErrorResponse {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Request timeout',
          errorCode: 'TIMEOUT'
        };
      }

      if (axiosError.response?.status === 429) {
        return {
          success: false,
          error: 'Rate limited',
          errorCode: 'RATE_LIMITED',
          retryAfter: 60
        };
      }

      if (axiosError.response?.status && axiosError.response.status >= 500) {
        return {
          success: false,
          error: 'Service temporarily unavailable',
          errorCode: 'SERVICE_UNAVAILABLE',
          retryAfter: 30
        };
      }

      return {
        success: false,
        error: axiosError.message || 'Request failed',
        errorCode: 'REQUEST_FAILED'
      };
    }

    return {
      success: false,
      error: 'Unknown error occurred',
      errorCode: 'UNKNOWN_ERROR'
    };
  }

  /**
   * Perform health check on a chatbot
   */
  async performHealthCheck(botConfig: ChatbotConfig): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const client = this.getHttpClient(botConfig);
      await client.get('/health');
      
      return {
        healthy: true,
        timestamp: new Date(),
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      logger.warn(`Health check failed for bot ${botConfig.id}:`, error);
      
      return {
        healthy: false,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get detailed service status
   */
  async getServiceStatus(botConfig: ChatbotConfig): Promise<ServiceStatus | null> {
    try {
      const client = this.getHttpClient(botConfig);
      const response = await client.get('/status');
      
      return response.data;
    } catch (error) {
      logger.warn(`Failed to get service status for bot ${botConfig.id}:`, error);
      return null;
    }
  }

  /**
   * Get bot capabilities
   */
  async getBotCapabilities(botConfig: ChatbotConfig): Promise<BotCapabilities | null> {
    try {
      const client = this.getHttpClient(botConfig);
      const response = await client.get('/capabilities');
      
      // Validate capabilities response
      const validation = botCapabilitiesSchema.safeParse(response.data);
      if (!validation.success) {
        logger.warn('Invalid capabilities response format:', validation.error);
        return null;
      }
      
      return response.data;
    } catch (error) {
      logger.warn(`Failed to get capabilities for bot ${botConfig.id}:`, error);
      return null;
    }
  }

  /**
   * Clear session memory for a bot
   */
  async clearSession(botConfig: ChatbotConfig, sessionId: string): Promise<boolean> {
    try {
      const client = this.getHttpClient(botConfig);
      await client.post(`/chat/session/${sessionId}/clear`);
      
      return true;
    } catch (error) {
      logger.warn(`Failed to clear session ${sessionId} for bot ${botConfig.id}:`, error);
      return false;
    }
  }

  /**
   * Test connection to a chatbot
   */
  async testConnection(botConfig: Omit<ChatbotConfig, 'id' | 'createdAt' | 'updatedAt' | 'lastHealthCheck'>): Promise<BotTestResult> {
    const startTime = Date.now();
    
    try {
      // Create temporary config for testing
      const testConfig: ChatbotConfig = {
        ...botConfig,
        id: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const healthStatus = await this.performHealthCheck(testConfig);
      const capabilities = await this.getBotCapabilities(testConfig);
      
      return {
        success: healthStatus.healthy,
        responseTime: Date.now() - startTime,
        capabilities: capabilities || undefined,
        error: healthStatus.error
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.httpClients.clear();
    this.activeRequests.clear();
  }
} 