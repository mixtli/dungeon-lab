import api from './axios.mjs';
import type { IUser, IUserUpdateData } from '@dungeon-lab/shared/schemas/user.schema.mjs';

/**
 * Fetch all users (admin only)
 */
export async function fetchUsers(): Promise<IUser[]> {
  const response = await api.get('/api/users');
  return response.data;
}

/**
 * Fetch a specific user by ID
 */
export async function fetchUser(id: string): Promise<IUser> {
  const response = await api.get(`/api/users/${id}`);
  return response.data;
}

/**
 * Update a user's profile
 */
export async function updateUser(id: string, data: IUserUpdateData): Promise<IUser> {
  const response = await api.patch(`/api/users/${id}`, data);
  return response.data;
}

/**
 * Update current user's profile
 */
export async function updateCurrentUser(data: IUserUpdateData): Promise<IUser> {
  const response = await api.patch('/api/users/me', data);
  return response.data;
}

/**
 * Upload user avatar
 */
export async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await api.post('/api/users/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
}

/**
 * Change user password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean }> {
  const response = await api.post('/api/users/change-password', {
    currentPassword,
    newPassword
  });
  return response.data;
}

/**
 * Generate API key for user
 */
export async function generateApiKey(): Promise<{ apiKey: string }> {
  const response = await api.post('/api/users/api-key');
  return response.data;
}
