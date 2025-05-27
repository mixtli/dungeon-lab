import mongoose, { ObjectId } from 'mongoose';
import { ChatbotConfig } from '@dungeon-lab/shared/types/chatbots.mjs';
import { baseMongooseZodSchema } from '../../models/base.model.schema.mjs';
import { createMongoSchema } from '../../models/zod-to-mongo.mjs';
import { zId } from '@zodyac/zod-mongoose';
import { z } from '../../utils/zod.mjs';

// Define the Mongoose schema for chatbots
const chatbotSchemaMongoose = z.object({
  campaignId: zId('Campaign'),
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  endpointUrl: z.string().url(),
  apiKey: z.string().optional(),
  gameSystem: z.string().min(1).max(100),
  enabled: z.boolean().default(true),
  healthStatus: z.enum(['healthy', 'unhealthy', 'unknown']).default('unknown'),
  lastHealthCheck: z.date().optional(),
  capabilities: z.object({
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
  }).optional(),
  createdBy: zId('User'),
  updatedBy: zId('User')
}).merge(baseMongooseZodSchema);

const mongooseSchema = createMongoSchema<ChatbotConfig>(chatbotSchemaMongoose);

// Transform ObjectId fields for proper serialization
mongooseSchema.path('campaignId').set(function (value: string) {
  return new mongoose.Types.ObjectId(value);
});
mongooseSchema.path('campaignId').get(function (value: ObjectId) {
  return value.toString();
});

mongooseSchema.path('createdBy').set(function (value: string) {
  return new mongoose.Types.ObjectId(value);
});
mongooseSchema.path('createdBy').get(function (value: ObjectId) {
  return value.toString();
});

mongooseSchema.path('updatedBy').set(function (value: string) {
  return new mongoose.Types.ObjectId(value);
});
mongooseSchema.path('updatedBy').get(function (value: ObjectId) {
  return value.toString();
});

// Add virtual for campaign reference
mongooseSchema.virtual('campaign', {
  ref: 'Campaign',
  localField: 'campaignId',
  foreignField: '_id',
  justOne: true
});

// Add virtual for creator reference
mongooseSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true
});

// Add virtual for updater reference
mongooseSchema.virtual('updater', {
  ref: 'User',
  localField: 'updatedBy',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
mongooseSchema.set('toJSON', { virtuals: true });
mongooseSchema.set('toObject', { virtuals: true });

// Add indexes for performance
mongooseSchema.index({ campaignId: 1 }); // Query bots by campaign
mongooseSchema.index({ enabled: 1 }); // Query enabled bots
mongooseSchema.index({ healthStatus: 1 }); // Query by health status
mongooseSchema.index({ campaignId: 1, enabled: 1 }); // Compound index for active bots per campaign
mongooseSchema.index({ gameSystem: 1 }); // Query by game system
mongooseSchema.index({ createdBy: 1 }); // Query bots by creator
mongooseSchema.index({ lastHealthCheck: 1 }); // Query by last health check for monitoring

export const ChatbotModel = mongoose.model<ChatbotConfig>('Chatbot', mongooseSchema); 