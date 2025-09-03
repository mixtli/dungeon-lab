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
                    <input type="checkbox" :checked="objectsVisible"
                        @change="toggleLayerVisibility('objects', ($event.target as HTMLInputElement).checked)" />
                    <span class="layer-name">Objects</span>
                    <span class="layer-color" style="background-color: #666666;"></span>
                </div>
                <div class="layer-info">
                    <span class="layer-count">{{ objects?.length || 0 }} objects</span>
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
import type { WallObject, PortalObject, LightObject, ObjectEditorObject } from '../../../../../shared/src/types/mapEditor.mjs';

// Props and emits
defineProps<{
    walls: WallObject[];
    objects: ObjectEditorObject[];
    portals: PortalObject[];
    lights: LightObject[];
}>();

const emit = defineEmits<{
    (e: 'visibility-changed', layerType: 'walls' | 'objects' | 'portals' | 'lights', visible: boolean): void;
}>();

// Layer visibility state
const wallsVisible = ref(true);
const objectsVisible = ref(true);
const portalsVisible = ref(true);
const lightsVisible = ref(true);

// Methods
const toggleLayerVisibility = (layerType: 'walls' | 'objects' | 'portals' | 'lights', visible: boolean) => {
    if (layerType === 'walls') wallsVisible.value = visible;
    else if (layerType === 'objects') objectsVisible.value = visible;
    else if (layerType === 'portals') portalsVisible.value = visible;
    else if (layerType === 'lights') lightsVisible.value = visible;

    emit('visibility-changed', layerType, visible);
};
</script>

<style scoped>
.layer-panel {
    padding: 10px;
    background-color: white;
    color: black;
}

@media (prefers-color-scheme: dark) {
    .layer-panel {
        background-color: var(--stone-700, #44403c);
        color: var(--parchment, #f5f5dc);
    }
}

.panel-title {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 16px;
    color: var(--onyx, #333);
    padding-bottom: 5px;
    border-bottom: 1px solid var(--stone-300, #ddd);
}

@media (prefers-color-scheme: dark) {
    .panel-title {
        color: var(--parchment, #f5f5dc);
        border-bottom-color: var(--stone-600, #57534e);
    }
}

.layers-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.layer-item {
    background-color: var(--stone, #f5f5f4);
    border: 1px solid var(--stone-300, #eaeaea);
    border-radius: 4px;
    padding: 8px;
}

@media (prefers-color-scheme: dark) {
    .layer-item {
        background-color: var(--obsidian, #1c1917);
        border-color: var(--stone-600, #57534e);
    }
}

.layer-header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.layer-name {
    font-weight: bold;
    font-size: 14px;
    color: var(--onyx, #333);
}

@media (prefers-color-scheme: dark) {
    .layer-name {
        color: var(--parchment, #f5f5dc);
    }
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
    color: var(--ash, #666);
}

@media (prefers-color-scheme: dark) {
    .layer-info {
        color: var(--stone-300, #d6d3d1);
    }
}

.layer-count {
    margin-left: 20px;
}
</style>