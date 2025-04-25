import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { IUser } from '@dungeon-lab/shared/index.mjs';
import * as authApi from '../api/auth.client.mts';
import { AxiosError } from 'axios';
import { LoginRequest } from '@dungeon-lab/shared/types/api/authentication.mjs';

export const useAuthStore = defineStore(
  'auth',
  () => {
    const user = ref<IUser | undefined>(undefined);
    const error = ref<string | undefined>(undefined);
    const isLoading = ref(false);

    // Computed properties
    const isAuthenticated = computed(() => !!user.value);

    // Actions
    async function login(credentials: LoginRequest) {
      isLoading.value = true;
      error.value = undefined;

      try {
        const value = await authApi.login(credentials);
        if (value.success) {
          console.log('user.value', value);
          user.value = value.user;
        } else {
          error.value = value.error;
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          error.value = err.message || 'Failed to login';
        } else {
          error.value = 'Failed to login: Unknown error';
        }
        throw err;
      } finally {
        isLoading.value = false;
      }
    }

    async function register(data: authApi.RegisterData) {
      isLoading.value = true;
      error.value = undefined;

      try {
        user.value = await authApi.register(data);
        return true;
      } catch (err: unknown) {
        if (err instanceof AxiosError) {
          error.value =
            err.response?.data?.error?.message || 'An error occurred during registration';
        } else if (err instanceof Error) {
          error.value = err.message || 'An error occurred during registration';
        } else {
          error.value = 'An error occurred during registration: Unknown error';
        }
        user.value = undefined;
        return false;
      } finally {
        isLoading.value = false;
      }
    }

    function loginWithGoogle() {
      // Redirect to Google OAuth endpoint
      window.location.href = '/api/auth/google';
    }

    function handleGoogleCallback() {
      // No token to handle, just fetch the user data from session
      return fetchUser();
    }

    async function logout() {
      try {
        await authApi.logout();
      } catch (err: unknown) {
        console.error('Logout error:', err);
      } finally {
        user.value = undefined;
      }
    }

    async function fetchUser() {
      try {
        user.value = await authApi.getCurrentUser();
        return true;
      } catch (err: unknown) {
        console.error('Error fetching user:', err);
        user.value = undefined;
        return false;
      }
    }

    async function updateUser(data: Partial<IUser>) {
      try {
        user.value = await authApi.updateUser(data);
        return true;
      } catch (err: unknown) {
        console.error('Error updating user:', err);
        return false;
      }
    }

    return {
      user,
      error,
      isLoading,
      isAuthenticated,
      login,
      register,
      loginWithGoogle,
      handleGoogleCallback,
      logout,
      fetchUser,
      updateUser
    };
  },
  { persist: { storage: sessionStorage } }
);
