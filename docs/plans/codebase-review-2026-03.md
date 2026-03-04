# Comprehensive Code Review - Dungeon Lab

## Context

Full codebase review of Dungeon Lab VTT covering frontend (Vue 3), backend (Express/MongoDB), AI workflows (Prefect/LangChain), and data layer. The goal is to identify code quality issues, anti-patterns, and suggest improvements across the entire application.

---

## 1. BACKEND - High Priority Issues

### 1.1 Memory Leak in WebSocket Game Action Handler
**File:** `packages/server/src/websocket/handlers/game-action-handler.mts`
- `pendingCallbacks` Map accumulates entries without proper cleanup on client disconnect
- Only cleaned on 30s timeout, but if clients disconnect without responding, stale entries remain
- **Fix:** Add socket disconnect listener to clean up pending callbacks for that socket. Consider a WeakRef-based approach or periodic sweep.

### 1.2 Service Instantiation Per-Event
**Files:** Various WebSocket handlers
- New service instances created on every WebSocket event (e.g., `new GameStateService()` in handlers)
- **Fix:** Use singleton services or a simple DI container. Services are stateless, so singletons work fine.

### 1.3 File Uploads Stored Entirely in Memory
**File:** `packages/server/src/middleware/validation.middleware.mts`
- Multer uses memory storage with 100MB limit (500MB for ZIPs)
- Concurrent large uploads could OOM the server
- **Fix:** Switch to disk storage with streaming upload to MinIO. Use `multer.diskStorage()` with temp directory, then stream to object storage.

### 1.4 No API Rate Limiting
**File:** `packages/server/src/app.mts`
- No rate limiting on any endpoint - login, API key auth, file uploads all unprotected
- **Fix:** Add `express-rate-limit` middleware. Different tiers for auth endpoints (strict) vs API endpoints (moderate).

### 1.5 Mongoose `strict: false` Everywhere
**File:** `packages/server/src/models/zod-to-mongo.mts`
- All schemas created with `strict: false`, allowing arbitrary fields to bypass Zod validation
- Undermines the entire Zod validation layer
- **Fix:** Set `strict: true` (default) unless explicitly needed for plugin data. Use `Mixed` type for intentionally flexible fields.

### 1.6 Dual Error Handling Systems
**Files:** `packages/server/src/app.mts`, `packages/server/src/middleware/error.middleware.mts`
- `validationErrorHandler` in app.mts and `errorHandler` in middleware overlap
- Validation errors handled differently depending on which catches them first
- **Fix:** Consolidate into a single error handler middleware with custom error classes (e.g., `ValidationError`, `NotFoundError`, `AuthError`).

### 1.7 Inconsistent API Response Format
**Various controller files**
- `success`/`data`/`error` format used inconsistently
- No standard pagination, some endpoints omit fields, null vs undefined inconsistency
- **Fix:** Create a response helper utility: `sendSuccess(res, data, status)`, `sendError(res, message, status, details)`. Add pagination envelope for list endpoints.

### 1.8 Socket.IO Admin UI Exposed Without Auth
**File:** `packages/server/src/websocket/socket-server.mts`
- Admin UI at `admin.socket.io` with `auth: false` in dev
- **Fix:** Disable in production, add auth in development.

---

## 2. FRONTEND - High Priority Issues

### 2.1 Monolithic Game State Store (877 LOC)
**File:** `packages/web/src/stores/game-state.store.mts`
- Single store manages characters, actors, items, encounters, socket listeners, update queuing
- Hard to test, hard to reason about, high coupling
- **Fix:** Split into focused stores: `encounter.store.mts`, `document-collection.store.mts`, `state-sync.store.mts`. Use store composition where they need to interact.

### 2.2 Magic Strings for Socket Events
**Various files across stores and composables**
- Socket event names like `'gameState:update'`, `'roll:request'`, `'gameAction:request'` scattered as string literals
- **Fix:** Create a constants file `packages/shared/src/constants/socket-events.mts` with all event names as typed constants. Both frontend and backend import from there.

### 2.3 HUD Store Complexity (553 LOC)
**File:** `packages/web/src/stores/hudStore.mts`
- Manages sidebar tabs, toolbar tools, floating windows all in one store
- **Fix:** Extract `floating-window.store.mts` and `toolbar.store.mts` as separate concerns.

### 2.4 Outdated Mobile Detection
**File:** `packages/web/src/composables/useDeviceAdaptation.mts`
- Uses `window.innerWidth < 768` and `'ontouchstart' in window`
- Doesn't handle viewport changes, tablets with keyboards, etc.
- **Fix:** Use `matchMedia` listeners for responsive breakpoints. Consider VueUse's `useMediaQuery` composable.

### 2.5 Plugin Type Coercion in main.mts
**File:** `packages/web/src/main.mts`
- Heavy `as unknown as { getContext?: ... }` casting for plugin interfaces
- Brittle runtime type checking
- **Fix:** Strengthen plugin interface contract in shared package. Add a `isValidPlugin()` type guard function.

### 2.6 Circular Store Dependencies
- `auth.store` imports `game-session.store` (logout sequence)
- `game-state.store` imports `socket.store`
- **Fix:** Use event-based decoupling. Auth store emits a `logout` event, other stores react independently via a lightweight event bus or Pinia plugin.

---

## 3. SHARED PACKAGE Issues

### 3.1 Zod Schema / TypeScript Type Duplication
**Dirs:** `packages/shared/src/types/` and `packages/shared/src/schemas/`
- Types defined separately from Zod schemas, creating maintenance burden
- **Fix:** Derive TypeScript types from Zod schemas using `z.infer<>`. Remove manually maintained type duplicates.

