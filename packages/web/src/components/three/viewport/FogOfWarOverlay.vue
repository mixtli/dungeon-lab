<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import * as THREE from 'three';
import {
  getBlockingSegments,
  computeVisibilityPolygon,
  computeLightPolygon,
} from '@/utils/visibility.mjs';
import { unionPolygons, intersectPolygons, circlePolygon } from '@/utils/polygonOps.mjs';
import type {
  WallElement,
  PortalElement,
  LightElement,
  MapElement,
  Vec2,
  EnvironmentConfig,
} from '@dungeon-lab/shared/types/maps.mjs';

const props = defineProps<{
  elements: MapElement[];
  environment: EnvironmentConfig;
  viewpoint: Vec2 | null;
  fowRange?: number;
  personalVision?: number;
}>();

const isActive = computed(() => props.viewpoint !== null);
const globalIllumination = computed(() => props.environment.globalIllumination);

const walls = computed(() => {
  if (!isActive.value) return [];
  return props.elements.filter((e): e is WallElement => e.type === 'wall');
});

const portals = computed(() => {
  if (!isActive.value) return [];
  return props.elements.filter((e): e is PortalElement => e.type === 'portal');
});

const visionSegments = computed(() => {
  if (!isActive.value) return [];
  return getBlockingSegments(walls.value, portals.value, 'blockVision');
});

const visibility = computed(() => {
  if (!props.viewpoint) return null;
  return computeVisibilityPolygon(
    props.viewpoint,
    visionSegments.value,
    props.fowRange ?? 30
  );
});

const lightBlockingSegments = computed(() => {
  if (!isActive.value || globalIllumination.value) return [];
  return getBlockingSegments(walls.value, portals.value, 'blockLight');
});

const lights = computed(() => {
  if (!isActive.value || globalIllumination.value) return [];
  return props.elements.filter(
    (e): e is LightElement =>
      e.type === 'light' && e.lightType !== 'ambient' && e.dimRange > 0
  );
});

const illuminatedArea = computed<Vec2[][]>(() => {
  if (globalIllumination.value) return [];

  const polys: Vec2[][] = [];

  for (const light of lights.value) {
    const origin: Vec2 = { x: light.position.x, z: light.position.z };
    polys.push(
      computeLightPolygon(origin, lightBlockingSegments.value, light.dimRange)
    );
  }

  if ((props.personalVision ?? 0) > 0 && props.viewpoint) {
    polys.push(circlePolygon(props.viewpoint, props.personalVision!));
  }

  return unionPolygons(polys);
});

const fogGeometry = shallowRef<THREE.ShapeGeometry | null>(null);
const halfFogGeometry = shallowRef<THREE.ShapeGeometry | null>(null);

function buildShapeWithHoles(polygons: Vec2[][]): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-100, -100);
  shape.lineTo(100, -100);
  shape.lineTo(100, 100);
  shape.lineTo(-100, 100);
  shape.closePath();

  for (const polygon of polygons) {
    if (polygon.length > 2) {
      const hole = new THREE.Path();
      hole.moveTo(polygon[0].x, -polygon[0].z);
      for (let i = 1; i < polygon.length; i++) {
        hole.lineTo(polygon[i].x, -polygon[i].z);
      }
      hole.closePath();
      shape.holes.push(hole);
    }
  }

  return new THREE.ShapeGeometry(shape);
}

watch(
  [visibility, illuminatedArea, globalIllumination],
  ([vis, illum, isGlobal]) => {
    fogGeometry.value?.dispose();
    halfFogGeometry.value?.dispose();

    if (!vis) {
      fogGeometry.value = null;
      halfFogGeometry.value = null;
      return;
    }

    if (isGlobal) {
      fogGeometry.value = buildShapeWithHoles([vis.fullVisible]);

      const hasHalfWalls = visionSegments.value.some(
        (s) => s.blockLevel === 'half'
      );
      halfFogGeometry.value = hasHalfWalls
        ? buildShapeWithHoles([vis.halfVisible])
        : null;
    } else {
      if (illum.length === 0) {
        fogGeometry.value = buildShapeWithHoles([]);
      } else {
        const visibleAndLit = intersectPolygons([vis.fullVisible], illum);
        fogGeometry.value = buildShapeWithHoles(visibleAndLit);
      }

      const hasHalfWalls = visionSegments.value.some(
        (s) => s.blockLevel === 'half'
      );
      if (hasHalfWalls) {
        const halfVisibleAndLit =
          illum.length === 0
            ? []
            : intersectPolygons([vis.halfVisible], illum);
        halfFogGeometry.value = buildShapeWithHoles(halfVisibleAndLit);
      } else {
        halfFogGeometry.value = null;
      }
    }
  },
  { immediate: true }
);

const fogMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 1.0,
  depthWrite: false,
  depthTest: false,
  side: THREE.DoubleSide,
});

const halfFogMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
  depthTest: false,
  side: THREE.DoubleSide,
});
</script>

<template>
  <TresMesh
    v-if="isActive && fogGeometry"
    :geometry="fogGeometry"
    :material="fogMaterial"
    :rotation="[-Math.PI / 2, 0, 0]"
    :position="[0, 0.02, 0]"
    :render-order="999"
  />

  <TresMesh
    v-if="isActive && halfFogGeometry"
    :geometry="halfFogGeometry"
    :material="halfFogMaterial"
    :rotation="[-Math.PI / 2, 0, 0]"
    :position="[0, 0.021, 0]"
    :render-order="998"
  />
</template>
