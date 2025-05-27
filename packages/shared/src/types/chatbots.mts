import { z } from 'zod';
import {
  messageSourceSchema,
  botCapabilitiesSchema,
  chatRequestSchema,
  chatResponseSchema,
  chatErrorResponseSchema,
  healthStatusSchema,
  serviceStatusSchema,
  chatbotConfigSchema,
  chatbotMessageSchema,
  botRegistrationSchema,
  botUpdateSchema,
  botTestResultSchema
} from '../schemas/chatbots.schema.mjs';

// Chatbot Configuration Types
export interface ChatbotConfig {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  endpointUrl: string;
  apiKey?: string;
  gameSystem: string;
  enabled: boolean;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck?: Date;
  capabilities?: BotCapabilities;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface BotCapabilities {
  name: string;
  description: string;
  version: string;
  gameSystem: string[];
  features: {
    conversationMemory: boolean;
    sourceCitations: boolean;
    streamingResponses: boolean;
  };
  supportedLanguages: string[];
  maxSessionDuration: number;
  rateLimits: {
    requestsPerMinute: number;
    concurrentSessions: number;
  };
}

export interface ChatbotMessage {
  id: string;
  content: string;
  sessionId: string;
  botId: string;
  userId?: string;
  timestamp: Date;
  processingTime?: number;
  sources?: MessageSource[];
}

export interface MessageSource {
  title: string;
  page?: number;
  section?: string;
  url?: string;
}

export interface BotTestResult {
  success: boolean;
  responseTime: number;
  capabilities?: BotCapabilities;
  error?: string;
}

// Chat Request/Response Types
export interface ChatRequest {
  message: string;
  sessionId?: string;
  userId?: string;
  context?: {
    gameSessionId?: string;
    characterLevel?: number;
    characterClass?: string;
    [key: string]: unknown;
  };
}

export interface ChatResponse {
  response: string;
  success: boolean;
  processingTime: number;
  sources?: MessageSource[];
  sessionId?: string;
}

export interface ChatErrorResponse {
  success: false;
  error: string;
  errorCode: string;
  retryAfter?: number;
}

// Health and Status Types
export interface HealthStatus {
  healthy: boolean;
  timestamp: Date;
  responseTime: number;
  error?: string;
}

export interface ServiceStatus {
  name: string;
  version: string;
  healthy: boolean;
  uptime: number;
  capabilities: BotCapabilities;
}

// Bot Management Types
export interface BotRegistration {
  name: string;
  description: string;
  endpointUrl: string;
  apiKey?: string;
  gameSystem: string;
  campaignId: string;
}

export interface BotUpdateData {
  name?: string;
  description?: string;
  endpointUrl?: string;
  apiKey?: string;
  gameSystem?: string;
  enabled?: boolean;
  capabilities?: BotCapabilities;
}

// Re-export schema types for convenience
export type ChatRequestType = z.infer<typeof chatRequestSchema>;
export type ChatResponseType = z.infer<typeof chatResponseSchema>;
export type ChatErrorResponseType = z.infer<typeof chatErrorResponseSchema>;
export type BotCapabilitiesType = z.infer<typeof botCapabilitiesSchema>;
export type ChatbotConfigType = z.infer<typeof chatbotConfigSchema>;
export type ChatbotMessageType = z.infer<typeof chatbotMessageSchema>;
export type BotRegistrationType = z.infer<typeof botRegistrationSchema>;
export type BotUpdateType = z.infer<typeof botUpdateSchema>;
export type BotTestResultType = z.infer<typeof botTestResultSchema>;
export type MessageSourceType = z.infer<typeof messageSourceSchema>;
export type HealthStatusType = z.infer<typeof healthStatusSchema>;
export type ServiceStatusType = z.infer<typeof serviceStatusSchema>;

// Re-export schemas for external use
export {
  messageSourceSchema,
  botCapabilitiesSchema,
  chatRequestSchema,
  chatResponseSchema,
  chatErrorResponseSchema,
  healthStatusSchema,
  serviceStatusSchema,
  chatbotConfigSchema,
  chatbotMessageSchema,
  botRegistrationSchema,
  botUpdateSchema,
  botTestResultSchema
}; 