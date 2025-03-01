import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../plugins/axios';

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
  const token = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Load token from localStorage on initialization
  const storedToken = localStorage.getItem('token');
  if (storedToken) {
    token.value = storedToken;
    // Set axios default header
    api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
  }

  // Computed properties
  const isAuthenticated = computed(() => !!token.value);

  // Actions
  async function login(credentials: LoginCredentials) {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.post('/auth/login', credentials);
      
      if (response.data.success) {
        const { token: newToken, user: userData } = response.data.data;
        
        // Save token and user data
        token.value = newToken;
        user.value = userData;
        
        // Save token to localStorage
        localStorage.setItem('token', newToken);
        
        // Set axios default header
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
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
        const { token: newToken, user: userData } = response.data.data;
        
        // Save token and user data
        token.value = newToken;
        user.value = userData;
        
        // Save token to localStorage
        localStorage.setItem('token', newToken);
        
        // Set axios default header
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
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
    window.location.href = `${api.defaults.baseURL}/api/auth/google`;
  }

  function handleGoogleCallback(tokenFromUrl: string) {
    if (!tokenFromUrl) {
      error.value = 'Authentication failed';
      return false;
    }

    // Save token
    token.value = tokenFromUrl;
    localStorage.setItem('token', tokenFromUrl);
    
    // Set axios default header
    api.defaults.headers.common['Authorization'] = `Bearer ${tokenFromUrl}`;
    
    // Fetch user data
    fetchUser();
    
    return true;
  }

  async function logout() {
    // Clear token and user data
    token.value = null;
    user.value = null;
    
    // Remove token from localStorage
    localStorage.removeItem('token');
    
    // Remove axios default header
    delete api.defaults.headers.common['Authorization'];
  }

  async function fetchUser() {
    if (!token.value) return null;
    
    loading.value = true;
    error.value = null;
    
    try {
      const response = await api.get('/auth/me');
      
      if (response.data.success) {
        user.value = response.data.data;
        return user.value;
      } else {
        error.value = response.data.error?.message || 'Failed to fetch user data';
        return null;
      }
    } catch (err: any) {
      error.value = err.response?.data?.error?.message || err.message || 'Failed to fetch user data';
      
      // If unauthorized, logout
      if (err.response?.status === 401) {
        logout();
      }
      
      return null;
    } finally {
      loading.value = false;
    }
  }

  return {
    user,
    token,
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