<script setup lang="ts">
import { RouterView } from 'vue-router';
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import { useDeviceAdaptation } from '@/composables/useDeviceAdaptation.mts';

const { isMobile, isPhone } = useDeviceAdaptation();
const route = useRoute();

// Detect if this is a character sheet route that needs full-width layout
const isCharacterSheet = computed(() => {
  return route.name === 'character-sheet' || route.path.startsWith('/character/');
});
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <!-- Only show AppHeader on desktop/tablet, not on phone -->
    <AppHeader v-if="!isPhone" />
    <main class="flex-grow" :class="[
      isPhone ? 'px-0 py-4' : 
      isCharacterSheet ? 'px-6 pb-0' : 
      'container mx-auto px-4 py-6',
      { 'pt-16': !isPhone }
    ]">
      <RouterView />
    </main>
    <AppFooter v-if="!isMobile" />
  </div>
</template>
