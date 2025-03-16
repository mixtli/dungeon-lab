import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from '../network/axios.mjs';

interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  isAdmin: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const error = ref<string | null>(null);
  const isLoading = ref(false);

  // Computed properties
  const isAuthenticated = computed(() => !!user.value);

  // Actions
  async function login(credentials: LoginCredentials) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await axios.post('/api/auth/login', credentials);
      
      if (response.data.success) {
        user.value = response.data.data.user;
        localStorage.setItem('isAuthenticated', 'true');
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to login';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function register(data: RegisterData) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await axios.post('/api/auth/register', data);
      
      if (response.data.success) {
        user.value = response.data.data.user;
        localStorage.setItem('isAuthenticated', 'true');
        return true;
      } else {
        error.value = response.data.error?.message || 'Registration failed';
        localStorage.removeItem('isAuthenticated');
        user.value = null;
        return false;
      }
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || 'An error occurred during registration';
      localStorage.removeItem('isAuthenticated');
      user.value = null;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  function loginWithGoogle() {
    // Redirect to Google OAuth endpoint
    window.location.href = `${axios.defaults.baseURL}/api/auth/google`;
  }

  function handleGoogleCallback() {
    // No token to handle, just fetch the user data from session
    return fetchUser();
  }

  async function logout() {
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      user.value = null;
      localStorage.removeItem('isAuthenticated');
    }
  }

  async function fetchUser() {
    try {
      const response = await axios.get('/api/auth/me');
      
      if (response.data.success) {
        user.value = response.data.data;
        localStorage.setItem('isAuthenticated', 'true');
        return true;
      } else {
        user.value = null;
        localStorage.removeItem('isAuthenticated');
        return false;
      }
    } catch (err) {
      user.value = null;
      localStorage.removeItem('isAuthenticated');
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
  };
}); 