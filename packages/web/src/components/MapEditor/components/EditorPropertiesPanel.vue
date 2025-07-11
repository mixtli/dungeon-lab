<template>
    <div class="properties-panel">
        <h3 class="panel-title">Properties</h3>

        <div class="panel-content">
            <template v-if="selectedObjects.length === 1">
                <!-- Single object selected -->
                <div class="object-properties">
                    <!-- Common properties -->
                    <div class="property-group">
                        <h4>General</h4>
                        <div class="property-row">
                            <label>ID:</label>
                            <span>{{ selectedObject?.id }}</span>
                        </div>
                        <div class="property-row">
                            <label>Type:</label>
                            <span>{{ objectTypeLabel }}</span>
                        </div>
                    </div>

                    <!-- Type-specific properties -->
                    <template v-if="selectedObject?.objectType === 'wall'">
                        <div class="property-group">
                            <h4>Wall Properties</h4>
                            <div class="property-row">
                                <label>Color:</label>
                                <input type="color" :value="(selectedObject as WallObject).stroke || '#ff3333'"
                                    @change="updateProperty('stroke', ($event.target as HTMLInputElement).value)" />
                            </div>
                            <div class="property-row">
                                <label>Width:</label>
                                <input type="number" :value="(selectedObject as WallObject).strokeWidth || 3" min="1"
                                    max="10"
                                    @change="updateProperty('strokeWidth', parseInt(($event.target as HTMLInputElement).value))" />
                            </div>
                        </div>
                    </template>

                    <template v-else-if="selectedObject?.objectType === 'portal'">
                        <div class="property-group">
                            <h4>Portal Properties</h4>
                            <div class="property-row">
                                <label>State:</label>
                                <select :value="(selectedObject as PortalObject).closed ? 'closed' : 'open'"
                                    @change="updateProperty('closed', ($event.target as HTMLSelectElement).value === 'closed')">
                                    <option value="closed">Closed</option>
                                    <option value="open">Open</option>
                                </select>
                            </div>
                            <div class="property-row">
                                <label>Rotation:</label>
                                <input type="number" :value="Math.round((selectedObject as PortalObject).rotation)" min="0"
                                    max="359" step="1"
                                    @change="updateProperty('rotation', parseInt(($event.target as HTMLInputElement).value))" />
                                <span class="unit">°</span>
                            </div>
                            <div class="property-row">
                                <label>Freestanding:</label>
                                <input type="checkbox" :checked="(selectedObject as PortalObject).freestanding"
                                    @change="updateProperty('freestanding', ($event.target as HTMLInputElement).checked)" />
                            </div>
                        </div>
                        
                        <div class="property-group">
                            <h4>Position (Grid Coordinates)</h4>
                            <div class="property-row">
                                <label>X:</label>
                                <input type="number" :value="Number((selectedObject as PortalObject).position.x.toFixed(2))" step="0.1"
                                    @change="updatePositionProperty('x', parseFloat(($event.target as HTMLInputElement).value))" />
                            </div>
                            <div class="property-row">
                                <label>Y:</label>
                                <input type="number" :value="Number((selectedObject as PortalObject).position.y.toFixed(2))" step="0.1"
                                    @change="updatePositionProperty('y', parseFloat(($event.target as HTMLInputElement).value))" />
                            </div>
                        </div>

                        <div class="property-group">
                            <h4>Bounds (Grid Coordinates)</h4>
                            <div class="bounds-section">
                                <div class="bounds-point">
                                    <h5>Start Point</h5>
                                    <div class="property-row">
                                        <label>X1:</label>
                                        <input type="number" 
                                            :value="(selectedObject as PortalObject).bounds[0]?.x?.toFixed(2) || '0'" 
                                            step="0.1"
                                            @change="updateBoundsProperty(0, 'x', parseFloat(($event.target as HTMLInputElement).value))" />
                                    </div>
                                    <div class="property-row">
                                        <label>Y1:</label>
                                        <input type="number" 
                                            :value="(selectedObject as PortalObject).bounds[0]?.y?.toFixed(2) || '0'" 
                                            step="0.1"
                                            @change="updateBoundsProperty(0, 'y', parseFloat(($event.target as HTMLInputElement).value))" />
                                    </div>
                                </div>
                                
                                <div class="bounds-point">
                                    <h5>End Point</h5>
                                    <div class="property-row">
                                        <label>X2:</label>
                                        <input type="number" 
                                            :value="(selectedObject as PortalObject).bounds[1]?.x?.toFixed(2) || '0'" 
                                            step="0.1"
                                            @change="updateBoundsProperty(1, 'x', parseFloat(($event.target as HTMLInputElement).value))" />
                                    </div>
                                    <div class="property-row">
                                        <label>Y2:</label>
                                        <input type="number" 
                                            :value="(selectedObject as PortalObject).bounds[1]?.y?.toFixed(2) || '0'" 
                                            step="0.1"
                                            @change="updateBoundsProperty(1, 'y', parseFloat(($event.target as HTMLInputElement).value))" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>

                    <template v-else-if="selectedObject?.objectType === 'light'">
                        <div class="property-group">
                            <h4>Light Properties</h4>
                            <div class="property-row">
                                <label>Color:</label>
                                <input type="color" :value="(selectedObject as LightObject).color"
                                    @change="updateProperty('color', ($event.target as HTMLInputElement).value)" />
                            </div>
                            <div class="property-row">
                                <label>Range (grid units):</label>
                                <input type="number" 
                                    :value="lightRangeInGridUnits" 
                                    :min="0" 
                                    :max="props.gridSize > 0 ? 500 / props.gridSize : 10" 
                                    :step="props.gridSize > 0 ? 10 / props.gridSize : 0.1" 
                                    @change="updateProperty('range', Math.round(parseFloat(($event.target as HTMLInputElement).value) * props.gridSize))" />
                            </div>
                            <div class="property-row">
                                <label>Intensity:</label>
                                <input type="range" :value="(selectedObject as LightObject).intensity" min="0" max="1"
                                    step="0.1"
                                    @input="updateProperty('intensity', parseFloat(($event.target as HTMLInputElement).value))" />
                                <span class="range-value">{{ ((selectedObject as LightObject).intensity || 0).toFixed(1)
                                    }}</span>
                            </div>
                            <div class="property-row">
                                <label>Opacity:</label>
                                <input type="range"
                                    :value="(selectedObject as LightObject).opacity ?? 0.5"
                                    min="0.2" max="1" step="0.01"
                                    @input="updateProperty('opacity', parseFloat(($event.target as HTMLInputElement).value))"
                                />
                                <span class="range-value">{{ Math.round(((selectedObject as LightObject).opacity ?? 0.5) * 100) }}%</span>
                            </div>
                            <div class="property-row">
                                <label>Shadows:</label>
                                <input type="checkbox" :checked="(selectedObject as LightObject).shadows"
                                    @change="updateProperty('shadows', ($event.target as HTMLInputElement).checked)" />
                            </div>
                        </div>
                    </template>
                </div>
            </template>

            <template v-else-if="selectedObjects.length > 1">
                <!-- Multiple objects selected -->
                <div class="multiple-selection">
                    <p>{{ selectedObjects.length }} objects selected</p>

                    <!-- Common actions for multiple objects -->
                    <div class="property-group">
                        <h4>Bulk Actions</h4>
                        <button @click="deleteSelected" class="danger-button">Delete All</button>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type {
    WallObject,
    PortalObject,
    LightObject,
    AnyEditorObject
} from '../../../../../shared/src/types/mapEditor.mjs';

