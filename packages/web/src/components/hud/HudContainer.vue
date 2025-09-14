<template>
  <div
    class="hud-container"
    :class="{
      'hud-desktop': isDesktop,
      'hud-mobile': isMobile,
      'hud-in-sheet': isInSheetView
    }"
  >
    <!-- Desktop Sidebar Layout -->
    <div
      v-if="isDesktop"
      class="hud-sidebar"
      :class="{
        'sidebar-collapsed': hudStore.sidebar.collapsed,
        'sidebar-left': hudStore.sidebar.position === 'left',
        'sidebar-right': hudStore.sidebar.position === 'right'
      }"
    >
      <!-- Sidebar Header -->
      <div class="sidebar-header">
        <div class="sidebar-title">HUD</div>
        <div class="sidebar-controls">
          <button
            class="control-button"
            title="Collapse Sidebar"
            @click="hudStore.toggleSidebarCollapsed()"
          >
            <i :class="hudStore.sidebar.collapsed ? 'mdi mdi-chevron-right' : 'mdi mdi-chevron-left'"></i>
          </button>
        </div>
      </div>

      <!-- Desktop Tab Navigation -->
      <div class="sidebar-tabs" v-if="!hudStore.sidebar.collapsed">
        <button
          v-for="tab in availableTabs"
          :key="tab.id"
          class="sidebar-tab"
          :class="{ 'tab-active': activeTab === tab.id }"
          @click="setActiveTab(tab.id)"
        >
          <i :class="`${tab.icon} tab-icon`"></i>
          <span class="tab-label">{{ tab.title }}</span>
          <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
        </button>
      </div>

      <!-- Desktop Tab Content -->
      <div class="sidebar-content" v-if="!hudStore.sidebar.collapsed">
        <component
          :is="getTabComponent(activeTabData?.component)"
          v-if="activeTabData && getTabComponent(activeTabData?.component)"
          class="tab-content"
        />
      </div>
    </div>

    <!-- Mobile Full-Screen Layout -->
    <div v-else-if="isMobile" class="hud-mobile-container">
      <!-- Mobile Sheet View -->
      <div v-if="currentSheet" class="mobile-sheet-view">
        <div class="mobile-sheet-header">
          <button @click="closeSheet" class="back-button">
            <i class="mdi mdi-arrow-left"></i>
            <span>Back</span>
          </button>
          <h1 class="sheet-title">{{ currentSheet.name }}</h1>
          <div class="sheet-actions">
            <!-- Future: Add sheet-specific actions -->
          </div>
        </div>

        <div class="mobile-sheet-content">
          <SheetContainer
            :show="true"
            :document="currentSheet"
            context="mobile"
            @close="closeSheet"
          />
        </div>
      </div>

      <!-- Mobile HUD View -->
      <div v-else class="mobile-hud-content">
        <!-- Mobile Tab Navigation -->
        <div class="tab-navigation">
          <div class="tab-scroll-container">
            <button
              v-for="tab in availableTabs"
              :key="tab.id"
              class="tab-button"
              :class="{ 'tab-active': activeTab === tab.id }"
              @click="setActiveTab(tab.id)"
            >
              <i :class="`mdi ${tab.icon} tab-icon`"></i>
              <span class="tab-label">{{ tab.title }}</span>
              <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
            </button>
          </div>
        </div>

        <!-- Mobile Tab Content Area -->
        <div class="tab-content-area">
          <div class="tab-content">
            <component
              :is="getTabComponent(activeTabData?.component)"
              v-if="activeTabData && getTabComponent(activeTabData?.component)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue';
import type { Component } from 'vue';
import { useHUDStore } from '../../stores/hudStore.mjs';
import { useHudNavigation } from '../../composables/useHudNavigation.mjs';
import { useHudLayout } from '../../composables/useHudLayout.mjs';
import SheetContainer from './SheetContainer.vue';

// Import all tab components
import ChatTab from './tabs/ChatTab.vue';
import ActorsTab from './tabs/ActorsTab.vue';
import CharactersTab from './tabs/CharactersTab.vue';
import ItemsTab from './tabs/ItemsTab.vue';
import CompendiumTab from './tabs/CompendiumTab.vue';
import DocumentsTab from './tabs/DocumentsTab.vue';
import TurnOrderTab from './tabs/TurnOrderTab.vue';

// Component mapping to convert string names to component references
const componentMap: Record<string, Component> = {
  'ChatTab': ChatTab,
  'ActorsTab': ActorsTab,
  'CharactersTab': CharactersTab,
  'ItemsTab': ItemsTab,
  'CompendiumTab': CompendiumTab,
  'DocumentsTab': DocumentsTab,
  'TurnOrderTab': TurnOrderTab
};

// Helper function to safely get component from map
function getTabComponent(componentName?: string): Component | undefined {
  if (!componentName) return undefined;
  return componentMap[componentName];
}

// Props
interface Props {
  /** Override device detection for testing */
  forceLayout?: 'desktop' | 'mobile';
}

const props = withDefaults(defineProps<Props>(), {
  forceLayout: undefined
});

