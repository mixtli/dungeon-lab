<template>
    <div class="editor-toolbar">
        <div class="tool-group">
            <button class="tool-button" :class="{ active: currentTool === 'select' }" @click="selectTool('select')"
                title="Selection Tool: Click to select objects. Shift+click for multiple selection. Drag to select multiple objects in an area.">
                <span class="tool-icon">◎</span>
                <span class="tool-label">Select</span>
            </button>

            <button class="tool-button" :class="{ active: currentTool === 'pan' }" @click="selectTool('pan')"
                title="Pan & Zoom Tool: Click and drag to move around the map. Use mouse wheel to zoom in and out.">
                <span class="tool-icon">✋</span>
                <span class="tool-label">Pan & Zoom</span>
            </button>
        </div>

        <div class="divider"></div>

        <div class="tool-group">
            <button class="tool-button" :class="{ active: currentTool === 'wall' }" @click="selectTool('wall')"
                title="Wall Tool: Click to start a wall, click again to add points, double-click to finish. DO NOT drag to draw.">
                <span class="tool-icon" :style="{ color: wallType === 'regular' ? '#ff3333' : '#3399ff' }">┃</span>
                <span class="tool-label">Wall</span>
            </button>
            
            <!-- Wall Type Toggle -->
            <div v-if="currentTool === 'wall'" class="wall-type-toggle">
                <button class="wall-type-button" :class="{ active: wallType === 'regular' }" @click="changeWallType('regular')"
                    title="Regular Walls: Used for sight-blocking boundaries (red)">
                    <span class="color-dot" style="background-color: #ff3333;"></span>
                    <span>Regular</span>
                </button>
                <button class="wall-type-button" :class="{ active: wallType === 'object' }" @click="changeWallType('object')"
                    title="Object Walls: Used for objects with height (blue)">
                    <span class="color-dot" style="background-color: #3399ff;"></span>
                    <span>Object</span>
                </button>
            </div>

            <button class="tool-button" :class="{ active: currentTool === 'door' }" @click="selectTool('door')"
                title="Door Tool: Click to place a door on the map.">
                <span class="tool-icon">⊏⊐</span>
                <span class="tool-label">Door</span>
            </button>

            <button class="tool-button" :class="{ active: currentTool === 'light' }" @click="selectTool('light')"
                title="Light Tool: Click to place a light source on the map.">
                <span class="tool-icon">🔆</span>
                <span class="tool-label">Light</span>
            </button>

            <button class="tool-button" :class="{ active: currentTool === 'object' }" @click="selectTool('object')"
                title="Object Tool: Click to create polygon objects. Click to place vertices, double-click to finish.">
                <span class="tool-icon">⬢</span>
                <span class="tool-label">Object</span>
            </button>
        </div>

        <div class="divider"></div>

        <div class="tool-group">
            <button class="tool-button" @click="toggleGrid" :class="{ active: props.gridVisible }" 
                title="Toggle Grid: Show or hide the grid overlay.">
                <span class="tool-icon">⊞</span>
                <span class="tool-label">Grid</span>
            </button>

            <button class="tool-button" @click="toggleSnap" :class="{ active: props.snapEnabled }"
                title="Toggle Snap to Grid: Enable or disable snapping objects to the grid.">
                <span class="tool-icon">⌘</span>
                <span class="tool-label">Snap</span>
            </button>

            <button class="tool-button" :class="{ active: currentTool === 'grid-adjust' }" @click="selectTool('grid-adjust')"
                title="Adjust Grid: Set precise grid size and drag to reposition origin. Match your grid to pre-drawn map grids.">
                <span class="tool-icon">⊞⌘</span>
                <span class="tool-label">Adjust Grid</span>
            </button>

            <!-- Grid size input - only visible when grid-adjust tool is active -->
            <div v-if="currentTool === 'grid-adjust'" class="grid-size-input-container">
                <label class="grid-size-label">Grid Size:</label>
                <input 
                    type="number" 
                    class="grid-size-input" 
                    :value="Math.round(props.currentGridSize || 50)"
                    min="5" 
                    max="500" 
                    step="1"
                    @input="handleGridSizeChange"
                    title="Grid cell size in pixels/world units"
                />
                <span class="grid-size-unit">px</span>
            </div>
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
    currentWallType?: 'regular' | 'object';
    currentGridSize?: number;
}>();

const emit = defineEmits<{
    (e: 'tool-selected', tool: EditorToolType): void;
    (e: 'toggle-grid'): void;
    (e: 'toggle-snap'): void;
    (e: 'wall-type-changed', type: 'regular' | 'object'): void;
    (e: 'grid-size-changed', size: number): void;
}>();

