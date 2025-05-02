<script setup lang="ts">
import { onMounted } from 'vue';
import { useSocketStore } from '../../stores/socket.store.mjs';
import { useGameSessionStore } from '../../stores/game-session.store.mjs';

const socketStore = useSocketStore();
const gameSessionStore = useGameSessionStore();

// Function to restore game session connection
async function restoreGameSession() {
  try {
    // Check for stored session and campaign IDs

    // If we have both stored, try to restore the session
    if (gameSessionStore.currentSession && gameSessionStore.currentCampaign) {
      console.log('[Debug] Found stored session:', {
        sessionId: gameSessionStore.currentSession.id,
        campaignId: gameSessionStore.currentCampaign.id,
      });

      try {

        if (socketStore.socket && gameSessionStore.currentSession) {
          console.log(
            '[Debug] Restoring game session connection:',
            gameSessionStore.currentSession.id
          );

          // Set up a one-time listener for join confirmation
          // socketStore.socket.once('userJoined', (data: { userId: string; timestamp: Date }) => {
          //   console.log('[Debug] Successfully restored session connection:', data);
          // });

          // Set up error listener
          socketStore.socket.once('error', (error: string ) => {
            console.error('[Debug] Error restoring session connection:', error);
            // On error, clear stored session
            clearStoredSession();
          });

          // Attempt to join the session
          socketStore.socket.emit('joinSession', gameSessionStore.currentSession.id, (result) => {
            console.log('[Debug] Join session result:', result);
          });
          return;
        }
      } catch (error) {
        console.warn('[Debug] Failed to restore stored session:', error);
        clearStoredSession();
      }
    }
  } catch (error) {
    console.error('[Debug] Failed to restore/join game session:', error);
    clearStoredSession();
  }
}


// Helper to clear stored session
function clearStoredSession() {
  gameSessionStore.clearSession();
}

onMounted(() => {
  // When socket is initialized or reconnects, try to restore game session
  if (socketStore.socket) {
    socketStore.socket.on('connect', () => {
      console.log('[Debug] Socket connected, attempting to restore session');
      restoreGameSession();
    });
  }

  // Also try to restore session on component mount
  restoreGameSession();
});
</script>

<template>
  <!-- This component doesn't render anything -->
</template>
