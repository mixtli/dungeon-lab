<script setup lang="ts">
import { computed } from 'vue';
import type { PropElement } from '@dungeon-lab/shared/types/maps.mjs';

const props = defineProps<{
  element: PropElement;
  selected?: boolean;
}>();

// For now, props render as a simple box placeholder.
// GLB loading will be added when the asset system is integrated.
const t = computed(() => props.element.transform);
</script>

<template>
  <TresGroup
    :position="[t.position.x, t.position.y, t.position.z]"
    :rotation="[t.rotation.x, t.rotation.y, t.rotation.z]"
    :scale="[t.scale.x, t.scale.y, t.scale.z]"
    :user-data="{ elementId: element.id, elementType: 'prop' }"
  >
    <!-- Placeholder box for props -->
    <TresMesh
      :cast-shadow="element.castShadow"
      :receive-shadow="element.receiveShadow"
      :user-data="{ elementId: element.id, elementType: 'prop' }"
    >
      <TresBoxGeometry :args="[1, 1, 1]" />
      <TresMeshStandardMaterial color="#8b5cf6" :roughness="0.8" />
    </TresMesh>

    <!-- Selection outline -->
    <TresMesh v-if="selected">
      <TresBoxGeometry :args="[1.1, 1.1, 1.1]" />
      <TresMeshBasicMaterial
        color="#6366f1"
        :transparent="true"
        :opacity="0.15"
        :wireframe="true"
      />
    </TresMesh>
  </TresGroup>
</template>
