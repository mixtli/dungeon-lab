import { LoginRequest, LoginResponse } from '@dungeon-lab/shared/types/api/authentication.mjs';
import api from './axios.mts';
import type { IUser } from '@dungeon-lab/shared/index.mjs';

export interface RegisterData extends LoginRequest {
  name: string;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await api.post('/api/auth/login', data);
  return response.data;
}

export async function register(data: RegisterData): Promise<IUser> {
  const response = await api.post('/api/auth/register', data);
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout');
}

export async function getCurrentUser(): Promise<IUser> {
  const response = await api.get('/api/auth/me');
  return response.data;
}

export async function updateUser(data: Partial<IUser>): Promise<IUser> {
  const response = await api.patch('/api/auth/me', data);
  return response.data;
}
