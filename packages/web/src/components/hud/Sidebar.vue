<template>
  <div
    v-if="hud.showHUD && hud.store.sidebarVisible"
    class="hud-sidebar"
    :class="{
      'sidebar-left': hud.store.sidebar.position === 'left',
      'sidebar-right': hud.store.sidebar.position === 'right',
      'sidebar-collapsed': hud.store.sidebar.collapsed
    }"
    :style="sidebarStyle"
  >
    <!-- Sidebar Header with tabs at top -->
    <div class="sidebar-header">
      <div class="sidebar-tabs">
        <button
          v-for="tab in hud.store.visibleTabs"
          :key="tab.id"
          class="tab-button"
          :class="{ 'tab-active': tab.id === hud.store.sidebar.activeTab }"
          :title="`${tab.title} (Right-click to pop out)`"
          @click="hud.setActiveTab(tab.id)"
          @contextmenu.prevent="popOutTab(tab.id)"
        >
          <i :class="`mdi ${tab.icon} tab-icon`"></i>
          <span class="tab-label">{{ tab.title }}</span>
          <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
        </button>
      </div>
      
      <!-- Sidebar Controls -->
      <div class="sidebar-controls">
        <button
          class="control-button"
          title="Close Sidebar"
          @click="hud.toggleSidebar"
        >
          <i class="mdi mdi-close"></i>
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <div v-if="!hud.store.sidebar.collapsed" class="sidebar-content">
      <!-- Chat Tab -->
      <ChatTab v-if="hud.store.sidebar.activeTab === 'chat'" />
      
      <!-- Combat Tab -->
      <CombatTab v-else-if="hud.store.sidebar.activeTab === 'combat'" />
      
      <!-- Actors Tab -->
      <ActorsTab v-else-if="hud.store.sidebar.activeTab === 'actors'" />
      
      <!-- Items Tab -->
      <ItemsTab v-else-if="hud.store.sidebar.activeTab === 'items'" />
    </div>

    <!-- Resize Handle -->
    <div
      v-if="!hud.store.sidebar.collapsed"
      class="resize-handle"
      :class="{ 'resize-left': hud.store.sidebar.position === 'right' }"
      @mousedown="startResize"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useHUD } from '../../composables/useHUD.mjs';
import ChatTab from './tabs/ChatTab.vue';
import CombatTab from './tabs/CombatTab.vue';
import ActorsTab from './tabs/ActorsTab.vue';
import ItemsTab from './tabs/ItemsTab.vue';

const hud = useHUD();

// Computed styles
const sidebarStyle = computed(() => ({
  width: hud.store.sidebar.collapsed ? '60px' : `${hud.store.sidebar.width}px`,
  [hud.store.sidebar.position]: '0',
  backgroundColor: hud.store.configuration.theme.sidebarBackground,
  borderRadius: `${hud.store.configuration.theme.borderRadius}px`,
}));

// Resize functionality
const isResizing = ref(false);
const resizeStartX = ref(0);
const resizeStartWidth = ref(0);

function startResize(event: MouseEvent): void {
  isResizing.value = true;
  resizeStartX.value = event.clientX;
  resizeStartWidth.value = hud.store.sidebar.width;
  
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  document.body.style.cursor = 'col-resize';
  event.preventDefault();
}

function handleResize(event: MouseEvent): void {
  if (!isResizing.value) return;
  
  const deltaX = event.clientX - resizeStartX.value;
  const newWidth = hud.store.sidebar.position === 'left' 
    ? resizeStartWidth.value + deltaX
    : resizeStartWidth.value - deltaX;
    
  hud.setSidebarWidth(newWidth);
}

function stopResize(): void {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
}

function popOutTab(tabId: string): void {
  hud.popOutTab(tabId as any);
}
</script>

<style scoped>
.hud-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: width 0.3s ease, transform 0.3s ease;
}

.sidebar-left {
  left: 0;
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
  border-left: none;
}

.sidebar-right {
  right: 0;
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
  border-right: none;
}

.sidebar-collapsed {
  width: 60px !important;
}

/* Sidebar Header */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-tabs {
  display: flex;
  gap: 4px;
}

.sidebar-controls {
  display: flex;
  gap: 4px;
}

.tab-button {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px 12px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  min-width: 40px;
  height: 40px;
}

.tab-button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

.tab-button:hover .tab-label {
  opacity: 1;
}

.tab-button.tab-active {
  background: rgba(59, 130, 246, 0.6);
  color: white;
  border-color: rgba(59, 130, 246, 0.8);
}

.tab-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.tab-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  transition: opacity 0.2s ease;
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 4px;
  pointer-events: none;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.control-button {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.tab-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: bold;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}


.rotate-180 {
  transform: rotate(180deg);
}

/* Sidebar Content */
.sidebar-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Resize Handle */
.resize-handle {
  width: 4px;
  background: transparent;
  cursor: col-resize;
  position: relative;
  transition: background-color 0.2s ease;
}

.resize-handle:hover {
  background: rgba(59, 130, 246, 0.5);
}

.resize-handle.resize-left {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
}

.sidebar-right .resize-handle {
  left: 0;
}

.sidebar-left .resize-handle {
  right: 0;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .hud-sidebar {
    width: 280px !important;
  }
}

@media (max-width: 768px) {
  .hud-sidebar {
    display: none;
  }
}
</style>