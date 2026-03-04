<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { useTresContext } from '@tresjs/core';
import type { LightElement } from '@dungeon-lab/shared/types/maps.mjs';
import * as THREE from 'three';

const props = defineProps<{
  element: LightElement;
  selected?: boolean;
}>();

const { scene } = useTresContext();
const lightRef = ref<THREE.Light | null>(null);

function createLight(): THREE.Light {
  if (props.element.lightType === 'spot') {
    return new THREE.SpotLight(
      props.element.color,
      props.element.intensity,
      props.element.dimRange,
      Math.PI / 4,
      0.5
    );
  }
  return new THREE.PointLight(
    props.element.color,
    props.element.intensity,
    props.element.dimRange
  );
}

function syncLight() {
  if (lightRef.value) {
    scene.value.remove(lightRef.value);
    lightRef.value.dispose();
  }
  const light = createLight();
  light.position.set(
    props.element.position.x,
    props.element.position.y,
    props.element.position.z
  );
  light.castShadow = props.element.castShadow;
  lightRef.value = light;
  scene.value.add(light);
}

watch(
  () => [
    props.element.lightType,
    props.element.color,
    props.element.intensity,
    props.element.dimRange,
    props.element.position.x,
    props.element.position.y,
    props.element.position.z,
    props.element.castShadow,
  ],
  syncLight,
  { immediate: true }
);

onBeforeUnmount(() => {
  if (lightRef.value) {
    scene.value.remove(lightRef.value);
    lightRef.value.dispose();
    lightRef.value = null;
  }
});
</script>

<template>
  <TresGroup>
    <!-- Visible sphere marker -->
    <TresMesh
      :position="[element.position.x, element.position.y, element.position.z]"
      :user-data="{ elementId: element.id, elementType: 'light' }"
    >
      <TresSphereGeometry :args="[0.15, 8, 8]" />
      <TresMeshBasicMaterial
        :color="element.color"
        :transparent="true"
        :opacity="0.9"
      />
    </TresMesh>

    <!-- Range indicator (bright range) -->
    <TresMesh
      v-if="selected"
      :position="[element.position.x, element.position.y, element.position.z]"
    >
      <TresSphereGeometry :args="[element.brightRange, 16, 16]" />
      <TresMeshBasicMaterial
        :color="element.color"
        :transparent="true"
        :opacity="0.05"
        :wireframe="true"
      />
    </TresMesh>

    <!-- Range indicator (dim range) -->
    <TresMesh
      v-if="selected"
      :position="[element.position.x, element.position.y, element.position.z]"
    >
      <TresSphereGeometry :args="[element.dimRange, 16, 16]" />
      <TresMeshBasicMaterial
        color="#6366f1"
        :transparent="true"
        :opacity="0.03"
        :wireframe="true"
      />
    </TresMesh>
  </TresGroup>
</template>
