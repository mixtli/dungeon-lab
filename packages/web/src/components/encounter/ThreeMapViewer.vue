<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';
import type { Token } from '@dungeon-lab/shared/types/tokens.mjs';
import type { DungeonMapData } from '@dungeon-lab/shared/types/maps.mjs';
import EncounterSceneCanvas from '../three/viewport/EncounterSceneCanvas.vue';

interface Props {
  mapData?: IMapResponse;
  tokens?: Token[];
  selectedTokenId?: string;
  targetTokenIds?: Set<string>;
  platform?: string;
}

const props = withDefaults(defineProps<Props>(), {
  platform: 'desktop',
});

interface Emits {
  (e: 'token-selected', tokenId: string, modifiers?: { shift?: boolean; ctrl?: boolean; alt?: boolean }): void;
  (e: 'token-moved', tokenId: string, gridX: number, gridY: number): void;
  (e: 'viewport-changed', viewport: { x: number; y: number; scale: number }): void;
  (e: 'canvas-click', x: number, y: number, event?: MouseEvent): void;
  (e: 'canvas-right-click', x: number, y: number, event?: MouseEvent): void;
  (e: 'mousemove', event: MouseEvent, worldX: number, worldY: number): void;
  (e: 'show-token-context-menu', contextMenuData: { token: Token; position: { x: number; y: number } }): void;
  (e: 'show-encounter-context-menu', contextMenuData: { position: { x: number; y: number } }): void;
  (e: 'map-loaded', mapData: IMapResponse): void;
  (e: 'map-error', error: string): void;
}

const emit = defineEmits<Emits>();

const isLoaded = ref(false);

// Extract DungeonMapData from IMapResponse
const dungeonMapData = computed<DungeonMapData | null>(() => {
  if (!props.mapData?.mapData) return null;
  return props.mapData.mapData as DungeonMapData;
});

// Grid cell size from map data
const gridCellSize = computed(() => {
  return dungeonMapData.value?.grid?.cellSize ?? 1;
});

// Convert token grid bounds to 3D world positions (XZ plane, Y=up)
const tokenPositions = computed(() => {
  if (!props.tokens) return [];
  const cellSize = gridCellSize.value;

  return props.tokens.map((token) => {
    // Center of the token in grid coordinates
    const centerGridX = (token.bounds.topLeft.x + token.bounds.bottomRight.x + 1) / 2;
    const centerGridY = (token.bounds.topLeft.y + token.bounds.bottomRight.y + 1) / 2;
    // Token size in cells
    const widthCells = token.bounds.bottomRight.x - token.bounds.topLeft.x + 1;

    // Convert grid to world (grid Y maps to world Z)
    const worldX = centerGridX * cellSize;
    const worldZ = centerGridY * cellSize;
    const worldY = token.bounds.elevation * cellSize + 0.01; // slight offset above ground
    const radius = (widthCells * cellSize) / 2;

    return {
      token,
      position: [worldX, worldY, worldZ] as [number, number, number],
      radius,
      isSelected: props.selectedTokenId === token.id,
      isTarget: props.targetTokenIds?.has(token.id) ?? false,
    };
  });
});

// Handle ground click from the 3D canvas
function handleGroundClick(event: { x: number; z: number }) {
  const cellSize = gridCellSize.value;
  const gridX = Math.floor(event.x / cellSize);
  const gridZ = Math.floor(event.z / cellSize);
  emit('canvas-click', gridX, gridZ);
}

// Handle token click in 3D scene
function handleTokenClick(tokenId: string, event?: MouseEvent) {
  const modifiers = event
    ? { shift: event.shiftKey, ctrl: event.ctrlKey || event.metaKey, alt: event.altKey }
    : {};
  emit('token-selected', tokenId, modifiers);
}

// Expose methods for parent (EncounterView) compatibility
function forceSelectToken(tokenId: string) {
  emit('token-selected', tokenId);
}

function screenToWorld(_screenX: number, _screenY: number) {
  // Placeholder - Three.js raycasting would be needed for accurate conversion
  return { x: 0, y: 0 };
}

function getGridSize() {
  return gridCellSize.value;
}

defineExpose({
  forceSelectToken,
  screenToWorld,
  getGridSize,
  isLoaded,
});

// Emit map-loaded when map data is available
watch(dungeonMapData, (data) => {
  if (data && props.mapData) {
    isLoaded.value = true;
    emit('map-loaded', props.mapData);
  }
}, { immediate: true });
</script>

<template>
  <div class="three-map-viewer w-full h-full relative">
    <!-- Loading state -->
    <div v-if="!dungeonMapData" class="flex items-center justify-center h-full bg-gray-900">
      <div class="text-center text-gray-400">
        <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto mb-2" />
        <p>Loading 3D map...</p>
      </div>
    </div>

    <!-- 3D Scene -->
    <EncounterSceneCanvas
      v-if="dungeonMapData"
      :map-data="dungeonMapData"
      @ground-click="handleGroundClick"
    >
      <template #tokens>
        <!-- Token meshes rendered in 3D -->
        <TresGroup v-for="tp in tokenPositions" :key="tp.token.id">
          <!-- Token cylinder/disc -->
          <TresMesh
            :position="tp.position"
            :user-data="{ tokenId: tp.token.id, type: 'token' }"
            @click="() => handleTokenClick(tp.token.id)"
          >
            <TresCylinderGeometry :args="[tp.radius * 0.9, tp.radius * 0.9, 0.1, 16]" />
            <TresMeshStandardMaterial
              :color="tp.isSelected ? '#4f46e5' : tp.isTarget ? '#dc2626' : '#3b82f6'"
              :roughness="0.6"
            />
          </TresMesh>

          <!-- Token label (floating above) -->
          <TresMesh :position="[tp.position[0], tp.position[1] + tp.radius + 0.3, tp.position[2]]">
            <TresSphereGeometry :args="[0.08, 8, 8]" />
            <TresMeshBasicMaterial
              :color="tp.isSelected ? '#818cf8' : '#60a5fa'"
            />
          </TresMesh>

          <!-- Selection ring -->
          <TresMesh
            v-if="tp.isSelected"
            :position="[tp.position[0], tp.position[1] + 0.06, tp.position[2]]"
            :rotation="[-Math.PI / 2, 0, 0]"
          >
            <TresRingGeometry :args="[tp.radius * 0.85, tp.radius * 1.05, 32]" />
            <TresMeshBasicMaterial color="#6366f1" :transparent="true" :opacity="0.8" :side="2" />
          </TresMesh>

          <!-- Target ring -->
          <TresMesh
            v-if="tp.isTarget"
            :position="[tp.position[0], tp.position[1] + 0.06, tp.position[2]]"
            :rotation="[-Math.PI / 2, 0, 0]"
          >
            <TresRingGeometry :args="[tp.radius * 0.85, tp.radius * 1.05, 32]" />
            <TresMeshBasicMaterial color="#ef4444" :transparent="true" :opacity="0.8" :side="2" />
          </TresMesh>
        </TresGroup>
      </template>
    </EncounterSceneCanvas>
  </div>
</template>

<style scoped>
.three-map-viewer {
  background-color: #1a1a2e;
}
</style>
