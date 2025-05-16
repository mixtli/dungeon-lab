<template>
    <div class="layer-panel">
        <h3 class="panel-title">Layers</h3>

        <div class="layers-list">
            <div class="layer-item">
                <div class="layer-header">
                    <input type="checkbox" :checked="wallsVisible"
                        @change="toggleLayerVisibility('walls', ($event.target as HTMLInputElement).checked)" />
                    <span class="layer-name">Walls</span>
                </div>
                <div class="layer-info">
                    <span class="layer-count">{{ walls.length }} objects</span>
                </div>
            </div>
            
            <div class="layer-item">
                <div class="layer-header">
                    <input type="checkbox" :checked="objectWallsVisible"
                        @change="toggleLayerVisibility('objectWalls', ($event.target as HTMLInputElement).checked)" />
                    <span class="layer-name">Object Walls</span>
                    <span class="layer-color" style="background-color: #3399ff;"></span>
                </div>
                <div class="layer-info">
                    <span class="layer-count">{{ objectWalls?.length || 0 }} objects</span>
                </div>
            </div>

            <div class="layer-item">
                <div class="layer-header">
                    <input type="checkbox" :checked="portalsVisible"
                        @change="toggleLayerVisibility('portals', ($event.target as HTMLInputElement).checked)" />
                    <span class="layer-name">Portals</span>
                </div>
                <div class="layer-info">
                    <span class="layer-count">{{ portals.length }} objects</span>
                </div>
            </div>

            <div class="layer-item">
                <div class="layer-header">
                    <input type="checkbox" :checked="lightsVisible"
                        @change="toggleLayerVisibility('lights', ($event.target as HTMLInputElement).checked)" />
                    <span class="layer-name">Lights</span>
                </div>
                <div class="layer-info">
                    <span class="layer-count">{{ lights.length }} objects</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { WallObject, PortalObject, LightObject } from '../../../../../shared/src/types/mapEditor.mjs';

// Props and emits
defineProps<{
    walls: WallObject[];
    objectWalls?: WallObject[];
    portals: PortalObject[];
    lights: LightObject[];
}>();

const emit = defineEmits<{
    (e: 'visibility-changed', layerType: 'walls' | 'objectWalls' | 'portals' | 'lights', visible: boolean): void;
}>();

// Layer visibility state
const wallsVisible = ref(true);
const objectWallsVisible = ref(true);
const portalsVisible = ref(true);
const lightsVisible = ref(true);

// Methods
const toggleLayerVisibility = (layerType: 'walls' | 'objectWalls' | 'portals' | 'lights', visible: boolean) => {
    if (layerType === 'walls') wallsVisible.value = visible;
    else if (layerType === 'objectWalls') objectWallsVisible.value = visible;
    else if (layerType === 'portals') portalsVisible.value = visible;
    else if (layerType === 'lights') lightsVisible.value = visible;

    emit('visibility-changed', layerType, visible);
};
</script>

<style scoped>
.layer-panel {
    padding: 10px;
}

.panel-title {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 16px;
    color: #333;
    padding-bottom: 5px;
    border-bottom: 1px solid #ddd;
}

.layers-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.layer-item {
    background-color: #f9f9f9;
    border: 1px solid #eaeaea;
    border-radius: 4px;
    padding: 8px;
}

.layer-header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.layer-name {
    font-weight: bold;
    font-size: 14px;
}

.layer-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
}

.layer-info {
    margin-top: 4px;
    font-size: 12px;
    color: #666;
}

.layer-count {
    margin-left: 20px;
}
</style>