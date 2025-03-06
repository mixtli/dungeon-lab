import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../plugins/axios.mjs';

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
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed properties
  const isAuthenticated = computed(() => !!user.value);

  // Actions
  async function login(credentials: LoginCredentials) {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.post('/auth/login', credentials);
      
      if (response.data.success) {
        // Save user data
        user.value = response.data.data.user;
        return true;
      } else {
        error.value = response.data.error?.message || 'Login failed';
        return false;
      }
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.message || 'Login failed';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function register(data: RegisterData) {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.post('/auth/register', data);
      
      if (response.data.success) {
        // Save user data
        user.value = response.data.data.user;
        return true;
      } else {
        error.value = response.data.error?.message || 'Registration failed';
        return false;
      }
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.message || 'Registration failed';
      return false;
    } finally {
      loading.value = false;
    }
  }

  function loginWithGoogle() {
    // Redirect to Google OAuth endpoint
    window.location.href = `${api.defaults.baseURL}/auth/google`;
  }

  function handleGoogleCallback() {
    // No token to handle, just fetch the user data from session
    return fetchUser();
  }

  async function logout() {
    try {
      // Call the logout endpoint to clear server-side session
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear user data on client
      user.value = null;
    }
  }

  async function fetchUser() {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.get('/auth/me');
      
      if (response.data.success) {
        user.value = response.data.data;
        return true;
      } else {
        error.value = response.data.error?.message || 'Failed to fetch user data';
        return false;
      }
    } catch (err: any) {
      // Check if this is a 401 error, which is expected when not logged in
      if (err.response?.status === 401) {
        // Clear user data silently without an error message
        user.value = null;
        return false;
      }
      
      // For other errors, set the error message
      error.value = err.response?.data?.error?.message || err.message || 'Failed to fetch user data';
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    loginWithGoogle,
    handleGoogleCallback,
    logout,
    fetchUser,
  };
}); 