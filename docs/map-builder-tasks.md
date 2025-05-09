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

- [x] **Task 0.2**: Create API endpoint for UVTT import
  - Priority: High
  - Description: Implement an API endpoint that allows uploading and importing UVTT files (.uvtt, .dd2vtt, .df2vtt) to create maps in the system. The endpoint should extract all map data and convert the base64 image to an Asset.
  - Dependencies: 0.1

## Phase 1: Foundation Setup

- [x] **Task 1.1**: Set up workflow orchestration system
  - Priority: High
  - Description: Install and configure Prefect for workflow orchestration, create the necessary project structure, and establish communication channels.
  - Dependencies: None
  - Notes: Consolidates former tasks 2.1 and 5.1
  - Status: Completed - Created an ai-workflows Python project with Prefect configuration, flow definitions for map generation and feature detection, Docker Compose setup, and necessary utility scripts.

- [x] **Task 1.2**: Implement workflow session management
  - Priority: High
  - Description: Create a system to generate and track session IDs for workflows and manage security tokens for callbacks.
  - Dependencies: 1.1
  - Notes: Moved from previous Phase 5 as it's foundational
  - Status: WONTFIX - Determined that formal session management is unnecessary. Will use a simplified approach: pass userId directly to Prefect flows and include it in callbacks to route socket messages. Prefect server will be internal with no authentication, using an admin API key for callbacks to Express.

- [ ] **Task 1.3**: Build REST callback endpoints
  - Priority: High 
  - Description: Create Express API endpoints for Prefect flows to report progress and results.
  - Dependencies: ~~1.2~~ 1.1
  - Notes: Moved from previous Phase 5 as it's foundational

- [x] **Task 1.4**: Implement Socket.io progress updates
  - Priority: High
  - Description: Create a system to relay progress updates from REST callbacks to clients via Socket.io.
  - Dependencies: 1.3
  - Status: Complete - implemented generic workflow progress tracking
  - Notes: Moved from previous Phase 5 and marked as completed

- [ ] **Task 1.5**: Create Prefect client integration
  - Priority: High
  - Description: Implement a service in Express to communicate with the Prefect API.
  - Dependencies: 1.1
  - Notes: Moved from previous Phase 5 as it's foundational

- [ ] **Task 1.6**: Set up Python environment
  - Priority: High
  - Description: Create a Python environment with necessary libraries (OpenAI, PyTorch, OpenCV, etc.).
  - Dependencies: 1.1
  - Notes: Moved from previous Phase 7 as it's a foundational setup step

## Phase 2: UI Implementation

- [x] **Task 2.1**: Create a Vue component for map description input
  - Priority: High
  - Description: Implement a responsive UI component that allows users to input natural language descriptions of desired maps. Include form controls for additional parameters like map size, style, and theme.
  - Dependencies: None
  
- [x] **Task 2.2**: Implement map generation progress tracker
  - Priority: Medium
  - Description: Create a UI component to display the map generation progress, showing steps completed and estimated time remaining.
  - Dependencies: 1.4
  - Status: Complete - implemented with the generic workflow progress system
  
- [ ] **Task 2.3**: Build map preview and results UI
  - Priority: Medium
  - Description: Implement the UI for displaying the generated map preview, allowing users to regenerate with changes or proceed to the editor.
  - Dependencies: 2.1, 2.2

## Phase 3: Map Generation Workflow

- [ ] **Task 3.1**: Create map generation Prefect flow
  - Priority: High
  - Description: Implement a Prefect flow that handles the map generation process, including calling OpenAI and storing results.
  - Dependencies: 1.5, 1.6
  - Notes: Consolidates former tasks from Phases 2 and 6

- [ ] **Task 3.2**: Implement OpenAI image generation integration
  - Priority: High
  - Description: Create the integration with OpenAI's API to generate map images from textual descriptions.
  - Dependencies: 3.1
  - Notes: Refined from former task 2.2

- [ ] **Task 3.3**: Implement progress tracking and result storage
  - Priority: Medium
  - Description: Implement mechanisms for tracking workflow progress and storing results in MongoDB and file storage.
  - Dependencies: 1.4, 3.1
  - Notes: Consolidated from former tasks 2.3 and 6.2

- [ ] **Task 3.4**: Add error handling and retry logic
  - Priority: High
  - Description: Implement robust error handling and automatic retries in the Prefect flow.
  - Dependencies: 3.1
  - Notes: Moved from former task 6.3

## Phase 4: Feature Detection Pipeline

- [ ] **Task 4.1**: Create feature detection Prefect flow
  - Priority: High
  - Description: Create a Prefect flow that handles the complete feature detection process.
  - Dependencies: 1.5, 1.6
  - Notes: Consolidates former tasks from Phases 3 and 7

- [ ] **Task 4.2**: Implement wall detection
  - Priority: High
  - Description: Implement computer vision algorithms to detect walls and barriers in the generated map image.
  - Dependencies: 4.1
  - Notes: Consolidated from former tasks 3.1 and 7.3

