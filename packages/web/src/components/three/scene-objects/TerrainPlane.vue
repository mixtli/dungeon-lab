<script setup lang="ts">
import { computed } from 'vue';
import type { TerrainElement } from '@dungeon-lab/shared/types/maps.mjs';

const props = defineProps<{
  element: TerrainElement;
  selected?: boolean;
}>();

const width = computed(() => props.element.widthCells);
const depth = computed(() => props.element.depthCells);
</script>

<template>
  <TresMesh
    :position="[element.position.x, element.position.y, element.position.z]"
    :rotation="[-Math.PI / 2, 0, 0]"
    :receive-shadow="true"
    :user-data="{ elementId: element.id, elementType: 'terrain' }"
  >
    <TresPlaneGeometry :args="[width, depth]" />
    <TresMeshStandardMaterial
      :color="element.material.color"
      :roughness="element.material.roughness"
      :metalness="element.material.metalness"
      :side="2"
    />
  </TresMesh>
  <!-- Selection highlight -->
  <TresMesh
    v-if="selected"
    :position="[element.position.x, element.position.y + 0.01, element.position.z]"
    :rotation="[-Math.PI / 2, 0, 0]"
  >
    <TresPlaneGeometry :args="[width + 0.05, depth + 0.05]" />
    <TresMeshBasicMaterial
      color="#6366f1"
      :transparent="true"
      :opacity="0.2"
      :side="2"
    />
  </TresMesh>
</template>
