import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { IUser } from '@dungeon-lab/shared/types/index.mjs';
import { AuthClient } from '@dungeon-lab/client/auth.client.mjs';
import { LoginRequest, RegisterRequest } from '@dungeon-lab/shared/types/api/authentication.mjs';
// Import the game session store
import { useGameSessionStore } from './game-session.store.mts';

// Create a more specific client for auth methods
// Note: This would normally be part of the client library, but we're creating it temporarily
const authClient = new AuthClient();

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
        const value = await authClient.login(credentials);
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

    async function register(data: RegisterRequest) {
      isLoading.value = true;
      error.value = undefined;

      try {
        const result = await authClient.register(data);
        if (result.success) {
          user.value = result.data;
        } else {
          error.value = result.error;
        }
        return true;
      } catch (err: unknown) {
        if (err instanceof Error) {
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
      // Leave the active session if in one
      try {
        const gameSessionStore = useGameSessionStore();
        gameSessionStore.leaveSession();
      } catch (err) {
        console.warn('Error leaving session on logout:', err);
      }
      try {
        await authClient.logout();
      } catch (err: unknown) {
        console.error('Logout error:', err);
      } finally {
        user.value = undefined;
      }
    }

    async function fetchUser() {
      try {
        user.value = await authClient.getCurrentUser();
        return true;
      } catch (err: unknown) {
        console.error('Error fetching user:', err);
        user.value = undefined;
        return false;
      }
    }

    async function updateUser(data: Partial<IUser>) {
      try {
        user.value = await authClient.updateUser(data);
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
  { persist: { storage: localStorage } }
);
