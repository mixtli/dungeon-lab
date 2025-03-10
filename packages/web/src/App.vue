<script setup lang="ts">
import { RouterView } from 'vue-router';
import SocketManager from './components/socket/SocketManager.vue';
</script>

<template>
  <SocketManager />
  <RouterView />
</template>

<style>
@import './assets/styles/main.css';
</style> 