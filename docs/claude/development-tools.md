# Development Tools & MCP Integration

This document outlines the development tools, MCP servers, and integrations available when working with the Dungeon Lab VTT project.

## MCP Server Integration

### Available MCP Servers

#### Memento MCP (Knowledge Graph)
- **Purpose**: Persistent memory for architectural patterns and project knowledge
- **Usage**: Store important insights, patterns, and domain knowledge between sessions
- **Key Functions**:
  - `mcp__memento__create_entities`: Store architectural concepts
  - `mcp__memento__create_relations`: Link related concepts
  - `mcp__memento__semantic_search`: Find relevant stored knowledge
  - `mcp__memento__read_graph`: Review all stored knowledge

#### Playwright MCP (Web Testing)
- **Purpose**: Browser automation and web testing
- **Usage**: Test web functionality, take screenshots, analyze browser behavior
- **Key Functions**:
  - `mcp__playwright__browser_navigate`: Navigate to pages
  - `mcp__playwright__browser_screenshot`: Capture page state
  - `mcp__playwright__browser_click`: Interact with elements
  - `mcp__playwright__browser_evaluate`: Execute JavaScript in browser

#### MongoDB MCP (Database Operations)
- **Purpose**: Database examination and data operations
- **Usage**: Query data, analyze database state, troubleshoot data issues
- **Key Functions**:
  - `mcp__mongodb__query`: Execute database queries
  - `mcp__mongodb__aggregate`: Run aggregation pipelines
  - `mcp__mongodb__update`: Modify database records
  - `mcp__mongodb__serverInfo`: Get database server information

#### Git MCP (Version Control)
- **Purpose**: Git operations and repository management
- **Usage**: Check status, create branches, commit changes
- **Key Functions**:
  - `mcp__git__git_status`: Check repository status
  - `mcp__git__git_diff`: View changes
  - `mcp__git__git_commit`: Create commits
  - `mcp__git__git_branch`: Manage branches

## Development Environment

### Login Credentials
- **Admin User**: `admin@dungeonlab.com`
- **Password**: `password`
- **Usage**: Most features require authentication for testing

### Development Servers
- **Web Dev Server**: `npm run dev:web` (Vite with hot reload)
- **Server Dev Server**: `npm run dev:server` (tsx with --watch)
- **Full Dev**: `npm run dev` (both web and server)
- **Note**: Servers restart automatically on changes

### Browser Testing
- **Default URL**: `http://localhost:5173` (web client)
- **API Base**: `http://localhost:3000/api` (server API)
- **OpenAPI Docs**: `http://localhost:3000/swaggerui`
- **OpenAPI Schema**: `http://localhost:3000/openapi.json`

## Testing Tools

### Playwright Integration
- **Web Testing**: Use Playwright MCP for browser automation
- **E2E Tests**: `npm run test:e2e` for Playwright end-to-end tests
- **Interactive Mode**: `npm run test:e2e:ui` for debugging tests

### Database Testing
- **Test Database**: Uses MongoMemoryServer for isolation
- **Database Queries**: Use MongoDB MCP for examining test data
- **Test Helpers**: Available in `packages/server/tests/utils/`

### Unit Testing
- **Framework**: Vitest (NOT Jest)
- **Run Tests**: `npm run test`
- **Test Location**: Tests alongside source files or in `tests/` directories

## Code Quality Tools

### Linting and Formatting
- **ESLint**: `npm run lint` (check) / `npm run lint:fix` (auto-fix)
- **Prettier**: `npm run format`
- **TypeScript**: `npm run check` / `npm run typecheck:watch`

### Pre-commit Validation
- Always run `npm run check` before committing
- Ensure all tests pass with `npm run test`
- Use `npm run lint:fix` to auto-fix linting issues

## IDE Integration

### VS Code / Cursor Integration
- **TypeScript**: Full support with `.mts` files
- **Vue**: Vue Language Features extension required
- **Debugging**: Use browser dev tools for client, VS Code for server
- **IntelliSense**: Configured for workspace structure

### Available IDE Tools
- **Diagnostics**: `mcp__ide__getDiagnostics` for TypeScript errors
- **Code Execution**: `mcp__ide__executeCode` for Python/Jupyter contexts

## Asset Management

### File Storage
- **Development**: Local file system in `packages/server/uploads/`
- **Production**: MinIO S3-compatible storage
- **Testing**: Temporary files in test directories

### Image Processing
- **Library**: Sharp for image manipulation
- **Formats**: WebP preferred, fallback to PNG/JPEG
- **Optimization**: Automatic resizing and compression

## WebSocket Testing

### Socket.io Testing
- **Client**: Use browser dev tools Network tab for WebSocket inspection
- **Server**: Monitor console output for socket events
- **Events**: Follow namespaced pattern (e.g., `encounter:join`, `token:move`)

### Real-time Features
- **Token Movement**: `token:move` events
- **Chat Messages**: `chat:message` events
- **Encounter Management**: `encounter:*` events
- **Initiative Tracking**: `encounter:roll-initiative` events

## Plugin Development

### Plugin Build System
- **Auto-build**: Plugins build automatically before server starts
- **Manual Build**: `npm run plugins:build`
- **Dev Mode**: `npm run plugins:dev` for development
- **Testing**: `npm run plugins:test`

### Plugin Structure
- **Web Plugin**: `packages/plugins/*/web/`
- **Server Plugin**: `packages/plugins/*/server/`
- **Shared Code**: `packages/plugins/*/shared/`

## Debugging and Troubleshooting

### Console Monitoring
- **Browser Console**: Check for client-side errors and warnings
- **Server Console**: Monitor API requests and WebSocket events
- **Network Tab**: Inspect API calls and WebSocket messages

### Common Debug Patterns
- Add `console.log` statements for complex issues
- Use browser dev tools for client-side debugging
- Check MongoDB data with MongoDB MCP tools
- Use Playwright MCP for UI state inspection

### Performance Monitoring
- **Web Vitals**: Monitor in browser dev tools
- **API Response Times**: Check server logs
- **Database Queries**: Use MongoDB explain queries
- **Bundle Size**: Analyze with Vite build reports

## Environment Configuration

### Required Environment Variables
- **MONGODB_URI**: Database connection string
- **SESSION_SECRET**: Session encryption key
- **NODE_ENV**: Environment mode (development/production)

### Optional Configuration
- **MINIO_***: Object storage configuration
- **DEBUG**: Enable debug logging
- **PORT**: Override default port (3000)

This tooling ecosystem provides comprehensive support for developing, testing, and debugging the Dungeon Lab VTT application across all its components.