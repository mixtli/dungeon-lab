<script setup lang="ts">
import { RouterView } from 'vue-router';
import NotificationToast from './components/common/NotificationToast.vue';
import AppHeader from './components/layout/AppHeader.vue';
import MobileApp from './components/layout/MobileApp.vue';

import { useSocketStore } from './stores/socket.store.mts';
import { useAuthStore } from './stores/auth.store.mts';
import { useDeviceAdaptation } from './composables/useDeviceAdaptation.mts';
import { watch } from 'vue';
import { registerAllPlugins } from './services/plugin-registry.service.mts';

const store = useSocketStore();
const authStore = useAuthStore();
const { isPhone } = useDeviceAdaptation();


// Only initialize socket and plugins if authenticated
watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      store.initSocket();
      registerAllPlugins();
    } else {
      store.disconnect();
    }
  },
  { immediate: true }
);
</script>

<template>

  <!-- Mobile Layout -->
  <MobileApp v-if="isPhone" />
  
  <!-- Desktop/Tablet Layout -->
  <div v-else class="app min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <AppHeader />
    <NotificationToast />
    <main class="container mx-auto px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>

<style>
@import './assets/styles/main.css';
</style>
