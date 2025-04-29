import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  LogoutResponse,
  GetCurrentUserResponse,
  GetApiKeyResponse
} from '@dungeon-lab/shared/types/api/authentication.mjs';
import api from './api.client.mjs';
import type { IUser } from '@dungeon-lab/shared/index.mjs';

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/api/auth/login', data);
  return response.data;
}

export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  const response = await api.post<RegisterResponse>('/api/auth/register', data);
  return response.data;
}

export async function logout(): Promise<LogoutResponse> {
  const response = await api.post<LogoutResponse>('/api/auth/logout');
  return response.data;
}

export async function getCurrentUser(): Promise<IUser> {
  const response = await api.get<GetCurrentUserResponse>('/api/auth/me');
  return response.data.data?.user as IUser;
}

export async function getApiKey(): Promise<GetApiKeyResponse> {
  const response = await api.get<GetApiKeyResponse>('/api/auth/api-key');
  return response.data;
}

export async function updateUser(data: Partial<IUser>): Promise<IUser> {
  const response = await api.patch<IUser>('/api/auth/me', data);
  return response.data;
}
