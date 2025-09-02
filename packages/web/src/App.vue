<script setup lang="ts">
import { RouterView } from 'vue-router';
import NotificationToast from './components/common/NotificationToast.vue';
import MobileApp from './components/layout/MobileApp.vue';

import { useSocketStore } from './stores/socket.store.mts';
import { useAuthStore } from './stores/auth.store.mts';
import { rollHandlerService } from './services/roll-handler.service.mts';
import { rollRequestService } from './services/roll-request.service.mts';
import { useDeviceAdaptation } from './composables/useDeviceAdaptation.mts';
import { watch } from 'vue';

const store = useSocketStore();
const authStore = useAuthStore();
const { isPhone } = useDeviceAdaptation();


// Only initialize socket and plugins if authenticated
watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      store.initSocket();
      // Note: Plugin registry is now initialized in main.mts during app startup
    } else {
      store.disconnect();
      rollHandlerService.destroy();
    }
  },
  { immediate: true }
);

// Initialize roll handler service when socket becomes available
watch(
  () => store.socket,
  (socket) => {
    if (socket) {
      rollHandlerService.setRollRequestService(rollRequestService);
      rollHandlerService.setupListener(socket);
    }
  },
  { immediate: true }
);
</script>

<template>

  <!-- Mobile Layout -->
  <MobileApp v-if="isPhone" />
  
  <!-- Desktop/Tablet Layout -->
  <div v-else class="app min-h-screen bg-parchment dark:bg-obsidian text-onyx dark:text-parchment">
    <NotificationToast />
    <RouterView />
  </div>
</template>

<style>
@import './assets/styles/main.css';
</style>
