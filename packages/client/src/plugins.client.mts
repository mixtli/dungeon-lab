import type { IPlugin } from '@dungeon-lab/shared/types/api/plugins.mjs';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';
import { ApiClient } from './api.client.mjs';

/**
 * Client for interacting with the plugins API
 */
export class PluginsClient extends ApiClient {
  /**
   * Get a list of all available plugins
   */
  async getPlugins(): Promise<IPlugin[]> {
    const response = await this.api.get<BaseAPIResponse<IPlugin[]>>('/api/plugins');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get plugins');
    }
    return response.data.data;
  }

  /**
   * Get a specific plugin by ID
   */
  async getPlugin(pluginId: string): Promise<IPlugin | undefined> {
    const response = await this.api.get<BaseAPIResponse<IPlugin>>(`/api/plugins/${pluginId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get plugin');
    }
    return response.data.data;
  }

  /**
   * Get plugin code for a specific file
   */
  async getPluginCode(pluginId: string, fileName: string): Promise<string> {
    const response = await this.api.get<BaseAPIResponse<string>>(
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
}
