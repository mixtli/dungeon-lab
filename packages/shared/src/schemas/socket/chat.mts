import { z } from 'zod';
import { gameSessionResponseSchema } from '../game-session.schema.mjs';

// ============================================================================
// CHAT AND MESSAGING SCHEMAS
// ============================================================================

// Mention schema for structured mention data
export const mentionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['user', 'actor', 'bot']),
  participantId: z.string(),
  startIndex: z.number(),
  endIndex: z.number()
});

export const messageParticipantSchema = z.object({
  type: z.enum(['user', 'system', 'actor', 'session', 'bot']),
  id: z.string().optional()
});

export const messageMetadataSchema = z.object({
  sender: messageParticipantSchema,
  recipient: messageParticipantSchema,
  timestamp: z.date().optional(),
  mentions: z.array(mentionSchema).optional()
});

export const joinCallbackSchema = z.object({
  success: z.boolean(),
  data: gameSessionResponseSchema.optional(),
  error: z.string().optional()
});

// ============================================================================
// CHATBOT SCHEMAS
// ============================================================================

export const chatbotTypingSchema = z.object({
  botId: z.string(),
  botName: z.string(),
  sessionId: z.string().optional()
});

export const chatbotTypingStopSchema = z.object({
  botId: z.string(),
  sessionId: z.string().optional()
});

export const chatbotResponseSchema = z.object({
  botId: z.string(),
  botName: z.string(),
  response: z.string(),
  processingTime: z.number(),
  sources: z.array(z.object({
    title: z.string(),
    page: z.number().optional(),
    section: z.string().optional(),
    url: z.string().optional()
  })).optional(),
  sessionId: z.string().optional(),
  messageType: z.enum(['direct', 'mention'])
});

export const chatbotErrorSchema = z.object({
  botId: z.string(),
  botName: z.string(),
  error: z.string(),
  sessionId: z.string().optional(),
  messageType: z.enum(['direct', 'mention'])
});

// ============================================================================
// SESSION SCHEMAS
// ============================================================================

export const userJoinedSessionSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  actorId: z.string().optional()
});

export const userLeftSessionSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  actorIds: z.array(z.string()),
  characterNames: z.array(z.string())
}); 