<template>
  <div class="hud-container">
    <!-- Sidebar -->
    <Sidebar />
    
    <!-- Sidebar Expand Button (when collapsed) -->
    <div
      v-if="hud.showHUD && hud.store.sidebar.visible && hud.store.sidebar.collapsed"
      class="sidebar-expand-button"
      :class="{
        'expand-button-left': hud.store.sidebar.position === 'left',
        'expand-button-right': hud.store.sidebar.position === 'right'
      }"
      @click="hud.toggleSidebarCollapsed"
    >
      <i class="mdi mdi-chevron-right" :class="{ 'rotate-180': hud.store.sidebar.position === 'left' }"></i>
    </div>
    
    <!-- Floating Toolbar -->
    <Toolbar />
    
    <!-- Floating Windows (when tabs are popped out) -->
    <FloatingWindow
      v-for="window in hud.store.floatingWindows"
      :key="window.id"
      :window-id="window.id"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useHUD } from '../../composables/useHUD.mjs';
import Sidebar from './Sidebar.vue';
import Toolbar from './Toolbar.vue';
import FloatingWindow from './FloatingWindow.vue';

const hud = useHUD();

onMounted(() => {
  hud.initialize();
});

onUnmounted(() => {
  hud.cleanup();
});
</script>

<style scoped>
.hud-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1000;
}

.hud-container > * {
  pointer-events: auto;
}

.sidebar-expand-button {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 60px;
  background: rgba(26, 26, 26, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 999;
  color: rgba(255, 255, 255, 0.7);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.sidebar-expand-button:hover {
  background: rgba(59, 130, 246, 0.6);
  color: white;
  transform: translateY(-50%) translateX(4px);
}

.expand-button-left {
  left: 0;
  border-radius: 0 8px 8px 0;
  border-left: none;
}

.expand-button-right {
  right: 0;
  border-radius: 8px 0 0 8px;
  border-right: none;
}

.expand-button-right:hover {
  transform: translateY(-50%) translateX(-4px);
}

.rotate-180 {
  transform: rotate(180deg);
}
</style>