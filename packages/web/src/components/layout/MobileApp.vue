<script setup lang="ts">
import { RouterView } from 'vue-router';
import NotificationToast from '../common/NotificationToast.vue';
import MobileHeader from './MobileHeader.vue';
import BottomNavigation from './BottomNavigation.vue';

import { useSocketStore } from '../../stores/socket.store.mts';
import { useAuthStore } from '../../stores/auth.store.mts';
import { useDeviceAdaptation } from '../../composables/useDeviceAdaptation.mts';
import { watch } from 'vue';
import { pluginRegistry } from '../../services/plugin-registry.mts';

const store = useSocketStore();
const authStore = useAuthStore();
const { isMobileLandscape } = useDeviceAdaptation();

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
  <div class="mobile-app min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col" :class="{ 'landscape-fullscreen': isMobileLandscape }">
    <!-- Hide header in mobile landscape mode for fullscreen encounter -->
    <MobileHeader v-if="!isMobileLandscape" />
    <NotificationToast />
    
    <!-- Main content area with dynamic spacing based on landscape mode -->
    <main class="flex-1 overflow-auto" :class="{ 'with-chrome': !isMobileLandscape, 'fullscreen': isMobileLandscape }">
      <RouterView />
    </main>
    
    <!-- Hide bottom navigation in landscape mode (MobileTabsContainer handles its own nav) -->
    <BottomNavigation v-if="!isMobileLandscape" />
  </div>
</template>

<style scoped>
/* Ensure mobile app takes full height and handles safe areas */
.mobile-app {
  /* Support for iOS safe areas */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

/* Adjust main content for safe areas - portrait mode with header and nav */
main.with-chrome {
  padding-top: calc(3rem + env(safe-area-inset-top)); /* 48px header + safe area */
  padding-bottom: calc(4rem + env(safe-area-inset-bottom)); /* 64px bottom nav + safe area */
}

/* Fullscreen mode - landscape with no header or nav */
main.fullscreen {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>