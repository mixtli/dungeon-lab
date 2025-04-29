import type { IPlugin } from '@dungeon-lab/shared/types/api/plugins.mjs';
import {
  GetPluginsResponse,
  GetPluginResponse,
  GetPluginCodeResponse
} from '@dungeon-lab/shared/types/api/index.mjs';
import api from './api.client.mjs';

/**
 * Get a list of all available plugins
 */
export async function getPlugins(): Promise<IPlugin[]> {
  const response = await api.get<GetPluginsResponse>('/api/plugins');
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get plugins');
  }
  return response.data.data;
}

/**
 * Get a specific plugin by ID
 */
export async function getPlugin(pluginId: string): Promise<IPlugin | undefined> {
  const response = await api.get<GetPluginResponse>(`/api/plugins/${pluginId}`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get plugin');
  }
  return response.data.data;
}

/**
 * Get plugin code for a specific file
 */
export async function getPluginCode(pluginId: string, fileName: string): Promise<string> {
  const response = await api.get<GetPluginCodeResponse>(
    `/api/plugins/${pluginId}/code/${fileName}`
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get plugin code');
  }

  if (!response.data.data) {
    throw new Error('No plugin code returned');
  }

  return response.data.data;
}
