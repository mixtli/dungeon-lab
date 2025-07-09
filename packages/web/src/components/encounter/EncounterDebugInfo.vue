<template>
  <div v-if="visible" class="debug-overlay">
    <div class="debug-panel">
      <h4 class="debug-title">Debug Information</h4>
      
      <!-- Encounter Info -->
      <div class="debug-section">
        <div class="debug-section-title">Encounter</div>
        <div class="debug-item">
          <span class="debug-label">ID:</span>
          <span class="debug-value">{{ encounterInfo.id || 'None' }}</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">Map ID:</span>
          <span class="debug-value">{{ encounterInfo.mapId || 'None' }}</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">Tokens:</span>
          <span class="debug-value">{{ encounterInfo.tokenCount || 0 }}</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">Selected:</span>
          <span class="debug-value">{{ encounterInfo.selectedToken || 'None' }}</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">Socket:</span>
          <span class="debug-value" :class="{ 'debug-connected': encounterInfo.isConnected, 'debug-disconnected': !encounterInfo.isConnected }">
            {{ encounterInfo.isConnected ? 'Connected' : 'Disconnected' }}
          </span>
        </div>
      </div>

      <!-- Map/Viewport Info -->
      <div class="debug-section">
        <div class="debug-section-title">Map Viewer</div>
        <div class="debug-item">
          <span class="debug-label">Viewport:</span>
          <span class="debug-value">
            {{ viewportInfo.x }}, {{ viewportInfo.y }} ({{ viewportInfo.scale }}%)
          </span>
        </div>
        <div class="debug-item">
          <span class="debug-label">Platform:</span>
          <span class="debug-value">{{ viewportInfo.platform }}</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">Map:</span>
          <span class="debug-value">{{ viewportInfo.mapName || 'None' }}</span>
        </div>
      </div>

      <!-- Mouse Coordinates -->
      <div class="debug-section">
        <div class="debug-section-title">Mouse Position</div>
        <div class="debug-item">
          <span class="debug-label">Screen:</span>
          <span class="debug-value">{{ mouseInfo.screenX }}, {{ mouseInfo.screenY }}</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">World:</span>
          <span class="debug-value">{{ mouseInfo.worldX }}, {{ mouseInfo.worldY }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
interface Props {
  visible: boolean;
  encounterInfo: {
    id?: string;
    mapId?: string;
    tokenCount?: number;
    selectedToken?: string;
    isConnected?: boolean;
  };
  viewportInfo: {
    x: number;
    y: number;
    scale: number;
    platform: string;
    mapName?: string;
  };
  mouseInfo: {
    screenX: number;
    screenY: number;
    worldX: number;
    worldY: number;
  };
}

withDefaults(defineProps<Props>(), {
  visible: false,
  encounterInfo: () => ({
    id: undefined,
    mapId: undefined,
    tokenCount: 0,
    selectedToken: undefined,
    isConnected: false
  }),
  viewportInfo: () => ({
    x: 0,
    y: 0,
    scale: 100,
    platform: 'desktop',
    mapName: undefined
  }),
  mouseInfo: () => ({
    screenX: 0,
    screenY: 0,
    worldX: 0,
    worldY: 0
  })
});
</script>

<style scoped>
.debug-overlay {
  @apply fixed top-4 left-4 pointer-events-auto z-[100];
}

.debug-panel {
  @apply bg-black bg-opacity-90 text-white p-3 rounded-lg shadow-lg;
  @apply border border-gray-600;
  min-width: 200px;
  font-family: 'Courier New', monospace;
}

.debug-title {
  @apply text-sm font-bold mb-3 text-blue-300 border-b border-gray-600 pb-2;
}

.debug-section {
  @apply mb-3;
}

.debug-section:last-child {
  @apply mb-0;
}

.debug-section-title {
  @apply text-xs font-semibold text-gray-300 mb-1 uppercase tracking-wide;
}

.debug-item {
  @apply flex justify-between items-center text-xs mb-1;
}

.debug-label {
  @apply text-gray-400 mr-2;
}

.debug-value {
  @apply text-white font-mono;
}

.debug-connected {
  @apply text-green-400;
}

.debug-disconnected {
  @apply text-red-400;
}
</style> 