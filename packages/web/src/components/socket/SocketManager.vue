<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useSocketStore } from '../../stores/socket.mjs';
import { useGameSessionStore } from '../../stores/game-session.mjs';

const route = useRoute();
const socketStore = useSocketStore();
const gameSessionStore = useGameSessionStore();

// Function to restore game session connection
async function restoreGameSession() {
  try {
    // Check for stored session and campaign IDs
    const lastSessionId = localStorage.getItem('lastActiveSessionId');
    const lastCampaignId = localStorage.getItem('lastActiveCampaignId');

    // If we have both stored, try to restore the session
    if (lastSessionId && lastCampaignId) {
      console.log('[Debug] Found stored session:', {
        sessionId: lastSessionId,
        campaignId: lastCampaignId,
      });

      try {
        // Get the session details
        await gameSessionStore.getGameSession(lastSessionId);

        if (socketStore.socket && gameSessionStore.currentSession) {
          console.log(
            '[Debug] Restoring game session connection:',
            gameSessionStore.currentSession.id
          );

          // Set up a one-time listener for join confirmation
          socketStore.socket.once('user-joined', (data: { userId: string; timestamp: Date }) => {
            console.log('[Debug] Successfully restored session connection:', data);
          });

          // Set up error listener
          socketStore.socket.once('error', (error: { message: string }) => {
            console.error('[Debug] Error restoring session connection:', error);
            // On error, clear stored session
            clearStoredSession();
          });

          // Attempt to join the session
          socketStore.socket.emit('join-session', gameSessionStore.currentSession.id);
          return;
        }
      } catch (error) {
        console.warn('[Debug] Failed to restore stored session:', error);
        clearStoredSession();
      }
    }

    // If we're on a campaign route, check for active sessions
    const currentCampaignId = route.params.campaignId as string;
    if (currentCampaignId) {
      console.log('[Debug] Checking for active sessions in campaign:', currentCampaignId);

      // Fetch active sessions for the campaign
      const sessions = await gameSessionStore.fetchCampaignSessions(currentCampaignId);

      // Find an active session
      const activeSession = sessions.find(session => session.status === 'active');

      if (activeSession) {
        // Get full session details and join it
        await gameSessionStore.getGameSession(activeSession.id);

        if (socketStore.socket && gameSessionStore.currentSession) {
          console.log('[Debug] Joining active session:', gameSessionStore.currentSession.id);

          // Store both session and campaign IDs
          storeSessionInfo(gameSessionStore.currentSession.id, currentCampaignId);

          // Set up a one-time listener for join confirmation
          socketStore.socket.once('user-joined', (data: { userId: string; timestamp: Date }) => {
            console.log('[Debug] Successfully joined session:', data);
          });

          // Set up error listener
          socketStore.socket.once('error', (error: { message: string }) => {
            console.error('[Debug] Error joining session:', error);
            clearStoredSession();
          });

          // Attempt to join the session
          socketStore.socket.emit('join-session', gameSessionStore.currentSession.id);
        }
      }
    }
  } catch (error) {
    console.error('[Debug] Failed to restore/join game session:', error);
    clearStoredSession();
  }
}

// Helper to store session info
function storeSessionInfo(sessionId: string, campaignId: string) {
  localStorage.setItem('lastActiveSessionId', sessionId);
  localStorage.setItem('lastActiveCampaignId', campaignId);
}

// Helper to clear stored session
function clearStoredSession() {
  localStorage.removeItem('lastActiveSessionId');
  localStorage.removeItem('lastActiveCampaignId');
  gameSessionStore.clearSession();
}

// Watch for route changes
watch(
  () => route.params.campaignId,
  (newCampaignId, oldCampaignId) => {
    if (newCampaignId !== oldCampaignId) {
      console.log('[Debug] Campaign ID changed in route, attempting to restore session');
      restoreGameSession();
    }
  }
);

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
