import { z } from '../lib/zod.mjs';
import { zId } from '@zodyac/zod-mongoose';
import type { ApiFields } from '../types/api-fields.mjs';

// Invite Status enum
export const InviteStatus = z.enum(['pending', 'accepted', 'declined', 'expired']);

// Base Invite schema
export const inviteSchema = z.object({
  campaignId: zId('Campaign'),
  email: z.string().email(),
  status: InviteStatus.default('pending'),
  expiresAt: z.date().optional(),
  createdBy: zId('User'),
  updatedBy: zId('User'),
});

// Create data schema (omits auto-generated fields)
export const inviteCreateSchema = inviteSchema.omit({
  createdBy: true,
  updatedBy: true,
  status: true,
  expiresAt: true,
});

// Update data schema (makes all fields optional except updatedBy)
export const inviteUpdateSchema = inviteSchema
  .omit({
    createdBy: true,
    campaignId: true,
  })
  .partial()
  .extend({
    updatedBy: z.string(),
  });

// Export types generated from the schemas
export type IInvite = z.infer<typeof inviteSchema> & ApiFields;
export type IInviteCreateData = z.infer<typeof inviteCreateSchema>;
export type IInviteUpdateData = z.infer<typeof inviteUpdateSchema>; 