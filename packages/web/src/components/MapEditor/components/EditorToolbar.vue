<template>
    <div class="editor-toolbar">
        <div class="tool-group">
            <button class="tool-button" :class="{ active: currentTool === 'select' }" @click="selectTool('select')"
                title="Selection Tool: Click to select objects. Shift+click for multiple selection. Drag to select multiple objects in an area.">
                <span class="tool-icon">◎</span>
                <span class="tool-label">Select</span>
            </button>

            <button class="tool-button" :class="{ active: currentTool === 'pan' }" @click="selectTool('pan')"
                title="Pan Tool: Click and drag to move around the map.">
                <span class="tool-icon">✋</span>
                <span class="tool-label">Pan</span>
            </button>

            <button class="tool-button" :class="{ active: currentTool === 'zoom' }" @click="selectTool('zoom')"
                title="Zoom Tool: Use mouse wheel to zoom in and out.">
                <span class="tool-icon">🔍</span>
                <span class="tool-label">Zoom</span>
            </button>
        </div>

        <div class="divider"></div>

        <div class="tool-group">
            <button class="tool-button" :class="{ active: currentTool === 'wall' }" @click="selectTool('wall')"
                title="Wall Tool: Click to start a wall, click again to add points, double-click to finish. DO NOT drag to draw.">
                <span class="tool-icon">┃</span>
                <span class="tool-label">Wall</span>
            </button>

            <button class="tool-button" :class="{ active: currentTool === 'portal' }" @click="selectTool('portal')"
                title="Portal Tool: Click to place a door or portal on the map.">
                <span class="tool-icon">⊏⊐</span>
                <span class="tool-label">Portal</span>
            </button>

            <button class="tool-button" :class="{ active: currentTool === 'light' }" @click="selectTool('light')"
                title="Light Tool: Click to place a light source on the map.">
                <span class="tool-icon">🔆</span>
                <span class="tool-label">Light</span>
            </button>
        </div>

        <div class="divider"></div>

        <div class="tool-group">
            <button class="tool-button" @click="toggleGrid" :class="{ active: gridVisible }" 
                title="Toggle Grid: Show or hide the grid overlay.">
                <span class="tool-icon">⊞</span>
                <span class="tool-label">Grid</span>
            </button>

            <button class="tool-button" @click="toggleSnap" :class="{ active: snapEnabled }"
                title="Toggle Snap to Grid: Enable or disable snapping objects to the grid.">
                <span class="tool-icon">⌘</span>
                <span class="tool-label">Snap</span>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { EditorToolType } from '../../../../../shared/src/types/mapEditor.mjs';

// Props and emits
const props = defineProps<{
    currentTool: EditorToolType;
    gridVisible?: boolean;
    snapEnabled?: boolean;
}>();

const emit = defineEmits<{
    (e: 'tool-selected', tool: EditorToolType): void;
    (e: 'toggle-grid'): void;
    (e: 'toggle-snap'): void;
}>();

// Provide default values for optional props
const gridVisible = ref(props.gridVisible ?? true);
const snapEnabled = ref(props.snapEnabled ?? true);

// Methods
const selectTool = (tool: EditorToolType) => {
    emit('tool-selected', tool);
};

const toggleGrid = () => {
    gridVisible.value = !gridVisible.value;
    emit('toggle-grid');
};

const toggleSnap = () => {
    snapEnabled.value = !snapEnabled.value;
    emit('toggle-snap');
};
</script>

<style scoped>
.editor-toolbar {
    display: flex;
    flex-direction: column;
    padding: 10px;
    gap: 10px;
    background-color: #f5f5f5;
    border-bottom: 1px solid #ddd;
}

.tool-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.divider {
    height: 1px;
    background-color: #ddd;
    margin: 5px 0;
}

.tool-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: none;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
}

.tool-button:hover {
    background-color: #e0e0e0;
}

.tool-button.active {
    background-color: #e0e0e0;
    border-color: #bbb;
}

.tool-icon {
    font-size: 18px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tool-label {
    font-size: 14px;
}
</style>