// Provide default values for optional props
const wallType = ref(props.currentWallType ?? 'regular');

// Methods
const selectTool = (tool: EditorToolType) => {
    emit('tool-selected', tool);
};

const toggleGrid = () => {
    emit('toggle-grid');
};

const toggleSnap = () => {
    emit('toggle-snap');
};

const changeWallType = (type: 'regular' | 'object') => {
    wallType.value = type;
    emit('wall-type-changed', type);
};

const handleGridSizeChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const size = parseInt(target.value);
    if (!isNaN(size) && size >= 5 && size <= 500) {
        emit('grid-size-changed', size);
    }
};
</script>

<style scoped>
.editor-toolbar {
    display: flex;
    flex-direction: column;
    padding: 10px;
    gap: 10px;
    background-color: var(--stone, #f5f5f5);
    border-bottom: 1px solid var(--stone-300, #ddd);
    color: var(--onyx, #333);
}

@media (prefers-color-scheme: dark) {
    .editor-toolbar {
        background-color: var(--stone-700, #44403c);
        border-bottom-color: var(--stone-600, #57534e);
        color: var(--parchment, #f5f5dc);
    }
}

.tool-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.divider {
    height: 1px;
    background-color: var(--stone-300, #ddd);
    margin: 5px 0;
}

@media (prefers-color-scheme: dark) {
    .divider {
        background-color: var(--stone-600, #57534e);
    }
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
    color: inherit;
}

.tool-button:hover {
    background-color: var(--stone-200, #e0e0e0);
}

@media (prefers-color-scheme: dark) {
    .tool-button:hover {
        background-color: var(--stone-600, #57534e);
    }
}

.tool-button.active {
    background-color: var(--stone-200, #e0e0e0);
    border-color: var(--stone-400, #bbb);
}

@media (prefers-color-scheme: dark) {
    .tool-button.active {
        background-color: var(--stone-600, #57534e);
        border-color: var(--stone-500, #78716c);
    }
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

/* Wall type toggle styles */
.wall-type-toggle {
    display: flex;
    padding: 0 8px;
    margin-top: -2px;
    margin-bottom: 2px;
}

.wall-type-button {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border: 1px solid var(--stone-300, #ddd);
    background-color: var(--stone-100, #f9f9f9);
    cursor: pointer;
    font-size: 12px;
    color: inherit;
}

@media (prefers-color-scheme: dark) {
    .wall-type-button {
        border-color: var(--stone-600, #57534e);
        background-color: var(--stone-800, #292524);
    }
}

.wall-type-button:first-child {
    border-radius: 3px 0 0 3px;
}

.wall-type-button:last-child {
    border-radius: 0 3px 3px 0;
}

.wall-type-button.active {
    background-color: var(--stone-200, #e0e0e0);
    border-color: var(--stone-400, #bbb);
}

@media (prefers-color-scheme: dark) {
    .wall-type-button.active {
        background-color: var(--stone-600, #57534e);
        border-color: var(--stone-500, #78716c);
    }
}

.color-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
}

/* Grid size input styles */
.grid-size-input-container {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background-color: var(--stone-100, #f9f9f9);
    border: 1px solid var(--stone-300, #ddd);
    border-radius: 4px;
    margin-top: 4px;
}

@media (prefers-color-scheme: dark) {
    .grid-size-input-container {
        background-color: var(--stone-800, #292524);
        border-color: var(--stone-600, #57534e);
    }
}

.grid-size-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--stone-600, #57534e);
    white-space: nowrap;
}

@media (prefers-color-scheme: dark) {
    .grid-size-label {
        color: var(--stone-400, #a8a29e);
    }
}

.grid-size-input {
    width: 60px;
    padding: 2px 4px;
    border: 1px solid var(--stone-300, #ddd);
    border-radius: 3px;
    font-size: 11px;
    text-align: center;
    background: var(--stone-50, #fafaf9);
    color: var(--stone-800, #292524);
}

.grid-size-input:focus {
    outline: none;
    border-color: var(--gold-400, #facc15);
    box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.2);
}

@media (prefers-color-scheme: dark) {
    .grid-size-input {
        border-color: var(--stone-600, #57534e);
        background: var(--stone-900, #1c1917);
        color: var(--stone-200, #e7e5e4);
    }
    
    .grid-size-input:focus {
        border-color: var(--gold-500, #eab308);
    }
}

.grid-size-unit {
    font-size: 11px;
    color: var(--stone-500, #6b7280);
    white-space: nowrap;
}

@media (prefers-color-scheme: dark) {
    .grid-size-unit {
        color: var(--stone-400, #a8a29e);
    }
}
</style>