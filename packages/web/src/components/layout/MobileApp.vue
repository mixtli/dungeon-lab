<script setup lang="ts">
import { RouterView } from 'vue-router';
import NotificationToast from '../common/NotificationToast.vue';
import MobileHeader from './MobileHeader.vue';
import BottomNavigation from './BottomNavigation.vue';

import { useSocketStore } from '../../stores/socket.store.mts';
import { useAuthStore } from '../../stores/auth.store.mts';
import { watch } from 'vue';
import { pluginRegistry } from '../../services/plugin-registry.mts';

const store = useSocketStore();
const authStore = useAuthStore();

// Only initialize socket and plugins if authenticated
watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      store.initSocket();
      pluginRegistry.initialize();
    } else {
      store.disconnect();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="mobile-app min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col">
    <MobileHeader />
    <NotificationToast />
    
    <!-- Main content area with proper spacing for fixed header and bottom nav -->
    <main class="flex-1 overflow-auto pt-12 pb-16">
      <RouterView />
    </main>
    
    <BottomNavigation />
  </div>
</template>

<style scoped>
/* Ensure mobile app takes full height and handles safe areas */
.mobile-app {
  /* Support for iOS safe areas */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

/* Adjust main content for safe areas */
main {
  padding-top: calc(3rem + env(safe-area-inset-top)); /* 48px header + safe area */
  padding-bottom: calc(4rem + env(safe-area-inset-bottom)); /* 64px bottom nav + safe area */
}
</style>