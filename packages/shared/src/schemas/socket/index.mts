import { z } from 'zod';
import { gameSessionSchema } from '../game-session.schema.mjs';

const messageSchema = z.string();
export const serverToClientEvents = z.object({
  chat: z.function().args(messageSchema).returns(z.void()),
  error: z.function().args(z.string()).returns(z.void())
});

const joinCallbackSchema = z.object({
  success: z.boolean(),
  data: gameSessionSchema.optional(),
  error: z.string().optional()
});

export const clientToServerEvents = z.object({
  chat: z.function().args(z.string(), z.string(), z.string(), z.string()).returns(z.void()),
  joinSession: z
    .function()
    .args(z.string(), z.function().args(joinCallbackSchema))
    .returns(z.void()),
  leaveSession: z.function().args(z.string()).returns(z.void())
});

export type JoinCallback = z.infer<typeof joinCallbackSchema>;
export type ServerToClientEvents = z.infer<typeof serverToClientEvents>;
export type ClientToServerEvents = z.infer<typeof clientToServerEvents>;

export interface SocketData {
  name: string;
  age: number;
}
export interface InterServerEvents {
  ping: () => void;
}