// Props and emits
const props = defineProps<{
    selectedObjects: AnyEditorObject[];
    gridSize: number;
}>();

const emit = defineEmits<{
    (e: 'property-updated', objectId: string, property: string, value: unknown): void;
    (e: 'delete-objects', objectIds: string[]): void;
}>();

// Computed properties
const selectedObject = computed(() => {
    return props.selectedObjects.length > 0 ? props.selectedObjects[0] : null;
});

const lightRangeInGridUnits = computed(() => {
    if (selectedObject.value?.objectType === 'light' && props.gridSize > 0) {
        return (selectedObject.value as LightObject).range / props.gridSize;
    }
    return 0;
});

const objectTypeLabel = computed(() => {
    if (!selectedObject.value) return '';

    switch (selectedObject.value.objectType) {
        case 'wall': return 'Wall';
        case 'portal': return 'Portal/Door';
        case 'light': return 'Light Source';
        default: return 'Unknown';
    }
});

// Methods
const updateProperty = (property: string, value: unknown) => {
    if (selectedObject.value) {
        emit('property-updated', selectedObject.value.id, property, value);
    }
};

const updatePositionProperty = (axis: 'x' | 'y', value: number) => {
    if (selectedObject.value && selectedObject.value.objectType === 'portal') {
        const currentPosition = (selectedObject.value as PortalObject).position;
        const newPosition = { ...currentPosition, [axis]: value };
        emit('property-updated', selectedObject.value.id, 'position', newPosition);
    }
};

