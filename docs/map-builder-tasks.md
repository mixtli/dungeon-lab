# AI Map Builder Implementation Tasks

This document tracks the tasks for implementing the AI-powered map builder feature in Dungeon Lab as outlined in the [AI Map Builder](./ai-map-builder.md) document.

## Task Status Legend
- [ ] Todo
- [x] Completed

## Phase 0: UVTT Format Integration

- [x] **Task 0.1**: Update map schema to match UVTT format
  - Priority: High
  - Description: Modify the MongoDB map schema to match the Universal VTT (UVTT) format, including format version, resolution, line of sight, portals, environment, and lights. Instead of storing the base64 image, maintain a link to an Asset object.
  - Dependencies: None
  - Reference: [UVTT Format Specification](https://arkenforge.com/universal-vtt-files/)

- [ ] **Task 0.2**: Create API endpoint for UVTT import
  - Priority: High
  - Description: Implement an API endpoint that allows uploading and importing UVTT files (.uvtt, .dd2vtt, .df2vtt) to create maps in the system. The endpoint should extract all map data and convert the base64 image to an Asset.
  - Dependencies: 0.1

## Phase 1: User Description Interface

- [ ] **Task 1.1**: Create a Vue component for map description input
  - Priority: High
  - Description: Build a Vue.js component with a rich text editor that allows users to describe their map in detail.
  - Dependencies: None

- [ ] **Task 1.2**: Add context enhancement features
  - Priority: Medium
  - Description: Implement a system that guides users to include specific details helpful for map generation (dimensions, theme, key features, etc.).
  - Dependencies: 1.1

- [ ] **Task 1.3**: Implement optional parameter inputs
  - Priority: Medium
  - Description: Allow users to specify technical parameters like art style preferences, grid size, and lighting atmosphere.
  - Dependencies: 1.1

- [ ] **Task 1.4**: Design and implement UI layout
  - Priority: High
  - Description: Create an intuitive and user-friendly interface for the map creation workflow.
  - Dependencies: 1.1, 1.2, 1.3

## Phase 2: Map Generation

- [ ] **Task 2.1**: Set up OpenAI integration service
  - Priority: High
  - Description: Create a service to communicate with OpenAI's GPT-4o API for image generation.
  - Dependencies: None

- [ ] **Task 2.2**: Create prompt engineering templates
  - Priority: High
  - Description: Develop specialized prompt templates that format the user's description for optimal image generation results.
  - Dependencies: 2.1

- [ ] **Task 2.3**: Implement image storage system
  - Priority: High
  - Description: Create a system to save generated images to the storage system (MinIO) and associate with map records.
  - Dependencies: None

- [ ] **Task 2.4**: Build preview component
  - Priority: Medium
  - Description: Create a component to display the generated map to the user.
  - Dependencies: 2.1, 2.3

## Phase 3: Iterative Refinement

- [ ] **Task 3.1**: Develop modification interface
  - Priority: High
  - Description: Create a component that allows users to view their generated map and input text instructions for modifications.
  - Dependencies: 2.4

- [ ] **Task 3.2**: Implement differential prompting system
  - Priority: Medium
  - Description: Develop a system that generates targeted prompts based on modification requests.
  - Dependencies: 2.2, 3.1

- [ ] **Task 3.3**: Create version management system
  - Priority: Medium
  - Description: Implement a system to track different versions of the map.
  - Dependencies: 2.3

- [ ] **Task 3.4**: Build version history viewer
  - Priority: Low
  - Description: Provide a component to view version history and allow users to revert to previous versions.
  - Dependencies: 3.3

## Phase 4: Map Saving

- [ ] **Task 4.1**: Implement MongoDB schema
  - Priority: High
  - Description: Implement the Mongoose schema for storing map data.
  - Dependencies: 0.1

- [ ] **Task 4.2**: Create asset management service
  - Priority: High
  - Description: Store the map images in the asset management system with appropriate metadata.
  - Dependencies: 2.3

- [ ] **Task 4.3**: Build save functionality
  - Priority: High
  - Description: Implement a service that handles the save operation with proper user/campaign association.
  - Dependencies: 4.1, 4.2

- [ ] **Task 4.4**: Add export/import capabilities
  - Priority: Medium
  - Description: Allow users to export and import map data.
  - Dependencies: 4.3, 0.2

## Phase 5: Feature Detection

- [ ] **Task 5.1**: Set up feature detection service
  - Priority: High
  - Description: Implement a service to detect various map features (walls, doors, lights).
  - Dependencies: 2.3

- [ ] **Task 5.2**: Implement wall detection
  - Priority: High
  - Description: Create algorithms to detect walls and obstacles in the map image.
  - Dependencies: 5.1

- [ ] **Task 5.3**: Add door/portal detection
  - Priority: Medium
  - Description: Implement functionality to detect doors and portals in the map image.
  - Dependencies: 5.1

- [ ] **Task 5.4**: Develop light source detection
  - Priority: Medium
  - Description: Create functionality to identify potential light sources in the map image.
  - Dependencies: 5.1

- [ ] **Task 5.5**: Create UVTT conversion service
  - Priority: High
  - Description: Implement a service to convert detected features into UVTT format.
  - Dependencies: 5.2, 5.3, 5.4, 0.1

## Phase 6: Interactive Editor

- [ ] **Task 6.1**: Build canvas-based map editor
  - Priority: High
  - Description: Implement a Vue.js canvas-based editor using libraries like Fabric.js or Konva.js.
  - Dependencies: 4.3, 5.5

- [ ] **Task 6.2**: Implement wall editing tools
  - Priority: High
  - Description: Create tools for drawing, modifying, and deleting wall segments.
  - Dependencies: 6.1

- [ ] **Task 6.3**: Create portal/door tools
  - Priority: Medium
  - Description: Implement tools for placing and configuring doors and portals.
  - Dependencies: 6.1

- [ ] **Task 6.4**: Add light editing capabilities
  - Priority: Medium
  - Description: Build tools for adding and adjusting light properties.
  - Dependencies: 6.1

- [ ] **Task 6.5**: Develop real-time UVTT conversion
  - Priority: High
  - Description: Implement a service that converts editor state to UVTT format in real-time.
  - Dependencies: 6.1, 6.2, 6.3, 6.4, 0.1

## Phase 7: Final Integration

- [ ] **Task 7.1**: Connect all components
  - Priority: High
  - Description: Integrate all components into a complete workflow.
  - Dependencies: All previous tasks

- [ ] **Task 7.2**: Implement error handling
  - Priority: High
  - Description: Add comprehensive error handling throughout the system.
  - Dependencies: 7.1

- [ ] **Task 7.3**: Add UX enhancements
  - Priority: Medium
  - Description: Implement user experience improvements and feedback mechanisms.
  - Dependencies: 7.1

- [ ] **Task 7.4**: Perform testing and optimization
  - Priority: High
  - Description: Conduct end-to-end testing and optimize performance.
  - Dependencies: 7.2, 7.3

## Progress Tracking

### Phase 0: UVTT Format Integration
- [x] 0.1 Update map schema to match UVTT format
- [ ] 0.2 Create API endpoint for UVTT import

### Phase 1: User Description Interface
- [ ] 1.1 Create Vue component for map description input
- [ ] 1.2 Add context enhancement features
- [ ] 1.3 Implement optional parameter inputs
- [ ] 1.4 Design and implement UI layout

### Phase 2: Map Generation
- [ ] 2.1 Set up OpenAI integration service
- [ ] 2.2 Create prompt engineering templates
- [ ] 2.3 Implement image storage system
- [ ] 2.4 Build preview component

### Phase 3: Iterative Refinement
- [ ] 3.1 Develop modification interface
- [ ] 3.2 Implement differential prompting system
- [ ] 3.3 Create version management system
- [ ] 3.4 Build version history viewer

### Phase 4: Map Saving
- [ ] 4.1 Implement MongoDB schema
- [ ] 4.2 Create asset management service
- [ ] 4.3 Build save functionality
- [ ] 4.4 Add export/import capabilities

### Phase 5: Feature Detection
- [ ] 5.1 Set up feature detection service
- [ ] 5.2 Implement wall detection
- [ ] 5.3 Add door/portal detection
- [ ] 5.4 Develop light source detection
- [ ] 5.5 Create UVTT conversion service

### Phase 6: Interactive Editor
- [ ] 6.1 Build canvas-based map editor
- [ ] 6.2 Implement wall editing tools
- [ ] 6.3 Create portal/door tools
- [ ] 6.4 Add light editing capabilities
- [ ] 6.5 Develop real-time UVTT conversion

### Phase 7: Final Integration
- [ ] 7.1 Connect all components
- [ ] 7.2 Implement error handling
- [ ] 7.3 Add UX enhancements
- [ ] 7.4 Perform testing and optimization 