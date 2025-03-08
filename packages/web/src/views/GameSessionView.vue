<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useGameSessionStore } from '../stores/game-session.mjs';

const route = useRoute();
const gameSessionStore = useGameSessionStore();
const loading = ref(false);
const error = ref<string | null>(null);

const sessionId = route.params.id as string;

// Fetch session data
onMounted(async () => {
  loading.value = true;
  error.value = null;
  
  try {
    await gameSessionStore.getGameSession(sessionId);
  } catch (err) {
    console.error('Error fetching game session:', err);
    error.value = 'Failed to load game session';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="game-session-view max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Loading Spinner -->
    <div v-if="loading" class="flex justify-center items-center min-h-[400px]">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="text-center py-10">
      <p class="text-red-600 mb-4">{{ error }}</p>
    </div>
    
    <template v-else-if="gameSessionStore.currentSession">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-3xl font-semibold text-gray-900">{{ gameSessionStore.currentSession.name }}</h1>
            <p v-if="gameSessionStore.currentSession.description" class="mt-2 text-gray-500">
              {{ gameSessionStore.currentSession.description }}
            </p>
          </div>
        </div>
      </div>
      
      <!-- Game Session Content -->
      <div class="space-y-8">
        <!-- TODO: Add game session components (chat, dice roller, map, etc.) -->
        <p class="text-gray-600">Game session interface coming soon...</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.game-session-view {
  max-width: 1200px;
  margin: 0 auto;
}
</style> 