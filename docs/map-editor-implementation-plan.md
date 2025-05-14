# Map Editor Implementation Plan

This document outlines the step-by-step implementation plan for the AI-powered map editor described in `ai-map-builder.md`. The plan is organized in phases with specific tasks and checkboxes to track progress.

## Phase 1: Basic Editor Setup (1-2 weeks)

- [x] **Project Structure Setup**

  - [x] Create main editor component structure
  - [x] Setup directory structure for components and composables
  - [x] Configure necessary dependencies (Konva.js, vue-konva)

- [x] **Canvas Foundation**

  - [x] Implement basic EditorCanvas component with Konva.js
  - [x] Setup stage, layers, and basic rendering
  - [x] Implement pan functionality
  - [x] Implement zoom functionality

- [ ] **Map Loading**

  - [ ] Create image loading service
  - [ ] Implement background image rendering
  - [ ] Handle image positioning and scaling

- [x] **Base State Management**
  - [x] Create useEditorState composable
  - [x] Implement state for walls, doors, lights
  - [x] Setup reactive structures for editor objects

## Phase 2: Drawing Tools Implementation (1-2 weeks)

- [ ] **Selection Tool**

  - [ ] Implement object selection
  - [ ] Create transformer for selected objects
  - [ ] Handle multi-object selection

- [ ] **Wall Tool**

  - [x] Implement wall drawing functionality
  - [x] Create wall rendering with proper styling
  - [ ] Handle wall editing (add/remove points)
  - [ ] Implement wall deletion

- [ ] **Portal Tool**
  - [ ] Implement door/portal placement
  - [ ] Create portal rendering with rotation support
  - [ ] Add portal state management (open/closed)
- [ ] **Light Tool**
  - [ ] Implement light source placement
  - [ ] Create light visualization with range preview
  - [ ] Support light property editing

## Phase 3: Grid and Snapping System (1 week)

- [ ] **Grid Visualization**

  - [ ] Implement grid rendering on canvas
  - [ ] Create grid configuration options (size, color, visibility)

- [ ] **Snapping Functionality**

  - [ ] Implement coordinate snapping for object placement
  - [ ] Add snapping for object transformation
  - [ ] Create snap-to-grid toggle functionality

- [x] **Grid System Composable**
  - [x] Develop useGridSystem composable
  - [x] Implement grid configuration options
  - [x] Add helper functions for coordinate conversion

## Phase 4: UVTT Integration (1 week)

- [x] **Data Structure**

  - [x] Define TypeScript interfaces for UVTT format
  - [ ] Create mapping between editor objects and UVTT structure

- [ ] **Import System**

  - [ ] Implement UVTT file parser
  - [ ] Convert UVTT data to editor objects
  - [ ] Handle importing from file/URL

- [ ] **Export System**
  - [ ] Create editor state to UVTT converter
  - [ ] Implement file generation and download
  - [ ] Add export options (resolution, format)

## Phase 5: UI Refinement and Properties (1-2 weeks)

- [x] **Editor Toolbar**

  - [x] Create tool selection interface
  - [x] Implement toolbar layout with icons
  - [x] Add tool state management

- [x] **Properties Panel**

  - [x] Build dynamic property editor component
  - [x] Implement object-specific property forms
  - [x] Add property change handlers

- [x] **Layer Management**

  - [x] Create layer visualization panel
  - [x] Implement layer visibility toggles
  - [ ] Add layer reordering functionality

- [ ] **History Management**
  - [ ] Implement undo/redo functionality
  - [ ] Create useEditorHistory composable
  - [ ] Add command pattern for operations

## Phase 6: Integration and Testing (1 week)

- [ ] **Integration with Map Generation Flow**

  - [ ] Connect to map generation API
  - [ ] Handle loading generated maps
  - [ ] Implement save functionality to database

- [ ] **Testing and Validation**

  - [ ] Create test cases for core functionality
  - [ ] Verify UVTT compatibility
  - [ ] Test with different map sizes and complexities

- [ ] **Performance Optimization**
  - [ ] Optimize rendering for large maps
  - [ ] Implement lazy loading for large objects
  - [ ] Add canvas caching where appropriate

## Phase 7: Final Polishing and Documentation (1 week)

- [ ] **User Experience Improvements**

  - [ ] Add keyboard shortcuts
  - [ ] Implement contextual help
  - [ ] Create tooltips and guides

- [ ] **Error Handling**

  - [ ] Add graceful error handling
  - [ ] Implement user feedback for errors
  - [ ] Create recovery mechanisms

- [ ] **Documentation**
  - [ ] Document component APIs
  - [ ] Create user guide for the editor
  - [ ] Add code comments for future maintenance

## Dependencies

- Vue.js 3
- Konva.js (^9.0.0)
- vue-konva (^3.0.0)
- API endpoints for map data persistence

## Next Steps

After approval of this implementation plan, we'll begin with Phase 1 by setting up the project structure and implementing the basic canvas foundation. Progress will be tracked by checking off completed items in this document.
