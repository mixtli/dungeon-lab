# Map Editor File Structure

This document outlines the proposed directory structure and key files for the map editor implementation.

## Main Directory Structure

```
packages/
└── web/
    └── src/
        └── components/
            └── MapEditor/
                ├── MapEditorView.vue           # Main container component
                ├── components/
                │   ├── EditorToolbar.vue       # Tool selection and controls
                │   ├── EditorCanvas.vue        # Konva canvas implementation
                │   ├── EditorLayerPanel.vue    # Layer management UI
                │   ├── EditorPropertiesPanel.vue # Selected object properties
                │   └── tools/
                │       ├── WallTool.vue        # Wall drawing tool
                │       ├── PortalTool.vue      # Door/portal placement tool
                │       ├── LightTool.vue       # Light source placement
                │       └── SelectionTool.vue   # Object selection and manipulation
                └── composables/
                    ├── useEditorState.ts       # Editor state management
                    ├── useEditorHistory.ts     # Undo/redo functionality
                    ├── useGridSystem.ts        # Grid and snapping logic
                    └── useUVTTConverter.ts     # UVTT format conversion
```

## Key Files and Their Responsibilities

### Views

- **MapEditorView.vue**: Main container component that coordinates all parts of the editor. Handles routing integration, editor initialization, and high-level operations.

### Components

- **EditorToolbar.vue**: Tool selection interface that shows available tools and allows the user to switch between them.

- **EditorCanvas.vue**: Core canvas component using Konva.js for rendering and interaction with map objects.

- **EditorLayerPanel.vue**: UI for managing different layers (walls, portals, lights, etc.) with visibility toggles.

- **EditorPropertiesPanel.vue**: Dynamic panel showing properties of the currently selected object(s).

### Tool Components

- **WallTool.vue**: Specialized component for wall drawing operations.

- **PortalTool.vue**: Component for placing and configuring doors/portals.

- **LightTool.vue**: Component for placing and configuring light sources.

- **SelectionTool.vue**: Component for selecting and manipulating objects.

### Composables

- **useEditorState.ts**: Core state management for all editor objects and tools.

- **useEditorHistory.ts**: Undo/redo functionality implementation.

- **useGridSystem.ts**: Grid visualization, configuration, and snapping logic.

- **useUVTTConverter.ts**: Conversion between editor objects and UVTT format for import/export.

## Types and Interfaces

We'll define TypeScript interfaces for all editor objects and data structures in a separate types file:

```
packages/
└── shared/
    └── src/
        └── types/
            └── mapEditor.ts    # Shared types for map editor
```

## Integration Points

- **Router Integration**: The map editor will be mounted as a route in the main application.

- **API Integration**: The editor will connect to backend APIs for saving and loading maps.

- **Storage Integration**: The editor will interact with the asset storage system for images.

## Next Steps

Once the implementation plan is approved, we'll create the base directory structure and begin implementing the core components according to the phased approach described in the implementation plan.
