<script setup lang="ts">
import { computed } from 'vue';
import type { PortalElement, WallElement } from '@dungeon-lab/shared/types/maps.mjs';

const props = defineProps<{
  element: PortalElement;
  wall: WallElement;
  wallLength: number;
  selected?: boolean;
}>();

const portalProps = computed(() => {
  const offsetAlongWall = (props.element.position - 0.5) * props.wallLength;
  const localX = 0;
  const localY = props.element.height / 2 - props.wall.height / 2;
  const localZ = offsetAlongWall;
  const portalThickness = props.wall.thickness + 0.1;

  return { localX, localY, localZ, portalThickness };
});

const portalColor = computed(() => {
  if (props.element.state === 'open') return '#22c55e';
  if (props.element.state === 'locked') return '#ef4444';
  return '#a87832';
});
</script>

<template>
  <TresGroup>
    <TresMesh
      :position="[portalProps.localX, portalProps.localY, portalProps.localZ]"
      :user-data="{ elementId: element.id, elementType: 'portal' }"
    >
      <TresBoxGeometry :args="[portalProps.portalThickness, element.height, element.width]" />
      <TresMeshStandardMaterial
        :color="portalColor"
        :transparent="element.state === 'open'"
        :opacity="element.state === 'open' ? 0.3 : 1"
        :roughness="0.6"
      />
    </TresMesh>

    <TresMesh
      v-if="selected"
      :position="[portalProps.localX, portalProps.localY, portalProps.localZ]"
    >
      <TresBoxGeometry :args="[portalProps.portalThickness + 0.1, element.height + 0.1, element.width + 0.1]" />
      <TresMeshBasicMaterial
        color="#6366f1"
        :transparent="true"
        :opacity="0.2"
        :wireframe="true"
      />
    </TresMesh>
  </TresGroup>
</template>
