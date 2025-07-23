# Code Standards and Conventions

This document defines the coding standards, conventions, and patterns used in the Dungeon Lab VTT project.

## TypeScript Standards

### File Extensions and Imports
- **TypeScript Files**: Use `.mts` extension for all TypeScript files
- **Import Statements**: Reference `.mjs` files in imports (NOT `.mts`)
- **Example**:
  ```typescript
  // ✅ Correct
  import { UserService } from './user.service.mjs'
  
  // ❌ Incorrect
  import { UserService } from './user.service.mts'
  ```

### Module System
- **ESM Only**: Use ESM syntax exclusively, never CommonJS
- **Exports**: Prefer named exports over default exports
- **Example**:
  ```typescript
  // ✅ Correct
  export { UserController }
  export const createUser = () => {}
  
  // ❌ Incorrect
  module.exports = UserController
  ```

### Type Safety
- **Strict Typing**: Avoid `any` types, prefer specific types or `unknown`
- **Interfaces over Types**: Use interfaces for extensibility
- **No Enums**: Use maps instead for better type safety
- **Example**:
  ```typescript
  // ✅ Correct
  interface User {
    id: string
    name: string
  }
  
  const UserRole = {
    ADMIN: 'admin',
    PLAYER: 'player'
  } as const
  
  // ❌ Incorrect
  type User = {
    id: any
    name: string
  }
  
  enum UserRole {
    ADMIN = 'admin',
    PLAYER = 'player'
  }
  ```

## Vue.js Standards

### Component Structure
- **Composition API**: Always use Composition API with script setup
- **Example**:
  ```vue
  <script setup lang="ts">
  import { ref, computed } from 'vue'
  
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)
  </script>
  ```

### Styling
- **Tailwind CSS**: Use Tailwind for all styling
- **Mobile-First**: Implement responsive design with mobile-first approach
- **No Inline Styles**: Avoid inline styles, use Tailwind classes

### Reactivity
- **VueUse**: Leverage VueUse functions for enhanced reactivity
- **Ref vs Reactive**: Prefer `ref()` for primitives, `reactive()` for objects

## File and Directory Naming

### Directory Structure
- **Lowercase with Dashes**: Use lowercase with dashes for directories
- **Examples**: `auth-wizard`, `user-management`, `game-sessions`

### File Naming
- **Descriptive Names**: Use clear, descriptive file names
- **Avoid Temporary Names**: Never use "temp", "refactored", "improved" in permanent files
- **Consistent Patterns**: Follow established naming patterns in each package

### Component Organization
- **Feature-Based**: Group related components by feature
- **Pages**: Router-connected pages in `src/views/`
- **Components**: Reusable components in `src/components/`

## Authentication Patterns

### Critical Authentication Rules
- **NEVER MODIFY AUTH CODE**: Authentication code is off-limits without explicit permission
- **Session-Based Only**: Always use session-based authentication
- **Check Pattern**: Always check `req.session.user` for authentication
- **Middleware**: Use existing auth middleware from `auth.middleware.mts`

### Authentication Example
```typescript
// ✅ Correct - Use existing middleware
import { requireAuth } from '../middleware/auth.middleware.mjs'

router.get('/protected', requireAuth, (req, res) => {
  const user = req.session.user // User guaranteed to exist
  // ... handle request
})

// ❌ Incorrect - Don't implement custom auth
```

## API and Server Patterns

### Route Organization
- **API Prefix**: All API routes start with `/api`
- **Feature-Based**: Organize routes in `src/features/` by domain
- **OpenAPI**: Document all routes using OpenAPI methods from `oapi.mts`

### Example Route Structure
```typescript
// ✅ Correct
router.get('/api/campaigns/:id', openApiGet({
  summary: 'Get campaign by ID',
  // ... OpenAPI spec
}), getCampaign)

// ❌ Incorrect - Missing /api prefix or OpenAPI docs
```

### Server Architecture
- **Express Framework**: Use Express for HTTP server
- **Socket.io Only**: Use Socket.io exclusively for WebSocket communication
- **Session Storage**: Sessions stored in MongoDB
- **Auto-restart**: Server restarts automatically with tsx --watch

## WebSocket Patterns

### Event Naming
- **Namespaced Events**: Use namespace:action pattern
- **Examples**:
  - `encounter:join`
  - `token:move`
  - `chat:message`
  - `encounter:roll-initiative`

### Socket.io Usage
```typescript
// ✅ Correct - Socket.io only
import { io } from 'socket.io-client'

socket.emit('encounter:join', { encounterId })

// ❌ Incorrect - Don't use raw WebSocket
```

## Database Patterns

### MongoDB with Mongoose
- **Model Organization**: Models in feature directories
- **ID Handling**: Never expose `_id` to client, use `id` string
- **Session Management**: Store sessions in MongoDB

### Example Model Pattern
```typescript
// ✅ Correct
export interface UserData {
  id: string // Client-facing ID
  name: string
  email: string
}

// In server model, _id maps to id
```

## Plugin Architecture Standards

### Plugin Isolation
- **No Direct Dependencies**: Plugins cannot depend on main web/server packages
- **Interface Communication**: Communicate only through defined interfaces
- **Base Classes**: Extend base classes from shared package

### Plugin Structure
```
packages/plugins/plugin-name/
  ├── web/          # Client-side plugin code
  ├── server/       # Server-side plugin code
  └── shared/       # Shared plugin code
```

### Plugin Development
- **Auto-build**: Plugins build automatically before server starts
- **Manual Build**: Use `npm run plugins:build` when needed
- **Testing**: Use `npm run plugins:test` for plugin-specific tests

## Import and Dependency Rules

### Package Dependencies
- **Strict Rules**: Follow dependency hierarchy strictly
  - `web` → `shared`
  - `server` → `shared`
  - `plugin/web` → `shared`, `plugin/shared`
  - `plugin/server` → `shared`, `plugin/shared`

### Import Best Practices
- **No Dist Imports**: Never import from dist directories
- **Relative Imports**: Use relative imports within packages
- **Absolute Imports**: Use absolute imports for cross-package references

## Code Quality Standards

### Linting and Formatting
- **ESLint**: All code must pass ESLint rules
- **Prettier**: Use Prettier for consistent formatting
- **TypeScript**: All code must pass TypeScript compilation

### Documentation
- **JSDoc**: Document complex logic and public APIs
- **Inline Comments**: Explain non-obvious business logic
- **Architecture Docs**: Update docs when making architectural changes

### Performance Considerations
- **Bundle Optimization**: Use dynamic imports for non-critical components
- **Image Optimization**: Use WebP format with lazy loading
- **Code Splitting**: Implement chunking strategy in Vite build

## Error Handling

### Client-Side
- **Error Boundaries**: Use Vue error handling for component errors
- **API Errors**: Handle API errors gracefully with user feedback
- **Network Errors**: Handle network connectivity issues

### Server-Side
- **Express Error Middleware**: Use centralized error handling
- **Logging**: Log errors with appropriate detail level
- **Client Communication**: Return appropriate HTTP status codes

## Security Patterns

### Input Validation
- **Server Validation**: Always validate on server side
- **Client Validation**: Add client validation for UX
- **Sanitization**: Sanitize user inputs appropriately

### Session Security
- **Secure Cookies**: Use secure session configuration
- **CSRF Protection**: Implement CSRF protection where needed
- **Rate Limiting**: Apply rate limiting to sensitive endpoints

This comprehensive coding standard ensures consistency, maintainability, and security across the entire Dungeon Lab VTT codebase.