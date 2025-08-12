# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## General Instructions

I prefer brutal honesty over and realistic takes instead of being lead on paths of maybes or "it can work".

## ⚠️ CRITICAL DEVELOPMENT RULES ⚠️

### **NEVER RESTART THE DEV SERVER**
- The dev server is already running (UI on port 8080, API on port 3000)
- **NEVER** run `npm run dev` or any server restart commands
- The server restarts automatically when code changes - no manual intervention needed
- Restarting wastes time and disrupts the development workflow

### **CORRECT PORTS FOR TESTING**
- **UI/Frontend**: Always use `http://localhost:8080` for Playwright testing
- **API/Backend**: Runs on `http://localhost:3000` (for API calls only, not UI testing)

### **USE MCP PLAYWRIGHT SERVER - NOT LOCAL PLAYWRIGHT**
- There is a Playwright MCP server available for browser automation
- **NEVER** run `npx playwright install` or try to install Playwright locally
- **ALWAYS** use the MCP Playwright server tools for browser testing:
  - `mcp__playwright__browser_navigate` 
  - `mcp__playwright__browser_click`
  - `mcp__playwright__browser_screenshot`
  - `mcp__playwright__browser_snapshot`
  - etc.
- The MCP server handles all browser automation needs

### **DO NOT WRITE CODE FOR BACKWARD COMPATABILITY** 
- This is a greenfield project
- It is not deployed to production
- We can re-initialize the database from scratch
- Do not write migrations for existing data unless I ask you to
- Do not leave behind legacy code
- Do not add code for backward compatability
- If you see legacy code while you're reading the source, let me know and suggest removing it.

## Project Overview

Dungeon Lab is a Virtual Table Top (VTT) system for Table Top Role Playing Games (TTRPGs) with an extensible plugin architecture to support multiple game systems. The project is built as a modern web application with real-time collaboration features.

## Detailed Documentation

For comprehensive guidance on working with this project, see the detailed documentation in `docs/claude/`:

- **[AI Behavior Guidelines](docs/claude/ai-behavior.md)** - How Claude Code should behave, task management, and workflow patterns
- **[Development Tools](docs/claude/development-tools.md)** - MCP integration, testing tools, and development environment
- **[Code Standards](docs/claude/code-standards.md)** - TypeScript, Vue.js, and project-specific coding conventions
- **[Testing Strategy](docs/claude/testing.md)** - Testing frameworks, patterns, and best practices
- **[Architecture Guidelines](docs/claude/architecture.md)** - System architecture, plugin design, and communication patterns  
- **[Domain Knowledge](docs/claude/domain-knowledge.md)** - VTT and TTRPG concepts, terminology, and context

## Development Commands

### Core Development
- `npm run dev` - Start both web and server in development mode
- `npm run dev:web` - Start only the web frontend
- `npm run dev:server` - Start only the server backend

### Building & Testing
- `npm run build` - Build all packages for production
- `npm run build:shared` - Build only the shared package
- `npm run build:server` - Build only the server package
- `npm run build:web` - Build only the web package
- `npm run test` - Run tests across all workspaces
- `npm run test:e2e` - Run Playwright end-to-end tests
- `npm run test:e2e:ui` - Run E2E tests in UI mode

### Code Quality
- `npm run lint` - Run ESLint across all workspaces
- `npm run lint:fix` - Fix linting issues automatically
- `npm run format` - Format code with Prettier
- `npm run check` - Run TypeScript type checking
- `npm run typecheck:watch` - Run TypeScript checking in watch mode

### Plugin Development
- `npm run plugins:build` - Build all plugins
- `npm run plugins:dev` - Start plugins in development mode
- `npm run plugins:test` - Test plugin builds

## Architecture Overview

### Package Structure
The project uses npm workspaces with the following packages:

- **`packages/web`** - Vue.js frontend application (SPA)
- **`packages/server`** - Express.js backend with REST and WebSocket APIs
- **`packages/client`** - API client library for server communication
- **`packages/shared`** - Shared types, utilities, and base classes
- **`packages/plugins/`** - Game system plugins (currently D&D 5e 2024)

### Plugin Architecture
Plugins are the core extensibility mechanism, allowing different TTRPG systems to be implemented:

- Each plugin has `web/`, `server/`, and `shared/` subdirectories
- Plugins extend base classes from the shared package
- Main app communicates with plugins only through defined interfaces
- Plugins cannot directly depend on main web/server packages

### Communication Architecture
The system uses a hybrid approach:

- **REST API** - Resource-oriented operations (CRUD, auth, file uploads)
- **WebSockets** - Real-time features (token movement, dice rolls, chat)
- Service abstractions encapsulate protocol details from client code


## **IMPORTANT:  Game Master authoratative**
- During a game, all state changes are made by the GM client sending a gameState:update message.  
- PLAYERS ARE NOT ALLOWED TO DIRECTLY MAKE STATE CHANGES
- PLAYERS AND GMS both send requests to change the state with a gameAction:request message
- The GM Client receives that message, validates it, optionally asks the GM for manual approval depending on the request, and sends the STATE change.
- The GM CLIENT also makes state change requests in the SAME WAY.  The GM CLIENT sends gameAction:request like any other client.  The GM Client doesn't bypass the request system and make state changes without receiving a request first.  This avoids needless conditional logic and potential inconsistencies.
- In short, the GM Client asks as both a client (the GM plays as NPCs and potentially other characters, so it acts like any other client), and as a sort of server, the processes all requests to change the state via gameState:request, and sends state changes via gameState:update.  When acting as a client, the GM client must go through the same process as any other player client, it sends a gameAction:request to request state changes.  It just so happens that for the GM, the request comes back to themselves where the client code validates it and applies the state change.  This keeps the flow consistent and allows us to avoid inconsistencies in implementation.  The GM client should NEVER bypass the request system and make state changes directly.  No conditional logic to bypass the normal flow when the GM is acting as both client and server. 


