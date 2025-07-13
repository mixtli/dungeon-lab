<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import { useDeviceAdaptation } from '@/composables/useDeviceAdaptation.mts';

const { isMobile, isPhone } = useDeviceAdaptation();
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <!-- Only show AppHeader on desktop/tablet, not on phone -->
    <AppHeader v-if="!isPhone" />
    <main class="flex-grow" :class="[
      isPhone ? 'px-0 py-4' : 'container mx-auto px-4 py-6',
      { 'pt-16': !isPhone }
    ]">
      <RouterView />
    </main>
    <AppFooter v-if="!isMobile" />
  </div>
</template>
