import { z } from 'zod';
import { gameSessionSchema } from '../game-session.schema.mjs';

const joinCallbackSchema = z.object({
  success: z.boolean(),
  data: gameSessionSchema.optional(),
  error: z.string().optional()
});

export const serverToClientEvents = z.object({
  chat: z.function().args(z.string()).returns(z.void()),
  error: z.function().args(z.string()).returns(z.void())
});

export const clientToServerEvents = z.object({
  chat: z.function().args(z.string()).returns(z.void()),
  joinSession: z
    .function()
    .args(z.string(), z.function().args(joinCallbackSchema))
    .returns(z.void()),
  leaveSession: z.function().args(z.string()).returns(z.void())
});

export type JoinCallback = z.infer<typeof joinCallbackSchema>;
export type ServerToClientEvents = z.infer<typeof serverToClientEvents>;
export type ClientToServerEvents = z.infer<typeof clientToServerEvents>;
