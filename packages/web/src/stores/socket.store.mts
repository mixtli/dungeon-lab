import { defineStore } from 'pinia';
import { io, Socket } from 'socket.io-client';
import { onMounted, ref, watch } from 'vue';
import { useAuthStore } from './auth.store.mts';
// import { useEncounterStore } from './encounter.store.mts';
import {
  ClientToServerEvents,
  ServerToClientEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';

// Define a type for the socket store
interface SocketStore {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  connected: boolean;
  userId: string | null;
  initSocket: () => Promise<void>;
  setUserId: (id: string) => void;
  disconnect: () => void;
  emit: <T extends keyof ClientToServerEvents>(event: T, ...args: Parameters<ClientToServerEvents[T]>) => void;
}

export const useSocketStore = defineStore(
  'socket',
  () => {
    const socket = ref<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
    const connected = ref(false);
    const userId = ref<string | null>(null);
    const authStore = useAuthStore();
    
    onMounted(async() => {
      console.log('Socket store mounted, auth user:', authStore.user?.id);
      if (authStore.user) {
        userId.value = authStore.user.id;
        await initSocket();
      }
    });

    // Watch for auth store changes
    watch(
      () => authStore.user,
      async (newUser) => {
        console.log('Auth user changed:', newUser?.id);
        if (newUser) {
          userId.value = newUser.id;
          // Initialize socket when user is authenticated
          await initSocket();
        } else {
          userId.value = null;
          console.log('disconnecting');
          disconnect();
        }
      },
      { immediate: true }
    );

    async function initSocket(): Promise<void> {
      console.log('initSocket called, current socket:', socket.value?.connected);
      if (socket.value?.connected) {
        console.log('Socket already connected');
        connected.value = true;
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      console.log('Connecting to socket at', apiUrl);
      
      // Disconnect existing socket if it exists but isn't connected
      if (socket.value && !socket.value.connected) {
        socket.value.disconnect();
        socket.value = null;
      }
      
      // Create new socket connection
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

      // Add logging for all socket events
      socket.value.onAny((event: string, ...args: unknown[]) => {
        console.log('[Socket Event Received]', event, args);
      });

      // Add logging for all outgoing events
      const originalEmit = socket.value.emit;
      socket.value.emit = function (event: string, ...args: unknown[]) {
        console.log('[Socket Event Sent]', event, args);
        // @ts-expect-error we lose type information here
        return originalEmit.apply(this, [event, ...args]);
      };

      return new Promise<void>((resolve) => {
        // Set up one-time connection handler to resolve the promise
        socket.value?.once('connect', () => {
          console.log('[Socket] Connected successfully');
          connected.value = true;
          resolve();
        });

        // Set up regular handlers
        socket.value?.on('connect', () => {
          console.log('[Socket] Connected');
          connected.value = true;
        });

        socket.value?.on('disconnect', () => {
          console.log('[Socket] Disconnected');
          connected.value = false;
        });

        socket.value?.on('error', (error: string) => {
          console.error('[Socket Error]', error);
          connected.value = false;
        });

        socket.value?.on('connect_error', (error: Error) => {
          console.error('[Socket Connection Error]', error);
          connected.value = false;
        });

        // Add a timeout to resolve the promise even if connection fails
        setTimeout(() => {
          if (!connected.value) {
            console.warn('[Socket] Connection timeout - continuing without socket');
            resolve();
          }
        }, 5000);
      });
    }

    function setUserId(id: string) {
      userId.value = id;
    }

    function disconnect() {
      console.log('useSocketStore disconnect');
      if (socket.value) {
        socket.value.disconnect();
        socket.value = null;
      }
      connected.value = false;
      userId.value = null;
    }

    function emit<T extends keyof ClientToServerEvents>(event: T, ...args: Parameters<ClientToServerEvents[T]>) {
      if (!socket.value) {
        console.warn('Socket not initialized, cannot emit event:', event);
        return;
      }
      socket.value.emit(event, ...args);
    }

    return {
      socket,
      connected,
      userId,
      initSocket,
      setUserId,
      disconnect,
      emit
    };
  },
  { persist: false } // Don't persist socket state as it can't be serialized
) as () => SocketStore;
