<script setup lang="ts">
import { computed } from 'vue';
import type { WallElement, PortalElement, MapElement } from '@dungeon-lab/shared/types/maps.mjs';
import PortalObject from './PortalObject.vue';

const props = defineProps<{
  element: WallElement;
  elements: MapElement[];
  selected?: boolean;
}>();

// Find portals attached to this wall
const wallPortals = computed(() =>
  props.elements.filter(
    (e): e is PortalElement => e.type === 'portal' && e.wallId === props.element.id
  )
);

const wallProps = computed(() => {
  const { start, end, height, thickness, elevation } = props.element;
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);

  const cx = (start.x + end.x) / 2;
  const cz = (start.z + end.z) / 2;
  const cy = elevation + height / 2;

  return { length, angle, cx, cy, cz, height, thickness };
});
</script>

<template>
  <TresGroup
    :position="[wallProps.cx, wallProps.cy, wallProps.cz]"
    :rotation="[0, wallProps.angle, 0]"
    :user-data="{ elementId: element.id, elementType: 'wall' }"
  >
    <TresMesh :cast-shadow="true" :receive-shadow="true">
      <TresBoxGeometry :args="[element.thickness, wallProps.height, wallProps.length]" />
      <TresMeshStandardMaterial
        :color="element.material.color"
        :roughness="element.material.roughness"
        :metalness="element.material.metalness"
      />
    </TresMesh>

    <TresMesh v-if="selected">
      <TresBoxGeometry :args="[element.thickness + 0.05, wallProps.height + 0.05, wallProps.length + 0.05]" />
      <TresMeshBasicMaterial
        color="#6366f1"
        :transparent="true"
        :opacity="0.2"
        :wireframe="true"
      />
    </TresMesh>

    <PortalObject
      v-for="portal in wallPortals"
      :key="portal.id"
      :element="portal"
      :wall="element"
      :wall-length="wallProps.length"
    />
  </TresGroup>
</template>
