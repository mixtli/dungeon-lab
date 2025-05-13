<template>
    <div class="map-editor-container">
        <div class="map-editor-workspace">
            <!-- Main editor layout with sidebar and canvas -->
            <div class="map-editor-sidebar">
                <!-- Editor toolbar component -->
                <EditorToolbar :current-tool="editorState.currentTool.value" @tool-selected="editorState.setTool" />

                <!-- Properties panel (conditional based on selection) -->
                <EditorPropertiesPanel v-if="editorState.selectedObjectIds.value.length > 0"
                    :selected-objects="editorState.selectedObjects.value" @property-updated="handlePropertyUpdate" />

                <!-- Layer panel -->
                <EditorLayerPanel :walls="editorState.walls.value" :portals="editorState.portals.value"
                    :lights="editorState.lights.value" @visibility-changed="handleLayerVisibility" />
            </div>

            <!-- Main canvas area -->
            <div class="map-editor-canvas-container">
                <EditorCanvas :walls="editorState.walls.value" :portals="editorState.portals.value"
                    :lights="editorState.lights.value" :selected-object-ids="editorState.selectedObjectIds.value"
                    :current-tool="editorState.currentTool.value" :grid-config="editorState.gridConfig"
                    :map-metadata="editorState.mapMetadata" :viewport-transform="editorState.viewportTransform"
                    @object-selected="handleObjectSelected" @object-added="handleObjectAdded"
                    @object-modified="handleObjectModified" @object-removed="handleObjectRemoved" />
            </div>
        </div>

        <!-- Bottom toolbar -->
        <div class="map-editor-footer">
            <div class="map-info">
                <span>{{ editorState.mapMetadata.name }}</span>
                <span v-if="editorState.isModified.value">*</span>
            </div>

            <div class="map-actions">
                <button @click="handleSave">Save</button>
                <button @click="handleExport">Export UVTT</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useEditorState } from './composables/useEditorState.mjs';
import type {
    AnyEditorObject,
    WallObject,
    PortalObject,
    LightObject
} from '../../../../shared/src/types/mapEditor.mjs';

// Import editor components
import EditorToolbar from './components/EditorToolbar.vue';
import EditorCanvas from './components/EditorCanvas.vue';
import EditorPropertiesPanel from './components/EditorPropertiesPanel.vue';
import EditorLayerPanel from './components/EditorLayerPanel.vue';

// Initialize the editor state
const editorState = useEditorState();

// Event handlers
const handleObjectSelected = (id: string | null, addToSelection = false) => {
    editorState.selectObject(id, addToSelection);
};

const handleObjectAdded = (object: AnyEditorObject) => {
    if (object.objectType === 'wall') {
        editorState.addWall(object as WallObject);
    } else if (object.objectType === 'portal') {
        editorState.addPortal(object as PortalObject);
    } else if (object.objectType === 'light') {
        editorState.addLight(object as LightObject);
    }
};

const handleObjectModified = (id: string, updates: Partial<AnyEditorObject>) => {
    // Find object to determine its type
    const object = editorState.allObjects.value.find(obj => obj.id === id);

    if (!object) return;

    if (object.objectType === 'wall') {
        editorState.updateWall(id, updates as Partial<WallObject>);
    } else if (object.objectType === 'portal') {
        editorState.updatePortal(id, updates as Partial<PortalObject>);
    } else if (object.objectType === 'light') {
        editorState.updateLight(id, updates as Partial<LightObject>);
    }
};

const handleObjectRemoved = (id: string) => {
    editorState.removeObject(id);
};

const handlePropertyUpdate = (objectId: string, property: string, value: unknown) => {
    const object = editorState.allObjects.value.find(obj => obj.id === objectId);

    if (!object) return;

    const updates = { [property]: value };

    handleObjectModified(objectId, updates);
};

const handleLayerVisibility = (layerType: 'walls' | 'portals' | 'lights', visible: boolean) => {
    // Update visibility for all objects in the layer
    const collection = editorState[layerType].value;

    collection.forEach((obj: AnyEditorObject) => {
        handleObjectModified(obj.id, { visible });
    });
};

const handleSave = async () => {
    // Placeholder for save functionality
    console.log('Save map:', editorState.mapMetadata);
    editorState.isModified.value = false;
};

const handleExport = () => {
    // Placeholder for UVTT export functionality
    console.log('Export UVTT');
};

// Lifecycle hooks
onMounted(() => {
    // Initialize editor or load map data
    window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
});

// Prevent accidental navigation when map is modified
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (editorState.isModified.value) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = message;
        return message;
    }
};
</script>

<style scoped>
.map-editor-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    overflow: hidden;
}

.map-editor-workspace {
    display: flex;
    flex: 1;
    overflow: hidden;
}

.map-editor-sidebar {
    width: 300px;
    border-right: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
}

.map-editor-canvas-container {
    flex: 1;
    position: relative;
    overflow: hidden;
}

.map-editor-footer {
    height: 40px;
    border-top: 1px solid #ddd;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
}

.map-info {
    font-size: 14px;
    color: #333;
}

.map-actions {
    display: flex;
    gap: 8px;
}

.map-actions button {
    padding: 4px 12px;
    background: #f0f0f0;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
}

.map-actions button:hover {
    background: #e0e0e0;
}
</style>