// Store and composables
const hudStore = useHUDStore();
const { isMobile, isDesktop } = useHudLayout();

// Determine layout mode (with override for testing)
const layoutMode = props.forceLayout || (isMobile.value ? 'mobile' : 'desktop');
const isDesktopLayout = layoutMode === 'desktop';
const isMobileLayout = layoutMode === 'mobile';

// Navigation composable with context
const {
  activeTab,
  currentSheet,
  availableTabs,
  activeTabData,
  isInSheetView,
  setActiveTab,
  openSheet,
  closeSheet,
  initializeFromUrl
} = useHudNavigation({
  isMobile: isMobileLayout,
  basePath: isMobileLayout ? '/mobile' : '/encounter'
});

// Provide navigation context to child components
provide('hudNavigationContext', {
  openSheet,
  isMobile: isMobileLayout,
  isDesktop: isDesktopLayout
});

// Initialize from URL on mount
initializeFromUrl();
</script>

<style scoped>
/* Base Container */
.hud-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

/* ============================================================================
   DESKTOP SIDEBAR LAYOUT
   ============================================================================ */

.hud-desktop {
  flex-direction: row;
}

.hud-sidebar {
  height: 100%;
  background: rgba(26, 26, 26, 0.95);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease, transform 0.3s ease;
  z-index: 1000;
  width: 320px;
}

.sidebar-collapsed {
  width: 60px;
}

.sidebar-left {
  border-left: none;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  min-height: 56px;
  flex-shrink: 0;
}

.sidebar-title {
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.sidebar-controls {
  display: flex;
  gap: 4px;
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

.sidebar-tabs {
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  gap: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-tab {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.sidebar-tab:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.sidebar-tab.tab-active {
  background: rgba(59, 130, 246, 0.6);
  color: white;
  border-color: rgba(59, 130, 246, 0.8);
}

.tab-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.tab-label {
  flex: 1;
  min-width: 0;
}

.tab-badge {
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  line-height: 1.2;
}

.sidebar-content {
  flex: 1;
  overflow: hidden;
  background: transparent;
}

.tab-content {
  height: 100%;
  overflow: auto;
}

/* ============================================================================
   MOBILE FULL-SCREEN LAYOUT
   ============================================================================ */

.hud-mobile {
  background: #f5f5f4; /* stone-100 */
}

.dark .hud-mobile {
  background: #1c1917; /* stone-900 */
}

.mobile-hud-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Mobile Sheet View */
.mobile-sheet-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: white;
}

.dark .mobile-sheet-view {
  background: #1c1917;
}

.mobile-sheet-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e7e5e4;
  min-height: 56px;
  flex-shrink: 0;
}

.dark .mobile-sheet-header {
  background: #292524;
  border-bottom-color: #44403c;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.2s ease;
  min-height: 44px;
}

.back-button:hover {
  background: rgba(59, 130, 246, 0.1);
}

.back-button:active {
  transform: scale(0.98);
}

.sheet-title {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  color: #1c1917;
  margin: 0 16px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark .sheet-title {
  color: #fafaf9;
}

.sheet-actions {
  min-width: 44px;
}

.mobile-sheet-content {
  flex: 1;
  overflow: hidden;
  background: white;
}

.dark .mobile-sheet-content {
  background: #1c1917;
}

/* Mobile HUD View */
.mobile-hud-content {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.tab-navigation {
  background: white;
  border-bottom: 1px solid #e7e5e4;
  padding: 8px 0;
  flex-shrink: 0;
}

.dark .tab-navigation {
  background: #292524;
  border-bottom-color: #44403c;
}

.tab-scroll-container {
  display: flex;
  overflow-x: auto;
  gap: 4px;
  padding: 0 16px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tab-scroll-container::-webkit-scrollbar {
  display: none;
}

.tab-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: rgba(120, 113, 108, 0.1);
  border: 1px solid rgba(120, 113, 108, 0.2);
  border-radius: 6px;
  color: #78716c;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  min-width: 44px;
  min-height: 44px;
  flex-shrink: 0;
}

.dark .tab-button {
  background: rgba(168, 162, 158, 0.1);
  border-color: rgba(168, 162, 158, 0.2);
  color: #a8a29e;
}

.tab-button:active {
  transform: scale(0.98);
}

.tab-button.tab-active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.tab-content-area {
  flex: 1;
  overflow: hidden;
  background: white;
}

.dark .tab-content-area {
  background: #1c1917;
}

.tab-content-area .tab-content {
  height: 100%;
  overflow: auto;
}

/* Mobile tab labels - hide to match desktop icon-only style */
.hud-mobile .tab-label {
  display: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .tab-button {
    min-width: 44px;
    padding: 10px 12px;
  }

  .tab-scroll-container {
    padding: 0 12px;
  }
}

/* Deep selector overrides for mobile touch interactions */
:deep(.character-card),
:deep(.actor-item),
:deep(.item-card) {
  min-height: 48px !important;
  cursor: pointer;
}

:deep(.character-card:active),
:deep(.actor-item:active),
:deep(.item-card:active) {
  transform: scale(0.98);
  transition: transform 0.1s ease;
}
</style>