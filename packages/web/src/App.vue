<script setup lang="ts">
import { RouterView } from 'vue-router';
import { useTheme } from '@/composables/useTheme';

const { isDarkMode } = useTheme();
</script>

<template>
  <div class="min-h-screen" :class="{ 'dark': isDarkMode }">
    <div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
      <RouterView />
    </div>
  </div>
</template>

<style>
@import './assets/styles/main.css';
</style> 