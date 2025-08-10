import { z } from 'zod';

// Message Source schema
export const messageSourceSchema = z.object({
  title: z.string(),
  page: z.number().optional(),
  section: z.string().optional(),
  url: z.string().optional()
});

// Bot Capabilities schema
export const botCapabilitiesSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  gameSystem: z.array(z.string()),
  features: z.object({
    conversationMemory: z.boolean(),
    sourceCitations: z.boolean(),
    streamingResponses: z.boolean()
  }),
  supportedLanguages: z.array(z.string()),
  maxSessionDuration: z.number(),
  rateLimits: z.object({
    requestsPerMinute: z.number(),
    concurrentSessions: z.number()
  })
});

// Chat Request schema
export const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  context: z.record(z.unknown()).optional()
});

// Chat Response schema
export const chatResponseSchema = z.object({
  response: z.string(),
  success: z.boolean(),
  processingTime: z.number(),
  sources: z.array(messageSourceSchema).optional(),
  sessionId: z.string().optional()
});

// Chat Error Response schema
export const chatErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  errorCode: z.string(),
  retryAfter: z.number().optional()
});

// Health Status schema
export const healthStatusSchema = z.object({
  healthy: z.boolean(),
  timestamp: z.string(),
  responseTime: z.number(),
  error: z.string().optional()
});

// Service Status schema
export const serviceStatusSchema = z.object({
  name: z.string(),
  version: z.string(),
  healthy: z.boolean(),
  uptime: z.number(),
  capabilities: botCapabilitiesSchema
});

// Chatbot Configuration schema
export const chatbotConfigSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  endpointUrl: z.string().url(),
  apiKey: z.string().optional(),
  gameSystem: z.string().min(1).max(100),
  enabled: z.boolean(),
  healthStatus: z.enum(['healthy', 'unhealthy', 'unknown']),
  lastHealthCheck: z.string().optional(),
  capabilities: botCapabilitiesSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string()
});

// Chatbot Message schema
export const chatbotMessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  sessionId: z.string(),
  botId: z.string(),
  userId: z.string().optional(),
  timestamp: z.string(),
  processingTime: z.number().optional(),
  sources: z.array(messageSourceSchema).optional()
});

// Bot Registration schema
export const botRegistrationSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  endpointUrl: z.string().url(),
  apiKey: z.string().optional(),
  gameSystem: z.string().min(1).max(100),
  campaignId: z.string()
});

// Bot Update schema
export const botUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  endpointUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  gameSystem: z.string().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  capabilities: botCapabilitiesSchema.optional()
});

// Bot Test Result schema
export const botTestResultSchema = z.object({
  success: z.boolean(),
  responseTime: z.number(),
  capabilities: botCapabilitiesSchema.optional(),
  error: z.string().optional()
});

// Type exports for Zod schemas
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