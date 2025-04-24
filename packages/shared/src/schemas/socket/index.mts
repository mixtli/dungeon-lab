import { z } from 'zod';

const messageSchema = z.string();
export const serverToClientEvents = z.object({
  chat: z.function().args(messageSchema).returns(z.void())
});

export const clientToServerEvents = z.object({
  chat: z.function().args(z.string(), z.string(), z.string(), z.string()).returns(z.void()),
  joinSession: z.function().args(z.string()).returns(z.void())
});

export type ServerToClientEvents = z.infer<typeof serverToClientEvents>;
export type ClientToServerEvents = z.infer<typeof clientToServerEvents>;

export interface SocketData {
  name: string;
  age: number;
}
export interface InterServerEvents {
  ping: () => void;
}
