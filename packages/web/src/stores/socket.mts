import { defineStore } from 'pinia';
import { io, Socket as SocketIO } from 'socket.io-client';
import { ref, watch } from 'vue';
import { useAuthStore } from './auth.mjs';
import { useRouter } from 'vue-router';
import { useEncounterStore } from './encounter.mjs';

// Define a type for the socket store
interface SocketStore {
  socket: SocketIO | null;
  userId: string | null;
  isConnected: boolean;
  initSocket: () => void;
  setUserId: (id: string) => void;
  disconnect: () => void;
}

export const useSocketStore = defineStore('socket', () => {
  const socket = ref<SocketIO | null>(null);
  const userId = ref<string | null>(null);
  const isConnected = ref(false);
  const authStore = useAuthStore();
  const router = useRouter();

  // Watch for auth store changes
  watch(
    () => authStore.user,
    async (newUser) => {
      if (newUser) {
        userId.value = newUser.id;
        // Wait a bit for the session to be established
        await new Promise((resolve) => setTimeout(resolve, 100));
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

  async function initSocket() {
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
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Add logging for all socket events
    socket.value.onAny((event: string, ...args: unknown[]) => {
      console.log('[Socket Event Received]', event, args);
    });

    // Add logging for all outgoing events
    const originalEmit = socket.value.emit;
    socket.value.emit = function (event: string, ...args: unknown[]) {
      console.log('[Socket Event Sent]', event, args);
      return originalEmit.apply(this, [event, ...args]);
    };

    socket.value.on('connect', () => {
      isConnected.value = true;
      console.log('[Socket] Connected');
    });

    socket.value.on('disconnect', () => {
      isConnected.value = false;
      console.log('[Socket] Disconnected');
    });

    socket.value.on('error', (error: { message: string }) => {
      console.error('[Socket Error]', error.message);
    });

    socket.value.on('connect_error', (error: Error) => {
      console.error('[Socket Connection Error]', error);
    });

    // Global encounter:start handler
    socket.value.on('encounter:start', (data: { campaignId: string; encounterId: string }) => {
      console.log('[Socket] Received encounter:start event:', data);
      // Navigate to the encounter page
      router.push(`/campaigns/${data.campaignId}/encounters/${data.encounterId}`);
    });

    // Global encounter:stop handler
    socket.value.on('encounter:stop', (data: { campaignId: string; encounterId: string }) => {
      console.log('[Socket] Received encounter:stop event:', data);
      // Update the encounter status in the store if we're on the encounter page
      const currentRoute = router.currentRoute.value;
      if (
        currentRoute.name === 'encounter-detail' &&
        currentRoute.params.id === data.encounterId &&
        currentRoute.params.campaignId === data.campaignId
      ) {
        // Import and use the encounter store
        const encounterStore = useEncounterStore();
        encounterStore.updateEncounterStatus(data.encounterId, data.campaignId, 'ready');
      }
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
    disconnect
  };
}) as () => SocketStore;
