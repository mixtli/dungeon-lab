<script setup lang="ts">
import { RouterView } from 'vue-router';
import NotificationToast from './components/common/NotificationToast.vue';
import AppHeader from './components/layout/AppHeader.vue';

import { useSocketStore } from './stores/socket.store.mjs';
import { onMounted } from 'vue';
const store = useSocketStore();

onMounted(() => {
  store.initSocket();
});

</script>

<template>
  <div class="app min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
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