- [ ] **Task 4.3**: Implement room and area detection
  - Priority: Medium
  - Description: Add functionality to identify distinct rooms, areas, and spaces within the map.
  - Dependencies: 4.2
  - Notes: Moved from former task 3.2

- [ ] **Task 4.4**: Add door and opening detection
  - Priority: Medium
  - Description: Implement algorithms to detect doors, windows, and other openings in the map.
  - Dependencies: 4.2
  - Notes: Consolidated from former tasks 3.3 and 7.4

- [ ] **Task 4.5**: Create light source detection
  - Priority: Medium
  - Description: Implement a Prefect task to detect light sources based on brightness analysis.
  - Dependencies: 4.1
  - Notes: Moved from former task 7.5

- [ ] **Task 4.6**: Implement UVTT conversion
  - Priority: High
  - Description: Create a Prefect task to convert detected features into UVTT format.
  - Dependencies: 4.2, 4.3, 4.4, 4.5, 0.1
  - Notes: Consolidated from former tasks 4.1 and 7.6

- [ ] **Task 4.7**: Add database storage task
  - Priority: High
  - Description: Implement a Prefect task to store the complete map data in MongoDB.
  - Dependencies: 4.6
  - Notes: Moved from former task 7.7

## Phase 5: Interactive Editor

- [ ] **Task 5.1**: Implement map editing handoff
  - Priority: Medium
  - Description: Create the functionality to transfer the generated map to the map editor for further refinement.
  - Dependencies: 4.7
  - Notes: Moved from former task 4.2

- [ ] **Task 5.2**: Build canvas-based map editor
  - Priority: High
  - Description: Implement a Vue.js canvas-based editor using libraries like Fabric.js or Konva.js.
  - Dependencies: 5.1
  - Notes: Moved from former task 8.1

- [ ] **Task 5.3**: Implement wall editing tools
  - Priority: High
  - Description: Create tools for drawing, modifying, and deleting wall segments.
  - Dependencies: 5.2
  - Notes: Moved from former task 8.2

- [ ] **Task 5.4**: Create portal/door tools
  - Priority: Medium
  - Description: Implement tools for placing and configuring doors and portals.
  - Dependencies: 5.2
  - Notes: Moved from former task 8.3

- [ ] **Task 5.5**: Add light editing capabilities
  - Priority: Medium
  - Description: Build tools for adding and adjusting light properties.
  - Dependencies: 5.2
  - Notes: Moved from former task 8.4

- [ ] **Task 5.6**: Develop real-time UVTT conversion
  - Priority: High
  - Description: Implement a service that converts editor state to UVTT format in real-time.
  - Dependencies: 5.2, 5.3, 5.4, 5.5, 0.1
  - Notes: Moved from former task 8.5

## Phase 6: Integration and Enhancements

- [ ] **Task 6.1**: Create Docker Compose setup
  - Priority: High
  - Description: Set up Docker Compose configuration for the complete system (Express, Prefect, Redis, etc.).
  - Dependencies: 1.1, 1.6
  - Notes: Moved from former task 9.1

- [ ] **Task 6.2**: Implement workflow triggers from Express
  - Priority: High
  - Description: Create Express API routes to trigger Prefect workflows based on user actions.
  - Dependencies: 1.5, 3.1, 4.1
  - Notes: Moved from former task 9.2

- [ ] **Task 6.3**: Build end-to-end integration
  - Priority: High
  - Description: Connect all components into a complete workflow from user description to final UVTT export.
  - Dependencies: 3.3, 4.7, 5.6
  - Notes: Moved from former task 9.3

- [ ] **Task 6.4**: Implement enhanced error handling and fallbacks
  - Priority: High
  - Description: Add comprehensive error tracking, reporting, and automatic retry capabilities for all workflow operations.
  - Dependencies: 6.3
  - Notes: Consolidates former tasks 4.3, 9.4, and 10.5

- [ ] **Task 6.5**: Add targeted workflow event notifications
  - Priority: Medium
  - Description: Update the workflow progress system to send targeted notifications to specific users instead of broadcasting to all users.
  - Dependencies: 1.4
  - Notes: Moved from former task 10.2

- [ ] **Task 6.6**: Add workflow cancellation support
  - Priority: Medium
  - Description: Create functionality for cancelling in-progress workflows in both the Express server and Prefect.
  - Dependencies: 1.2, 3.1, 4.1
  - Notes: Moved from former task 10.4

- [ ] **Task 6.7**: Create workflow history tracking
  - Priority: Low
  - Description: Implement a system for tracking historical workflows, allowing users to view past generation attempts and results.
  - Dependencies: 1.2
  - Notes: Moved from former task 10.3

- [ ] **Task 6.8**: Add UX enhancements
  - Priority: Medium
  - Description: Implement user experience improvements, loading indicators, and feedback mechanisms.
  - Dependencies: 6.3
  - Notes: Moved from former task 9.5

- [ ] **Task 6.9**: Perform testing and optimization
  - Priority: High
  - Description: Conduct end-to-end testing and optimize performance.
  - Dependencies: 6.4, 6.8
  - Notes: Moved from former task 9.6
