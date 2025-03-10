import { defineStore } from 'pinia';
import { io } from 'socket.io-client';
import { ref, watch } from 'vue';
import { useAuthStore } from './auth.mjs';

// Define a type for the socket store
interface SocketStore {
  socket: any | null;  // TODO: Replace with proper type when TS issues are resolved
  userId: string | null;
  isConnected: boolean;
  initSocket: () => void;
  setUserId: (id: string) => void;
  disconnect: () => void;
}

export const useSocketStore = defineStore('socket', () => {
  const socket = ref<any | null>(null);
  const userId = ref<string | null>(null);
  const isConnected = ref(false);
  const authStore = useAuthStore();

  // Watch for auth store changes
  watch(() => authStore.user, (newUser) => {
    if (newUser) {
      userId.value = newUser.id;
      // Initialize socket when user is authenticated
      initSocket();
    } else {
      userId.value = null;
      disconnect();
    }
  }, { immediate: true });

  function initSocket() {
    if (socket.value) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    socket.value = io(apiUrl, {
      withCredentials: true,
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    socket.value.on('connect', () => {
      isConnected.value = true;
      console.log('Socket connected');
    });

    socket.value.on('disconnect', () => {
      isConnected.value = false;
      console.log('Socket disconnected');
    });

    socket.value.on('error', (error: { message: string }) => {
      console.error('Socket error:', error.message);
    });

    socket.value.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error);
    });
  }

  function setUserId(id: string) {
    userId.value = id;
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
    }
    isConnected.value = false;
    userId.value = null;
  }

  return {
    socket,
    userId,
    isConnected,
    initSocket,
    setUserId,
    disconnect,
  };
}) satisfies () => SocketStore; 