## Technology Stack

### Frontend (packages/web)
- Vue 3 with Composition API (script setup style)
- TypeScript with ESM modules (.mts files)
- Tailwind CSS for styling
- Pinia for state management
- Vue Router for navigation
- Socket.io for real-time communication
- Vite for build tooling

### Backend (packages/server)
- Node.js with Express
- TypeScript with ESM modules (.mts files) 
- MongoDB with Mongoose
- Socket.io for WebSocket handling
- Passport for authentication (session-based)
- Sharp for image processing

### Testing & Quality
- Vitest for unit testing
- Playwright for E2E testing
- ESLint for code linting
- MongoMemoryServer for test databases
- Supertest for API integration tests

## Development Guidelines

### File Naming & Imports
- Use `.mts` extension for TypeScript files
- Import statements should reference `.mjs` files (not `.mts`)
- Use lowercase with dashes for directories (e.g., `auth-wizard`)
- **IMPORTANT**: When importing from workspace packages, always use the full filename (e.g., `@dungeon-lab/client/index.mjs` instead of `@dungeon-lab/client`)
- Don't use explicit any types.  Prefer a more specific type or unknown.

### Code Style
- All code must be TypeScript (no JavaScript)
- Use ESM syntax exclusively (not CommonJS)
- Prefer interfaces over types for extendability
- Avoid enums; use maps for better type safety
- Use strict typing; avoid `any`

### Vue Specific
- Always use Composition API with script setup
- Use VueUse functions for enhanced reactivity
- Implement mobile-first responsive design with Tailwind

### Authentication
- Session-based authentication only
- Check `req.session.user` for auth verification
- Use Socket.io exclusively for WebSocket communication

## Project Patterns

### WebSocket Events
Events follow namespaced patterns:
```
encounter:join - Join encounter room
token:move - Move token on map
encounter:roll-initiative - Roll initiative
chat:message - Send chat message
```

### API Structure
REST endpoints are resource-oriented:
```
GET /campaigns/:id - Retrieve campaign
POST /encounters - Create encounter
PUT /maps/:id - Replace map
DELETE /assets/:id - Delete asset
```

### Dependencies
Strict dependency rules are enforced:
- `web` → `shared`
- `server` → `shared` 
- `plugin/web` → `shared`, `plugin/shared`
- `plugin/server` → `shared`, `plugin/shared`
- Plugins cannot depend on main web/server packages

## Testing Strategy

### Server Tests
- Focus on integration tests with minimal mocking
- Use helper methods from `auth-test-helpers.mts`
- Run from `packages/server` directory
- Use `requestAs()` helper for authenticated requests

### API Testing
- **For quick API testing**: Use the authentication-enabled scripts in `scripts/` directory:
  - `./scripts/test-api-get /api/endpoint` - GET requests with auth
  - `./scripts/test-api-post /api/endpoint '{"data":"value"}'` - POST requests with auth
  - `./scripts/test-api GET /api/endpoint` - Generic method with auth
- **Requirements**: `API_AUTH_TOKEN` environment variable must be set
- **Examples**:
  ```bash
  ./scripts/test-api-get "/api/compendiums/entries?pluginId=dnd-5e-2024&documentType=vtt-document&pluginDocumentType=character-class"
  ./scripts/test-api-post "/api/compendiums" '{"name":"test","pluginId":"dnd-5e-2024"}'
  ```

### Web Tests
- Testing strategy is still being defined
- Currently no established patterns

## Quick Reference

### Essential Patterns
- **Task Management**: Use TodoWrite for multi-step tasks, create implementation plans in `docs/` for large features
- **Memory**: Store architectural insights in Memento MCP for persistence between sessions
- **Authentication**: Session-based only, never modify auth code without permission
- **File Extensions**: Use `.mts` for TypeScript files, import with `.mjs` extensions
- **Testing**: Vitest (not Jest), focus on integration tests, use auth helpers
- **Server Management**: NEVER restart the dev server - it's persistent and auto-reloads code changes

### Key Tools
- **Login**: admin@dungeonlab.com / password for testing
- **MongoDB MCP**: For database queries and examination
- **Playwright MCP**: For web testing and browser automation
- **Memento MCP**: For storing persistent architectural knowledge
- **API Testing**: Use `./scripts/test-api-get <endpoint>` and `./scripts/test-api-post <endpoint> <data>` for authenticated API testing (requires `API_AUTH_TOKEN` env var)

### Important Notes
- **NEVER manually restart the server** - it's always running and auto-reloads on code changes (nodemon)
- **NEVER run `npm run dev`** - the development server is persistent and restarting causes port conflicts
- Plugins build automatically before server starts
- Run `npm run check` for TypeScript validation before commits
- Follow mobile-first design principles
- Maintain strict plugin isolation and interface boundaries

For detailed information on any topic, refer to the comprehensive documentation in `docs/claude/`.