const updateBoundsProperty = (pointIndex: number, axis: 'x' | 'y', value: number) => {
    if (selectedObject.value && selectedObject.value.objectType === 'portal') {
        const currentBounds = [...((selectedObject.value as PortalObject).bounds || [])];
        
        // Ensure the bounds array has the right structure
        if (!currentBounds[pointIndex]) {
            currentBounds[pointIndex] = { x: 0, y: 0 };
        }
        
        currentBounds[pointIndex] = { ...currentBounds[pointIndex], [axis]: value };
        emit('property-updated', selectedObject.value.id, 'bounds', currentBounds);
    }
};

const deleteSelected = () => {
    const selectedIds = props.selectedObjects.map(obj => obj.id);
    if (selectedIds.length > 0) {
        if (confirm(`Delete ${selectedIds.length} selected objects?`)) {
            emit('delete-objects', selectedIds);
        }
    }
};
</script>

<style scoped>
.properties-panel {
    padding: 10px;
    overflow-y: auto;
}

.panel-title {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 16px;
    color: #333;
    padding-bottom: 5px;
    border-bottom: 1px solid #ddd;
}

.property-group {
    margin-bottom: 15px;
}

.property-group h4 {
    font-size: 14px;
    margin: 5px 0;
    color: #666;
}

.property-row {
    display: flex;
    align-items: center;
    margin-bottom: 6px;
}

.property-row label {
    flex: 0 0 80px;
    font-size: 12px;
}

.property-row input[type="text"],
.property-row input[type="number"],
.property-row input[type="range"],
.property-row select {
    flex: 1;
    padding: 4px;
    font-size: 12px;
}

.property-row input[type="color"] {
    width: 40px;
    height: 20px;
    padding: 0;
    border: 1px solid #ccc;
}

.property-row .range-value {
    width: 30px;
    text-align: right;
    font-size: 12px;
    margin-left: 5px;
}

.danger-button {
    background-color: #ff4d4d;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
}

.danger-button:hover {
    background-color: #ff0000;
}

.multiple-selection {
    color: #666;
    font-size: 14px;
    text-align: center;
}

.property-row select,
.property-row input[type="color"],
.property-row input[type="range"] {
    flex: 1;
    min-width: 0;
}

.range-value {
    margin-left: 8px;
    font-size: 11px;
    color: #666;
}

.danger-button {
    background: #ff4444;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
}

.danger-button:hover {
    background: #ff6666;
}

.bounds-section {
    margin-top: 8px;
}

.bounds-point {
    margin-bottom: 12px;
    padding: 8px;
    background: #f9f9f9;
    border-radius: 4px;
}

.bounds-point h5 {
    margin: 0 0 6px 0;
    font-size: 12px;
    color: #555;
    font-weight: 600;
}

.unit {
    margin-left: 4px;
    font-size: 11px;
    color: #666;
}
</style>