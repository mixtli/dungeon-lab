import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
// Invite Status enum
export const InviteStatus = z.enum(['pending', 'accepted', 'declined', 'expired']);

// Base Invite schema
export const inviteSchema = baseSchema.extend({
  campaignId: z.string(),
  email: z.string().email(),
  status: InviteStatus.default('pending'),
  expiresAt: z.date().optional(),
});

// Create data schema (omits auto-generated fields)
// export const inviteCreateSchema = inviteSchema.omit({
//   id: true,
//   createdBy: true,
//   updatedBy: true,
//   status: true,
//   expiresAt: true,
// });

// // Update data schema (makes all fields optional except updatedBy)
// export const inviteUpdateSchema = inviteSchema
//   .omit({
//     id: true,
//     createdBy: true,
//     campaignId: true,
//   })
//   .partial()
//   .extend({
//     updatedBy: z.string(),
//   });

// Export types generated from the schemas
export type IInvite = z.infer<typeof inviteSchema>;
// export type IInviteCreateData = z.infer<typeof inviteCreateSchema>;
// export type IInviteUpdateData = z.infer<typeof inviteUpdateSchema>; 