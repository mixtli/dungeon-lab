import { z } from 'zod';
import * as socketTypes from '../../schemas/socket/index.mjs';

export type JoinCallback = z.infer<typeof socketTypes.joinCallbackSchema>;
export type PluginActionCallback = z.infer<typeof socketTypes.pluginActionCallbackSchema>;
export type MapGenerationResponse = z.infer<typeof socketTypes.mapGenerationResponseSchema>;
export type MapEditResponse = z.infer<typeof socketTypes.mapEditResponseSchema>;
export type ServerToClientEvents = z.infer<typeof socketTypes.serverToClientEvents>;
export type ClientToServerEvents = z.infer<typeof socketTypes.clientToServerEvents>;