### 3.2 `z.any()` in Base API Response
**File:** `packages/shared/src/types/api/base.mts`
- Base response schema uses `z.any()` for data field, defeating type safety
- **Fix:** Make the base response generic and use `z.unknown()` as the default, with specific types per endpoint.

---

## 4. DATA LAYER Issues

### 4.1 No Transaction Wrappers
**Various service files**
- Multi-document operations (e.g., creating a campaign + game state + session) lack transaction safety
- `transaction.service.mts` exists but is underutilized
- **Fix:** Wrap multi-document writes in MongoDB transactions. Create a `withTransaction()` utility and use it consistently.

### 4.2 ObjectId Conversion Fragility
**File:** `packages/server/src/features/campaigns/models/game-session.model.mts`
- Manual string-to-ObjectId conversion in Mongoose setters with silent error swallowing
- **Fix:** Create a shared `toObjectId()` utility that throws on invalid input. Use Mongoose schema-level transform instead of manual setters.

### 4.3 No Caching Layer
- Every request hits MongoDB directly, no caching for compendium data, plugin configs, etc.
- **Fix:** Add a simple in-memory cache (e.g., `node-cache` or `lru-cache`) for read-heavy, rarely-changing data like compendium entries and plugin manifests. Start small.

### 4.4 No Database Indexes Defined in Code
- Mongoose schemas don't define indexes for frequently queried fields
- **Fix:** Add compound indexes for common query patterns (e.g., `{ pluginId: 1, documentType: 1 }` on compendium entries).

---

## 5. AI WORKFLOWS (Prefect / LangChain)

### 5.1 Separate Python Projects Without Shared Config
**Dirs:** `ai-workflows/`, `gm_assistant/`
- Two independent Python projects with overlapping concerns (both use MinIO, both use LLMs)
- No shared configuration, utilities, or types between them
- **Fix:** Consider a shared Python package for common utilities (MinIO client, config loading). Or consolidate into a single Python service.

### 5.2 GM Assistant Uses Ollama (Local LLM)
**File:** `gm_assistant/agent.py`
- Hardcoded to use Ollama for inference, limiting deployment flexibility
- **Fix:** Abstract LLM provider behind a config option (Ollama, OpenAI, Anthropic).

---

## 6. SECURITY Issues

### 6.1 No CSRF Protection
**File:** `packages/server/src/app.mts`
- Session-based auth without CSRF tokens
- **Fix:** Add `csurf` or `csrf-csrf` middleware for state-changing endpoints.

### 6.2 API Key Has No Expiration/Rotation
**File:** `packages/server/src/middleware/auth.middleware.mts`
- API keys never expire and can't be rotated
- **Fix:** Add `apiKeyCreatedAt` field and optional expiration. Add rotation endpoint.

### 6.3 OAuth Auto-Creates Users Without Email Verification
**File:** `packages/server/src/config/passport.mts`
- Google OAuth creates accounts automatically
- Also has commented-out code (lines 10-38) that should be cleaned up
- **Fix:** Given this is a greenfield project, this may be acceptable. But add email verification flow for non-OAuth registration.

---

## 7. CROSS-CUTTING Patterns to Improve

### 7.1 Create Custom Error Classes
```typescript
// packages/shared/src/errors/
export class AppError extends Error { statusCode: number; code: string; }
export class NotFoundError extends AppError { ... }
export class ValidationError extends AppError { ... }
export class AuthorizationError extends AppError { ... }
```
Use across both frontend and backend for consistent error handling.

### 7.2 Centralize Socket Event Constants
```typescript
// packages/shared/src/constants/socket-events.mts
export const SOCKET_EVENTS = {
  GAME_STATE_UPDATE: 'gameState:update',
  GAME_ACTION_REQUEST: 'gameAction:request',
  ROLL_REQUEST: 'roll:request',
  // ...
} as const;
```

### 7.3 Add a Response Utility
```typescript
// packages/server/src/utils/response.mts
export function sendSuccess<T>(res: Response, data: T, status = 200) { ... }
export function sendError(res: Response, message: string, status = 500) { ... }
export function sendPaginated<T>(res: Response, data: T[], total: number, page: number) { ... }
```

### 7.4 Adopt Repository Pattern for Data Access
- Abstract Mongoose queries behind repository classes
- Makes services testable without MongoDB
- Enables future caching layer insertion

---

## 8. Priority Summary

### Do First (High Impact, Moderate Effort)
1. Fix WebSocket memory leak (pendingCallbacks cleanup)
2. Add socket event constants (shared package)
3. Consolidate error handling (custom error classes + single handler)
4. Fix Mongoose `strict: false` to `strict: true`
5. Add rate limiting to auth endpoints

### Do Next (High Impact, Higher Effort)
6. Split game-state store into smaller stores
7. Standardize API response format with helper utilities
8. Switch file uploads to disk/streaming storage
9. Wrap multi-document operations in transactions
10. Derive types from Zod schemas (eliminate duplication)

### Do Later (Important but Lower Urgency)
11. Add caching for compendium/read-heavy data
12. Improve mobile detection
13. Singleton services / simple DI
14. Add database indexes
15. Consolidate Python AI projects

---

## Verification

After implementing changes:
1. Run `npm run check` for TypeScript validation
2. Run `npm run test` for unit tests
3. Run `npm run lint` for code quality
4. Test WebSocket flows manually via the running dev server (localhost:8080)
5. Test file uploads with various sizes
6. Verify error responses are consistent across endpoints
