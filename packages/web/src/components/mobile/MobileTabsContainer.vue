<template>
  <div class="mobile-tabs-container" :class="{ 'landscape-fullscreen': isMobileLandscape }">
    <!-- Encounter Tab Content -->
    <div 
      v-show="activeTab === 'encounter'" 
      class="tab-content encounter-content"
    >
      <EncounterView />
    </div>

    <!-- HUD Tab Content -->
    <div
      v-show="activeTab === 'hud'"
      class="tab-content hud-content"
    >
      <HudContainer forceLayout="mobile" />
    </div>

    <!-- Chat Tab Content -->
    <div 
      v-show="activeTab === 'chat'" 
      class="tab-content chat-content"
    >
      <ChatTab />
    </div>

    <!-- Settings Tab Content -->
    <div 
      v-show="activeTab === 'settings'" 
      class="tab-content settings-content"
    >
      <SettingsView />
    </div>

    <!-- Bottom Navigation - Hide in mobile landscape mode for fullscreen encounter -->
    <BottomNavigation 
      v-if="!isMobileLandscape"
      :activeTab="activeTab"
      :containerMode="true"
      @tab-change="handleTabChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EncounterView from '@/components/encounter/EncounterView.vue';
import HudContainer from '@/components/hud/HudContainer.vue';
import ChatTab from '@/components/hud/tabs/ChatTab.vue';
import SettingsView from '@/views/SettingsView.vue';
import BottomNavigation from '@/components/layout/BottomNavigation.vue';
import { useDeviceAdaptation } from '@/composables/useDeviceAdaptation.mts';

type MobileTabType = 'encounter' | 'hud' | 'chat' | 'settings';

const route = useRoute();
const router = useRouter();
const { isMobileLandscape } = useDeviceAdaptation();

// Tab state
const activeTab = ref<MobileTabType>('encounter');

// Initialize from URL parameters
onMounted(() => {
  // Read initial tab from URL params
  const urlTab = route.query.tab as MobileTabType;
  if (urlTab && ['encounter', 'hud', 'chat', 'settings'].includes(urlTab)) {
    activeTab.value = urlTab;
  }
});

// Handle tab changes from bottom navigation
const handleTabChange = (tab: string) => {
  activeTab.value = tab as MobileTabType;

  // Update URL without navigation
  const query = { ...route.query };
  query.tab = tab;

  // Update URL without triggering navigation
  router.replace({ query });
};

// No longer needed - HUD functionality is self-contained

// Watch for external URL changes (browser back/forward)
watch(() => route.query, (newQuery) => {
  const urlTab = newQuery.tab as string;
  if (urlTab && ['encounter', 'hud', 'chat', 'settings'].includes(urlTab)) {
    activeTab.value = urlTab as MobileTabType;
  }
}, { deep: true });
</script>

<style scoped>
.mobile-tabs-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
}

.tab-content {
  flex: 1;
  overflow: hidden;
  width: 100%;
}

.encounter-content,
.hud-content,
.chat-content,
.settings-content {
  height: 100%;
}

/* Ensure proper layering */
.tab-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 64px; /* Space for bottom navigation */
}

/* Landscape fullscreen mode - no bottom navigation space */
.landscape-fullscreen .tab-content {
  bottom: 0;
}

/* Bottom navigation positioning */
:deep(.bottom-navigation) {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
}
</style>