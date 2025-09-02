<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useGameSessionStore } from '../stores/game-session.store.mjs';
import ChatTab from '../components/hud/tabs/ChatTab.vue';

const gameSessionStore = useGameSessionStore();
</script>

<template>
  <div class="mobile-chat-view flex flex-col bg-stone dark:bg-stone-700 min-h-0 mobile-with-bottom-nav">
    <!-- No Active Session State -->
    <div v-if="!gameSessionStore.currentSession" class="flex-1 flex flex-col items-center justify-center p-8">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-ash dark:text-stone-400 mb-4" viewBox="0 0 20 20"
        fill="currentColor">
        <path fill-rule="evenodd"
          d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
          clip-rule="evenodd" />
      </svg>
      <h2 class="text-2xl font-semibold text-onyx dark:text-parchment mb-2">No Active Game Session</h2>
      <p class="text-ash dark:text-stone-300 mb-6 text-center max-w-md">
        You need to be in an active game session to use the chat. Join a game session or create a
        new one to start chatting.
      </p>
      <div class="flex gap-4">
        <RouterLink to="/game-sessions"
          class="btn btn-primary">
          View Game Sessions
        </RouterLink>
        <RouterLink to="/campaigns"
          class="btn btn-outline">
          Browse Campaigns
        </RouterLink>
      </div>
    </div>

    <!-- Mobile Chat Interface -->
    <div v-else class="flex-1 min-h-0 chat-tab-container">
      <ChatTab />
    </div>
  </div>
</template>

<style scoped>
.mobile-chat-view {
  height: calc(100vh - 64px);
  /* Ensure proper flexbox constraint propagation */
  overflow: hidden;
}

.chat-tab-container {
  /* Override the HUD-specific dark styling for mobile full-screen usage */
  background: #f5f5f4; /* stone-100 */
  border-radius: 0;
}

.dark .chat-tab-container {
  background: #44403c; /* stone-700 */
}

/* Mobile-specific adjustments */
@media (max-width: 767px) {
  .chat-tab-container {
    /* Ensure ChatTab fills the container properly on mobile */
    display: flex;
    flex-direction: column;
  }
  
  .chat-tab-container :deep(.chat-tab) {
    /* Override any fixed dimensions from HUD usage */
    height: 100%;
    background: transparent;
  }
  
  .chat-tab-container :deep(.chat-header) {
    /* Adjust header for mobile full-screen */
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.05);
  }
  
  .dark .chat-tab-container :deep(.chat-header) {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
}
</style>