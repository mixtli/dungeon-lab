<script setup lang="ts">
import { ref, computed } from 'vue';
import { TresCanvas } from '@tresjs/core';
import { OrbitControls } from '@tresjs/cientos';
import type {
  DungeonMapData,
  TerrainElement,
  WallElement,
  LightElement,
  PropElement,
  Vec2,
} from '@dungeon-lab/shared/types/maps.mjs';
import TerrainPlane from '../scene-objects/TerrainPlane.vue';
import WallSegment from '../scene-objects/WallSegment.vue';
import LightSource from '../scene-objects/LightSource.vue';
import PropObject from '../scene-objects/PropObject.vue';
import FogOfWarOverlay from './FogOfWarOverlay.vue';

const props = defineProps<{
  mapData: DungeonMapData;
  fowViewpoint?: Vec2 | null;
  fowRange?: number;
  fowPersonalVision?: number;
}>();

const emit = defineEmits<{
  'ground-click': [event: { x: number; z: number }];
}>();

const orbitEnabled = ref(true);

// Element type filters
const terrainElements = computed(() =>
  props.mapData.elements.filter((e): e is TerrainElement => e.type === 'terrain')
);
const wallElements = computed(() =>
  props.mapData.elements.filter((e): e is WallElement => e.type === 'wall')
);
const lightElements = computed(() =>
  props.mapData.elements.filter((e): e is LightElement => e.type === 'light')
);
const propElements = computed(() =>
  props.mapData.elements.filter((e): e is PropElement => e.type === 'prop')
);

const bgColor = computed(
  () => props.mapData.environment?.backgroundColor ?? '#1a1a2e'
);

function handleGroundClick(event: { point: { x: number; z: number } }) {
  emit('ground-click', { x: event.point.x, z: event.point.z });
}
</script>

<template>
  <TresCanvas :clear-color="bgColor" :shadows="true">
    <!-- Camera -->
    <TresPerspectiveCamera :position="[10, 10, 10]" :look-at="[0, 0, 0]" />

    <OrbitControls
      make-default
      :enabled="orbitEnabled"
      :enable-damping="true"
      :damping-factor="0.1"
    />

    <!-- Ambient light -->
    <TresAmbientLight
      :color="mapData.environment?.ambientColor ?? '#ffffff'"
      :intensity="mapData.environment?.ambientIntensity ?? 0.4"
    />
    <!-- Directional light -->
    <TresDirectionalLight
      :position="[5, 10, 5]"
      :color="mapData.environment?.directionalColor ?? '#ffffff'"
      :intensity="mapData.environment?.directionalIntensity ?? 0.6"
      :cast-shadow="true"
    />

    <!-- Fog -->
    <TresFog
      v-if="mapData.environment?.fogEnabled"
      :color="mapData.environment.fogColor"
      :near="mapData.environment.fogNear"
      :far="mapData.environment.fogFar"
    />

    <!-- Grid helper -->
    <TresGridHelper
      v-if="mapData.grid?.visible !== false"
      :args="[50, 50, mapData.grid?.color ?? '#444444', mapData.grid?.color ?? '#444444']"
      :position="[0, 0, 0]"
    />

    <!-- Ground plane for raycasting -->
    <TresMesh
      :rotation="[-Math.PI / 2, 0, 0]"
      :position="[0, -0.01, 0]"
      name="ground-plane"
      @click="handleGroundClick"
    >
      <TresPlaneGeometry :args="[100, 100]" />
      <TresMeshBasicMaterial
        :transparent="true"
        :opacity="0"
        :side="2"
        :depth-write="false"
      />
    </TresMesh>

    <!-- Terrain elements -->
    <TerrainPlane
      v-for="el in terrainElements"
      :key="el.id"
      :element="el"
    />

    <!-- Wall elements -->
    <WallSegment
      v-for="el in wallElements"
      :key="el.id"
      :element="el"
      :elements="mapData.elements"
    />

    <!-- Light elements -->
    <LightSource
      v-for="el in lightElements"
      :key="el.id"
      :element="el"
    />

    <!-- Prop elements -->
    <PropObject
      v-for="el in propElements"
      :key="el.id"
      :element="el"
    />

    <!-- Token slot - parent can insert token meshes here -->
    <slot name="tokens" />

    <!-- Fog of War -->
    <FogOfWarOverlay
      v-if="fowViewpoint"
      :elements="mapData.elements"
      :environment="mapData.environment"
      :viewpoint="fowViewpoint"
      :fow-range="fowRange"
      :personal-vision="fowPersonalVision"
    />
  </TresCanvas>
</template>
