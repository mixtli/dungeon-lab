<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import { useDeviceAdaptation } from '@/composables/useDeviceAdaptation.mts';

const { isMobile } = useDeviceAdaptation();
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <AppHeader />
    <main class="flex-grow container mx-auto px-4 py-6 pt-16">
      <RouterView />
    </main>
    <AppFooter v-if="!isMobile" />
  </div>
</template>
