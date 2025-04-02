# Scratchpad

## VTT System Project Plan

### Project Overview
Creating a Virtual Table Top (VTT) system for TTRPGs with:
- Frontend: Vue.js + TypeScript SPA
- Backend: Express + TypeScript
- Shared code workspace
- MongoDB for data storage
- Plugin system for different game systems (D&D 5e, Pathfinder, etc.)

### Project Structure
- Workspace setup with npm workspaces:
  - `packages/client` - Vue.js frontend
  - `packages/server` - Express backend
  - `packages/shared` - Shared code/types
  - `packages/plugins` - Game system plugins

### Tasks
[X] 1. Project Setup
  [X] 1.1. Initialize npm workspace structure
  [X] 1.2. Set up frontend with Vue 3, TypeScript, Vite
  [X] 1.3. Set up backend with Express, TypeScript
  [X] 1.4. Set up shared package
  [X] 1.5. Configure MongoDB connection

[X] 2. Core Data Models
  [X] 2.1. Define base Actor interface
  [X] 2.2. Define base Item interface
  [X] 2.3. Define Game System Plugin interface
  [X] 2.4. Create MongoDB schemas

[X] 3. Backend API Development
  [X] 3.1. Create Actor CRUD endpoints
  [X] 3.2. Create Item CRUD endpoints
  [X] 3.3. Create Game System Plugin management endpoints
  [X] 3.4. Implement authentication system

[ ] 4. Plugin System
  [X] 4.1. Design plugin architecture
  [X] 4.2. Create plugin loader
  [X] 4.3. Implement plugin registration system
  [ ] 4.4. Create sample D&D 5e plugin

[ ] 5. Frontend Development
  [X] 5.1. Set up Vue Router
  [X] 5.2. Set up Pinia store
  [X] 5.3. Create base UI components
  [X] 5.4. Implement dynamic UI for plugins
  [ ] 5.5. Create game table view
  [ ] 5.6. Create character sheet components

[ ] 6. Integration
  [X] 6.1. Connect frontend to backend API
  [X] 6.2. Implement plugin loading in frontend
  [ ] 6.3. Test end-to-end functionality

[ ] 7. Testing & Deployment
  [ ] 7.1. Write unit tests
  [ ] 7.2. Write integration tests
  [ ] 7.3. Set up deployment pipeline

## WebSocket API Implementation Plan

### Current Status
[X] 1. Message Schema Definition
  [X] 1.1. Base message schema with common fields
  [X] 1.2. Core message types (chat, dice roll, move)
  [X] 1.3. Plugin message types (plugin action, state updates)
  [X] 1.4. Type exports using Zod inference

[X] 2. Basic Handler Setup
  [X] 2.1. Socket types and authentication
  [X] 2.2. Basic message validation
  [X] 2.3. Session management
  [X] 2.4. Error handling structure

### Next Steps
[ ] 3. Game State Management
  [ ] 3.1. Define game state structure
  [ ] 3.2. Implement state update broadcasting
  [ ] 3.3. Add state persistence with MongoDB
  [ ] 3.4. Add state validation middleware

[ ] 4. Core Message Handlers Implementation
  [ ] 4.1. Chat Handler
    [ ] 4.1.1. Private messaging
    [ ] 4.1.2. Emote handling
    [ ] 4.1.3. Message history
  [ ] 4.2. Dice Roll Handler
    [ ] 4.2.1. Roll formula parsing
    [ ] 4.2.2. Secret roll handling
    [ ] 4.2.3. Roll history
  [ ] 4.3. Move Handler
    [ ] 4.3.1. Position validation
    [ ] 4.3.2. Collision detection
    [ ] 4.3.3. Movement animation state

[ ] 5. Combat System Implementation
  [ ] 5.1. Turn order management
  [ ] 5.2. Attack action resolution
    [ ] 5.2.1. Range checking
    [ ] 5.2.2. Attack roll calculation
    [ ] 5.2.3. Damage application
  [ ] 5.3. Spell system
    [ ] 5.3.1. Spell requirements validation
    [ ] 5.3.2. Area effect calculation
    [ ] 5.3.3. Spell effect application

[ ] 6. Plugin System Integration
  [ ] 6.1. Plugin registration mechanism
  [ ] 6.2. Plugin state management
  [ ] 6.3. Plugin message routing
  [ ] 6.4. Plugin lifecycle hooks

[ ] 7. Client-Side Implementation
  [ ] 7.1. Socket connection management
  [ ] 7.2. Message handlers
  [ ] 7.3. UI components for each message type
  [ ] 7.4. State synchronization

[ ] 8. Testing & Documentation
  [ ] 8.1. Unit tests for message handlers
  [ ] 8.2. Integration tests for game flow
  [ ] 8.3. WebSocket API documentation
  [ ] 8.4. Plugin development guide

### Current Focus
- Implementing core message handlers
- Setting up game state management
- Developing the combat system

### Notes
- Keep handlers modular and focused
- Maintain clear separation between core and plugin functionality
- Ensure proper error handling and validation at each step
- Consider performance implications of state updates
- Document all message types and their expected behavior

# Lessons

## User Specified Lessons

- Include info useful for debugging in the program output.
- Read the file before you try to edit it.
- Due to Cursor's limit, when you use `git` and `gh` and need to submit a multiline commit message, first write the message in a file, and then use `git commit -F <filename>` or similar command to commit. And then remove the file. Include "[Cursor] " in the commit message and PR title.

## Cursor learned

- For search results, ensure proper handling of different character encodings (UTF-8) for international queries
- Add debug information to stderr while keeping the main output clean in stdout for better pipeline integration
- Use 'gpt-4o' as the model name for OpenAI's GPT-4 with vision capabilities
