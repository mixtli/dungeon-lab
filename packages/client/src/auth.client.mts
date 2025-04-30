import { ApiClient } from './api.client.mjs';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  LogoutResponse,
  GetCurrentUserResponse,
  GetApiKeyResponse
} from '@dungeon-lab/shared/types/api/authentication.mjs';
import type { IUser } from '@dungeon-lab/shared/types/index.mjs';

export class AuthClient extends ApiClient {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.api.post<LoginResponse>('/api/auth/login', data);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await this.api.post<RegisterResponse>('/api/auth/register', data);
    return response.data;
  }

  async logout(): Promise<LogoutResponse> {
    const response = await this.api.post<LogoutResponse>('/api/auth/logout');
    return response.data;
  }

  async getCurrentUser(): Promise<IUser> {
    const response = await this.api.get<GetCurrentUserResponse>('/api/auth/me');
    if (!response.data.success || !response.data.data) {
      throw new Error('Failed to get current user');
    }
    return response.data.data;
  }

  async getApiKey(): Promise<GetApiKeyResponse> {
    const response = await this.api.get<GetApiKeyResponse>('/api/auth/api-key');
    return response.data;
  }

  async updateUser(data: Partial<IUser>): Promise<IUser> {
    const response = await this.api.patch<IUser>('/api/auth/me', data);
    return response.data;
  }
}
