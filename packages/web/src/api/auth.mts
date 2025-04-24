import api from './axios.mjs';
import type { IUser } from '@dungeon-lab/shared/index.mjs';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData extends LoginData {
  name: string;
}

export async function login(data: LoginData): Promise<IUser> {
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
