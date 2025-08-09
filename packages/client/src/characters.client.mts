import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';
import { ApiClient } from './api.client.mjs';

export interface GenerateImageResponse {
  message: string;
  characterId: string;
  imageType: string;
}

export interface GenerateImageRequest {
  imageType: 'avatar' | 'token';
  customPrompt?: string;
}

export class CharactersClient extends ApiClient {
  /**
   * Generate an AI image for a character
   */
  async generateImage(
    characterId: string, 
    request: GenerateImageRequest
  ): Promise<GenerateImageResponse> {
    const response = await this.api.post<BaseAPIResponse<GenerateImageResponse>>(
      `/api/characters/${characterId}/generate-image`, 
      request
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to generate image');
    }
    return response.data.data;
  }

  /**
   * Generate an AI avatar for a character (convenience method)
   */
  async generateAvatar(
    characterId: string, 
    customPrompt?: string
  ): Promise<GenerateImageResponse> {
    const response = await this.api.post<BaseAPIResponse<GenerateImageResponse>>(
      `/api/characters/${characterId}/generate-avatar`,
      customPrompt ? { customPrompt } : {}
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to generate avatar');
    }
    return response.data.data;
  }

  /**
   * Generate an AI token for a character (convenience method)
   */
  async generateToken(
    characterId: string, 
    customPrompt?: string
  ): Promise<GenerateImageResponse> {
    const response = await this.api.post<BaseAPIResponse<GenerateImageResponse>>(
      `/api/characters/${characterId}/generate-token`,
      customPrompt ? { customPrompt } : {}
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to generate token');
    }
    return response.data.data;
  }
}