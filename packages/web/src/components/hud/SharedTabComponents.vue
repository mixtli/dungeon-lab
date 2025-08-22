<template>
  <!-- This component manages shared tab instances -->
  <!-- Each tab component is rendered once and teleported to appropriate locations -->
  
  <!-- Only render teleports when targets exist -->
  <template v-if="targetsReady">
    <!-- Chat Tab -->
    <Teleport :to="getChatTarget()" v-if="shouldRenderTab('chat')">
      <div class="tab-content">
        <ChatTab />
      </div>
    </Teleport>
    
    <!-- Actors Tab -->
    <Teleport :to="getActorsTarget()" v-if="shouldRenderTab('actors')">
      <div class="tab-content">
        <ActorsTab />
      </div>
    </Teleport>
    
    <!-- Characters Tab -->
    <Teleport :to="getCharactersTarget()" v-if="shouldRenderTab('characters')">
      <div class="tab-content">
        <CharactersTab />
      </div>
    </Teleport>
    
    <!-- Items Tab -->
    <Teleport :to="getItemsTarget()" v-if="shouldRenderTab('items')">
      <div class="tab-content">
        <ItemsTab />
      </div>
    </Teleport>
    
    <!-- Compendium Tab -->
    <Teleport :to="getCompendiumTarget()" v-if="shouldRenderTab('compendium')">
      <div class="tab-content">
        <CompendiumTab />
      </div>
    </Teleport>
    
    <!-- Documents Tab -->
    <Teleport :to="getDocumentsTarget()" v-if="shouldRenderTab('documents')">
      <div class="tab-content">
        <DocumentsTab />
      </div>
    </Teleport>
    
    <!-- Turn Order Tab -->
    <Teleport :to="getTurnOrderTarget()" v-if="shouldRenderTab('turnOrder')">
      <div class="tab-content">
        <TurnOrderTab />
      </div>
    </Teleport>
  </template>
</template>

<script setup lang="ts">
import { nextTick, ref, onMounted, watch } from 'vue';
import { useHUDStore } from '../../stores/hudStore.mjs';
import type { SidebarTabType } from '../../types/hud.mjs';
import ChatTab from './tabs/ChatTab.vue';
import ActorsTab from './tabs/ActorsTab.vue';
import CharactersTab from './tabs/CharactersTab.vue';
import ItemsTab from './tabs/ItemsTab.vue';
import CompendiumTab from './tabs/CompendiumTab.vue';
import DocumentsTab from './tabs/DocumentsTab.vue';
import TurnOrderTab from './tabs/TurnOrderTab.vue';

const hudStore = useHUDStore();
const targetsReady = ref(false);

// Check if teleport targets exist in DOM
function checkTargetsExist(): boolean {
  const sidebarTargets = [
    '#chat-sidebar-target',
    '#actors-sidebar-target',
    '#characters-sidebar-target',
    '#items-sidebar-target',
    '#compendium-sidebar-target',
    '#documents-sidebar-target',
    '#turnOrder-sidebar-target'
  ];
  
  // Check that sidebar targets exist
  const sidebarReady = sidebarTargets.every(target => document.querySelector(target));
  if (!sidebarReady) return false;
  
  // Check that floating window targets exist for any floating tabs
  const floatingTabTypes = Object.values(hudStore.floatingWindows).map(w => w.tabType);
  for (const tabType of floatingTabTypes) {
    const target = `#${tabType}-floating-target`;
    if (!document.querySelector(target)) {
      return false;
    }
  }
  
  return true;
}

// Wait for targets to be available
async function waitForTargets(): Promise<void> {
  let attempts = 0;
  const maxAttempts = 50; // 500ms max wait
  
  while (!checkTargetsExist() && attempts < maxAttempts) {
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 10));
    attempts++;
  }
  
  targetsReady.value = checkTargetsExist();
}

onMounted(() => {
  waitForTargets();
});

// Watch for changes in floating windows and recheck targets
watch(
  () => hudStore.floatingWindows, 
  () => {
    // When floating windows change, recheck targets
    waitForTargets();
  },
  { deep: true }
);

function isTabFloating(tabType: SidebarTabType): boolean {
  return Object.values(hudStore.floatingWindows).some(
    window => window.tabType === tabType
  );
}

function shouldRenderTab(tabType: SidebarTabType): boolean {
  const tab = hudStore.sidebar.tabs[tabType];
  if (!tab?.visible) return false;
  
  const isFloating = isTabFloating(tabType);
  const isActiveSidebarTab = !isFloating && hudStore.sidebar.activeTab === tabType;
  
  // Render if it's either the active sidebar tab or floating
  return isActiveSidebarTab || isFloating;
}

function getChatTarget(): string {
  return isTabFloating('chat') ? '#chat-floating-target' : '#chat-sidebar-target';
}


function getActorsTarget(): string {
  return isTabFloating('actors') ? '#actors-floating-target' : '#actors-sidebar-target';
}

function getCharactersTarget(): string {
  return isTabFloating('characters') ? '#characters-floating-target' : '#characters-sidebar-target';
}

function getItemsTarget(): string {
  return isTabFloating('items') ? '#items-floating-target' : '#items-sidebar-target';
}

function getCompendiumTarget(): string {
  return isTabFloating('compendium') ? '#compendium-floating-target' : '#compendium-sidebar-target';
}

function getDocumentsTarget(): string {
  return isTabFloating('documents') ? '#documents-floating-target' : '#documents-sidebar-target';
}

function getTurnOrderTarget(): string {
  return isTabFloating('turnOrder') ? '#turnOrder-floating-target' : '#turnOrder-sidebar-target';
}
</script>

<style scoped>
.tab-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>